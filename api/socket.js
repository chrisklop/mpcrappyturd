import { Server } from 'socket.io';
import { kv } from '@vercel/kv';

let io;

// KV key helpers
const roomKey = (roomId) => `room:${roomId}`;
const statsKey = () => 'game:stats';
const playersKey = () => 'game:online_players';

export default async function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', async (socket) => {
      console.log('Player connected:', socket.id);
      
      // Track online players
      await kv.sadd(playersKey(), socket.id);

      // Join room handler
      socket.on('join-room', async (data) => {
        try {
          const { roomId, playerId, gamertag, color } = data;
          
          socket.join(roomId);
          socket.playerId = playerId;
          socket.roomId = roomId;

          // Get or create room in KV
          let room = await kv.get(roomKey(roomId));
          if (!room) {
            room = {
              id: roomId,
              players: [],
              status: 'waiting',
              createdAt: Date.now()
            };
          }

          // Add/update player
          const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
          const playerData = {
            id: playerId,
            gamertag,
            color,
            socketId: socket.id,
            ready: false,
            connected: true,
            score: 0,
            eliminated: false,
            joinedAt: Date.now()
          };

          if (existingPlayerIndex !== -1) {
            room.players[existingPlayerIndex] = { ...room.players[existingPlayerIndex], ...playerData };
          } else {
            room.players.push(playerData);
          }

          // Save room to KV
          await kv.set(roomKey(roomId), room, { ex: 1800 }); // 30 min expiry

          // Send room state
          socket.emit('room-state', room);
          socket.to(roomId).emit('player-joined', {
            playerId, gamertag, color, playerCount: room.players.length
          });

        } catch (error) {
          console.error('Join room error:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Player ready state
      socket.on('player-ready', async (data) => {
        try {
          const { roomId, playerId, ready } = data;
          const room = await kv.get(roomKey(roomId));
          
          if (room) {
            const player = room.players.find(p => p.id === playerId);
            if (player) {
              player.ready = ready;
              await kv.set(roomKey(roomId), room, { ex: 1800 });
              
              io.to(roomId).emit('player-ready-state', { playerId, ready });

              // Check if all players are ready
              const readyPlayers = room.players.filter(p => p.ready);
              if (room.players.length >= 1 && readyPlayers.length === room.players.length) {
                io.to(roomId).emit('game-starting', { countdown: 3 });
                setTimeout(() => {
                  room.status = 'playing';
                  kv.set(roomKey(roomId), room, { ex: 1800 });
                  io.to(roomId).emit('game-start');
                }, 3000);
              }
            }
          }
        } catch (error) {
          console.error('Player ready error:', error);
        }
      });

      // Player position updates
      socket.on('player-position', (data) => {
        const { roomId, playerId, x, y, velocity, timestamp } = data;
        
        // Basic validation
        if (x >= 0 && x <= 800 && y >= 0 && y <= 600) {
          socket.to(roomId).emit('player-update', {
            playerId, x, y, velocity, timestamp: Date.now()
          });
        }
      });

      // Player death
      socket.on('player-died', async (data) => {
        try {
          const { roomId, playerId, score } = data;
          const room = await kv.get(roomKey(roomId));
          
          if (room) {
            const player = room.players.find(p => p.id === playerId);
            if (player) {
              player.eliminated = true;
              player.finalScore = score;
              
              await kv.set(roomKey(roomId), room, { ex: 1800 });
              
              io.to(roomId).emit('player-eliminated', {
                playerId, score, timestamp: Date.now()
              });

              // Check for game over
              const alivePlayers = room.players.filter(p => !p.eliminated);
              if (alivePlayers.length <= 1) {
                const winner = alivePlayers[0];
                const finalScores = room.players
                  .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
                  .map((p, index) => ({
                    playerId: p.id,
                    gamertag: p.gamertag,
                    score: p.finalScore || 0,
                    placement: index + 1
                  }));

                io.to(roomId).emit('game-over', { winner, finalScores });
                
                // Update stats
                await updateGameStats(room, winner);
                
                // Clean up room after game
                setTimeout(() => kv.del(roomKey(roomId)), 60000);
              }
            }
          }
        } catch (error) {
          console.error('Player died error:', error);
        }
      });

      // Ping/Pong for latency
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect handler
      socket.on('disconnect', async () => {
        console.log('Player disconnected:', socket.id);
        
        // Remove from online players
        await kv.srem(playersKey(), socket.id);
        
        if (socket.roomId && socket.playerId) {
          try {
            const room = await kv.get(roomKey(socket.roomId));
            if (room) {
              room.players = room.players.filter(p => p.id !== socket.playerId);
              
              if (room.players.length === 0) {
                await kv.del(roomKey(socket.roomId));
              } else {
                await kv.set(roomKey(socket.roomId), room, { ex: 1800 });
              }
              
              socket.to(socket.roomId).emit('player-left', { playerId: socket.playerId });
            }
          } catch (error) {
            console.error('Disconnect cleanup error:', error);
          }
        }
      });
    });
  }

  res.end();
}

async function updateGameStats(room, winner) {
  try {
    const stats = await kv.get(statsKey()) || {
      totalGames: 0,
      totalPlayers: 0,
      topScores: []
    };
    
    stats.totalGames += 1;
    stats.totalPlayers += room.players.length;
    
    // Update top scores
    room.players.forEach(player => {
      if (player.finalScore > 0) {
        stats.topScores.push({
          player: player.gamertag,
          score: player.finalScore,
          timestamp: Date.now()
        });
      }
    });
    
    // Keep only top 10 scores
    stats.topScores = stats.topScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    await kv.set(statsKey(), stats);
  } catch (error) {
    console.error('Error updating game stats:', error);
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
}
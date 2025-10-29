import { Server } from 'socket.io';
import { get } from '@vercel/edge-config';

let io;
let rooms = new Map(); // In-memory storage for real-time data
let onlinePlayers = new Set();

export default async function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server, {
      path: '/api/edge-socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', async (socket) => {
      console.log('Player connected:', socket.id);
      
      // Track online players
      onlinePlayers.add(socket.id);

      // Join room handler
      socket.on('join-room', async (data) => {
        try {
          const { roomId, playerId, gamertag, color } = data;
          
          socket.join(roomId);
          socket.playerId = playerId;
          socket.roomId = roomId;

          // Get or create room
          let room = rooms.get(roomId);
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

          // Save room to memory
          rooms.set(roomId, room);

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
          const room = rooms.get(roomId);
          
          if (room) {
            const player = room.players.find(p => p.id === playerId);
            if (player) {
              player.ready = ready;
              rooms.set(roomId, room);
              
              io.to(roomId).emit('player-ready-state', { playerId, ready });

              // Check if all players are ready
              const readyPlayers = room.players.filter(p => p.ready);
              if (room.players.length >= 1 && readyPlayers.length === room.players.length) {
                io.to(roomId).emit('game-starting', { countdown: 3 });
                setTimeout(() => {
                  room.status = 'playing';
                  rooms.set(roomId, room);
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
          const room = rooms.get(roomId);
          
          if (room) {
            const player = room.players.find(p => p.id === playerId);
            if (player) {
              player.eliminated = true;
              player.finalScore = score;
              
              rooms.set(roomId, room);
              
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
                
                // Clean up room after game
                setTimeout(() => rooms.delete(roomId), 60000);
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
        onlinePlayers.delete(socket.id);
        
        if (socket.roomId && socket.playerId) {
          try {
            const room = rooms.get(socket.roomId);
            if (room) {
              room.players = room.players.filter(p => p.id !== socket.playerId);
              
              if (room.players.length === 0) {
                rooms.delete(socket.roomId);
              } else {
                rooms.set(socket.roomId, room);
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

// Helper to get current stats
export function getCurrentStats() {
  return {
    activeRooms: rooms.size,
    onlineCount: onlinePlayers.size,
    totalGames: Array.from(rooms.values()).filter(room => room.status === 'playing').length
  };
}

export const config = {
  api: {
    externalResolver: true,
  },
}
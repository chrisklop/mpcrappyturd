import { Server } from 'socket.io';

// Simple in-memory storage for Vercel (for demo purposes)
// In production, you'd want to use a persistent Redis instance
const rooms = new Map();
const players = new Map();

let io;

export default function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Player connected:', socket.id);

      // Join room handler
      socket.on('join-room', (data) => {
        const { roomId, playerId, gamertag, color } = data;
        
        socket.join(roomId);
        socket.playerId = playerId;
        socket.roomId = roomId;

        // Add player to room
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            id: roomId,
            players: [],
            status: 'waiting',
            createdAt: Date.now()
          });
        }

        const room = rooms.get(roomId);
        const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
        
        if (existingPlayerIndex !== -1) {
          room.players[existingPlayerIndex] = {
            ...room.players[existingPlayerIndex],
            gamertag, color, socketId: socket.id, connected: true
          };
        } else {
          room.players.push({
            id: playerId,
            gamertag,
            color,
            socketId: socket.id,
            ready: false,
            connected: true,
            score: 0,
            eliminated: false
          });
        }

        // Send room state
        socket.emit('room-state', room);
        socket.to(roomId).emit('player-joined', {
          playerId, gamertag, color, playerCount: room.players.length
        });
      });

      // Player ready state
      socket.on('player-ready', (data) => {
        const { roomId, playerId, ready } = data;
        const room = rooms.get(roomId);
        
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.ready = ready;
            io.to(roomId).emit('player-ready-state', { playerId, ready });

            // Check if all players are ready
            if (room.players.length >= 2 && room.players.every(p => p.ready)) {
              io.to(roomId).emit('game-starting', { countdown: 3 });
              setTimeout(() => {
                room.status = 'playing';
                io.to(roomId).emit('game-start');
              }, 3000);
            }
          }
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
      socket.on('player-died', (data) => {
        const { roomId, playerId, score } = data;
        const room = rooms.get(roomId);
        
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.eliminated = true;
            player.finalScore = score;
            
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
      });

      // Ping/Pong for latency
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (socket.roomId && socket.playerId) {
          const room = rooms.get(socket.roomId);
          if (room) {
            room.players = room.players.filter(p => p.id !== socket.playerId);
            socket.to(socket.roomId).emit('player-left', { playerId: socket.playerId });
            
            if (room.players.length === 0) {
              rooms.delete(socket.roomId);
            }
          }
        }
      });
    });
  }

  res.end();
}

// Handle CORS for preflight requests
export const config = {
  api: {
    externalResolver: true,
  },
}
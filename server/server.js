const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
const { v4: uuidv4 } = require('uuid');

const GameManager = require('./game-manager');
const RoomManager = require('./room-manager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Redis client setup
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.log('Redis Client Error', err));

app.use(cors());
app.use(express.json());

// Initialize managers
const gameManager = new GameManager(redis);
const roomManager = new RoomManager(redis);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/stats', async (req, res) => {
  try {
    const gameStats = await gameManager.getGlobalStats();
    const roomStats = await roomManager.getRoomStats();
    
    const combinedStats = {
      ...gameStats,
      ...roomStats,
      // Add some demo data for better UX
      totalGames: gameStats.totalGames + 42,
      onlineCount: roomStats.onlineCount + Math.floor(Math.random() * 5) + 3, // Add some fake activity
      activeRooms: Math.max(1, roomStats.activeRooms + Math.floor(Math.random() * 2))
    };
    
    res.json(combinedStats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.post('/api/join-queue', async (req, res) => {
  try {
    const { gamertag, color } = req.body;
    const playerId = uuidv4();
    const room = await roomManager.findOrCreateRoom(playerId, { gamertag, color });
    res.json({ playerId, roomId: room.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Join a game room
  socket.on('join-room', async (data) => {
    try {
      const { roomId, playerId, gamertag, color } = data;
      
      // Join the socket room
      socket.join(roomId);
      socket.playerId = playerId;
      socket.roomId = roomId;
      
      // Add player to game room
      const room = await roomManager.addPlayerToRoom(roomId, playerId, { gamertag, color, socketId: socket.id });
      
      if (room) {
        // Send room state to new player
        socket.emit('room-state', room);
        
        // Notify other players
        socket.to(roomId).emit('player-joined', {
          playerId,
          gamertag,
          color,
          playerCount: room.players.length
        });
        
        console.log(`Player ${gamertag} joined room ${roomId}`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Player ready state
  socket.on('player-ready', async (data) => {
    try {
      const { roomId, playerId, ready } = data;
      await roomManager.setPlayerReady(roomId, playerId, ready);
      
      const room = await roomManager.getRoom(roomId);
      io.to(roomId).emit('player-ready-state', { playerId, ready });
      
      // Check if all players are ready to start game
      if (room && room.players.every(p => p.ready)) {
        await gameManager.startGame(roomId, room.players);
        io.to(roomId).emit('game-starting', { countdown: 3 });
        
        // Start countdown
        setTimeout(() => io.to(roomId).emit('game-start'), 3000);
      }
    } catch (error) {
      console.error('Error setting player ready:', error);
    }
  });
  
  // Game position updates
  socket.on('player-position', async (data) => {
    try {
      const { roomId, playerId, x, y, velocity, timestamp } = data;
      
      // Validate position (basic anti-cheat)
      if (gameManager.validatePlayerPosition(roomId, playerId, { x, y, velocity, timestamp })) {
        // Broadcast to other players in room
        socket.to(roomId).emit('player-update', {
          playerId,
          x,
          y,
          velocity,
          timestamp: Date.now()
        });
        
        // Update server state
        await gameManager.updatePlayerPosition(roomId, playerId, { x, y, velocity, timestamp });
      }
    } catch (error) {
      console.error('Error updating player position:', error);
    }
  });
  
  // Player collision (death)
  socket.on('player-died', async (data) => {
    try {
      const { roomId, playerId, score, timestamp } = data;
      
      // Validate death event
      if (await gameManager.validatePlayerDeath(roomId, playerId, { score, timestamp })) {
        await gameManager.eliminatePlayer(roomId, playerId, score);
        
        // Notify all players
        io.to(roomId).emit('player-eliminated', {
          playerId,
          score,
          timestamp: Date.now()
        });
        
        // Check if game is over
        const remainingPlayers = await gameManager.getRemainingPlayers(roomId);
        if (remainingPlayers.length <= 1) {
          const winner = remainingPlayers[0];
          await gameManager.endGame(roomId, winner);
          io.to(roomId).emit('game-over', { winner, finalScores: await gameManager.getFinalScores(roomId) });
        }
      }
    } catch (error) {
      console.error('Error handling player death:', error);
    }
  });
  
  // Obstacle synchronization
  socket.on('request-obstacles', async (data) => {
    try {
      const { roomId } = data;
      const obstacles = await gameManager.getObstacles(roomId);
      socket.emit('obstacle-sync', { obstacles, timestamp: Date.now() });
    } catch (error) {
      console.error('Error syncing obstacles:', error);
    }
  });
  
  // Chat messages
  socket.on('chat-message', (data) => {
    const { roomId, playerId, message } = data;
    // Basic spam protection
    if (message && message.length <= 100) {
      io.to(roomId).emit('chat-message', {
        playerId,
        message: message.substring(0, 100),
        timestamp: Date.now()
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('Player disconnected:', socket.id);
    
    if (socket.roomId && socket.playerId) {
      try {
        await roomManager.removePlayerFromRoom(socket.roomId, socket.playerId);
        socket.to(socket.roomId).emit('player-left', { playerId: socket.playerId });
        
        // Check if room is empty and clean up
        const room = await roomManager.getRoom(socket.roomId);
        if (!room || room.players.length === 0) {
          await roomManager.deleteRoom(socket.roomId);
          await gameManager.endGame(socket.roomId);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await redis.connect();
    console.log('Connected to Redis');
    
    server.listen(PORT, () => {
      console.log(`Flappy Turd multiplayer server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redis.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
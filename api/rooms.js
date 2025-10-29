// Simple room-based multiplayer API for Vercel
let rooms = new Map();
let onlinePlayers = new Set();

// Clean up old rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > 300000) { // 5 minutes
      rooms.delete(roomId);
    }
  }
}, 60000); // Check every minute

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;
  const { action } = req.query;

  try {
    if (method === 'POST') {
      if (action === 'join') {
        const { playerId, gamertag, color } = req.body;
        
        // Find or create room
        let roomId = null;
        let room = null;
        
        // Look for a room with space
        for (const [id, r] of rooms.entries()) {
          if (r.players.length < 6 && r.status === 'waiting') {
            roomId = id;
            room = r;
            break;
          }
        }
        
        // Create new room if none available
        if (!room) {
          roomId = 'room_' + Date.now();
          room = {
            id: roomId,
            players: [],
            status: 'waiting',
            createdAt: Date.now(),
            lastActivity: Date.now()
          };
          rooms.set(roomId, room);
        }
        
        // Add player to room
        const existingIndex = room.players.findIndex(p => p.id === playerId);
        const playerData = {
          id: playerId,
          gamertag,
          color,
          ready: false,
          score: 0,
          eliminated: false,
          joinedAt: Date.now()
        };
        
        if (existingIndex !== -1) {
          room.players[existingIndex] = playerData;
        } else {
          room.players.push(playerData);
        }
        
        room.lastActivity = Date.now();
        
        res.status(200).json({ 
          roomId, 
          room,
          playerCount: room.players.length
        });
        return;
      }
      
      if (action === 'ready') {
        const { roomId, playerId, ready } = req.body;
        const room = rooms.get(roomId);
        
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.ready = ready;
            room.lastActivity = Date.now();
            
            // Check if all players are ready
            const allReady = room.players.every(p => p.ready);
            if (allReady && room.players.length >= 1) {
              room.status = 'starting';
              setTimeout(() => {
                const currentRoom = rooms.get(roomId);
                if (currentRoom) {
                  currentRoom.status = 'playing';
                }
              }, 3000);
            }
            
            res.status(200).json({ room, allReady });
            return;
          }
        }
        
        res.status(404).json({ error: 'Room or player not found' });
        return;
      }
      
      if (action === 'eliminate') {
        const { roomId, playerId, score } = req.body;
        const room = rooms.get(roomId);
        
        if (room) {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.eliminated = true;
            player.finalScore = score;
            room.lastActivity = Date.now();
            
            const alivePlayers = room.players.filter(p => !p.eliminated);
            const gameOver = alivePlayers.length <= 1;
            
            res.status(200).json({ 
              room, 
              gameOver,
              winner: gameOver ? alivePlayers[0] : null
            });
            return;
          }
        }
        
        res.status(404).json({ error: 'Room or player not found' });
        return;
      }
    }
    
    if (method === 'GET') {
      if (action === 'room') {
        const { roomId } = req.query;
        const room = rooms.get(roomId);
        
        if (room) {
          room.lastActivity = Date.now();
          res.status(200).json({ room });
        } else {
          res.status(404).json({ error: 'Room not found' });
        }
        return;
      }
      
      if (action === 'stats') {
        res.status(200).json({
          activeRooms: rooms.size,
          totalPlayers: Array.from(rooms.values()).reduce((sum, room) => sum + room.players.length, 0),
          onlineCount: Math.max(3, Array.from(rooms.values()).reduce((sum, room) => sum + room.players.length, 0) + Math.floor(Math.random() * 5))
        });
        return;
      }
    }
    
    res.status(400).json({ error: 'Invalid request' });
    
  } catch (error) {
    console.error('Room API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
import { v4 as uuidv4 } from 'uuid';

// Simple room management for Vercel deployment
// In production, you'd use a persistent database
const rooms = new Map();

function findOrCreateRoom() {
  // Look for existing rooms with space
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.length < 6 && room.status === 'waiting') {
      return roomId;
    }
  }
  
  // Create new room
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  rooms.set(roomId, {
    id: roomId,
    players: [],
    status: 'waiting',
    createdAt: Date.now()
  });
  
  return roomId;
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { gamertag, color } = req.body;
    
    if (!gamertag || gamertag.length > 10) {
      return res.status(400).json({ error: 'Invalid sewer handle' });
    }
    
    const playerId = uuidv4();
    const roomId = findOrCreateRoom();
    
    res.status(200).json({
      playerId,
      roomId,
      message: 'Successfully joined queue'
    });
    
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
}
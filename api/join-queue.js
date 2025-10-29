import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { gamertag, color } = req.body;
    
    if (!gamertag || gamertag.length > 10) {
      return res.status(400).json({ error: 'Invalid sewer handle' });
    }
    
    const playerId = uuidv4();
    const roomId = await findOrCreateRoom();
    
    res.status(200).json({
      playerId,
      roomId,
      message: 'Successfully joined sewer queue'
    });
    
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
}

async function findOrCreateRoom() {
  try {
    // Look for existing rooms with space
    const roomKeys = await kv.keys('room:*');
    
    for (const key of roomKeys) {
      const room = await kv.get(key);
      if (room && room.players.length < 6 && room.status === 'waiting') {
        return room.id;
      }
    }
    
    // Create new room
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = {
      id: roomId,
      players: [],
      status: 'waiting',
      createdAt: Date.now()
    };
    
    await kv.set(`room:${roomId}`, room, { ex: 1800 }); // 30 min expiry
    return roomId;
    
  } catch (error) {
    console.error('Error in findOrCreateRoom:', error);
    // Fallback: create unique room
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
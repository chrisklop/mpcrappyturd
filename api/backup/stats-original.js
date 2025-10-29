// Simple stats endpoint for Vercel deployment
export default function handler(req, res) {
  // In a real deployment, these would come from a database
  // For demo purposes, simulate some realistic online activity
  const now = Date.now();
  const minutesSinceHour = Math.floor((now % 3600000) / 60000);
  
  // Simulate online activity that varies throughout the hour
  const baseOnline = 8 + Math.floor(Math.sin(minutesSinceHour / 10) * 5);
  const activeRooms = Math.max(1, Math.floor(baseOnline / 3));
  
  const stats = {
    totalGames: 156 + Math.floor(now / 100000) % 50, // Slowly increasing
    activeRooms: activeRooms,
    totalPlayers: baseOnline + Math.floor(Math.random() * 3), // Some randomness
    onlineCount: baseOnline + Math.floor(Math.random() * 3),
    waitingPlayers: Math.max(0, Math.floor(Math.random() * 4)),
    topScores: [
      { player: 'PoopMaster', score: 1337 },
      { player: 'SewerKing', score: 999 },
      { player: 'TurdBird', score: 666 },
      { player: 'FlushGod', score: 420 },
      { player: 'PipeDreams', score: 360 }
    ],
    recentGames: [
      {
        roomId: 'room_123',
        gameTime: 45000,
        playerCount: 4,
        winner: { gamertag: 'PoopMaster' },
        timestamp: Date.now() - 3600000
      },
      {
        roomId: 'room_124',
        gameTime: 32000,
        playerCount: 3,
        winner: { gamertag: 'SewerKing' },
        timestamp: Date.now() - 7200000
      }
    ]
  };
  
  res.status(200).json(stats);
}
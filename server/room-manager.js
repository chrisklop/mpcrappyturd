class RoomManager {
  constructor(redis) {
    this.redis = redis;
    this.maxPlayersPerRoom = 6;
    this.roomTimeout = 300000; // 5 minutes
  }

  async findOrCreateRoom(playerId, playerData) {
    try {
      // Look for existing rooms with space
      const availableRooms = await this.getAvailableRooms();
      
      for (const roomId of availableRooms) {
        const room = await this.getRoom(roomId);
        if (room && room.players.length < this.maxPlayersPerRoom && room.status === 'waiting') {
          return room;
        }
      }
      
      // Create new room if none available
      return await this.createRoom(playerId, playerData);
    } catch (error) {
      console.error('Error finding/creating room:', error);
      throw error;
    }
  }

  async createRoom(hostPlayerId, hostData) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const room = {
      id: roomId,
      hostId: hostPlayerId,
      players: [],
      status: 'waiting', // waiting, playing, finished
      createdAt: Date.now(),
      gameStartedAt: null,
      settings: {
        maxPlayers: this.maxPlayersPerRoom,
        gameMode: 'elimination'
      }
    };

    await this.redis.setEx(`room:${roomId}`, this.roomTimeout, JSON.stringify(room));
    await this.redis.sAdd('active_rooms', roomId);
    
    console.log(`Created room ${roomId}`);
    return room;
  }

  async getRoom(roomId) {
    try {
      const roomData = await this.redis.get(`room:${roomId}`);
      return roomData ? JSON.parse(roomData) : null;
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  }

  async addPlayerToRoom(roomId, playerId, playerData) {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      if (room.players.length >= this.maxPlayersPerRoom) {
        throw new Error('Room is full');
      }

      if (room.status !== 'waiting') {
        throw new Error('Game already in progress');
      }

      // Check if player already in room
      const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
      if (existingPlayerIndex !== -1) {
        // Update existing player data
        room.players[existingPlayerIndex] = {
          ...room.players[existingPlayerIndex],
          ...playerData,
          id: playerId,
          joinedAt: Date.now(),
          ready: false,
          connected: true
        };
      } else {
        // Add new player
        room.players.push({
          id: playerId,
          gamertag: playerData.gamertag,
          color: playerData.color,
          socketId: playerData.socketId,
          joinedAt: Date.now(),
          ready: false,
          connected: true,
          score: 0,
          eliminated: false
        });
      }

      await this.saveRoom(room);
      return room;
    } catch (error) {
      console.error('Error adding player to room:', error);
      throw error;
    }
  }

  async removePlayerFromRoom(roomId, playerId) {
    try {
      const room = await this.getRoom(roomId);
      if (!room) return;

      room.players = room.players.filter(p => p.id !== playerId);

      if (room.players.length === 0) {
        await this.deleteRoom(roomId);
      } else {
        // If host left, assign new host
        if (room.hostId === playerId && room.players.length > 0) {
          room.hostId = room.players[0].id;
        }
        await this.saveRoom(room);
      }
    } catch (error) {
      console.error('Error removing player from room:', error);
    }
  }

  async setPlayerReady(roomId, playerId, ready) {
    try {
      const room = await this.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.ready = ready;
        await this.saveRoom(room);
      }
    } catch (error) {
      console.error('Error setting player ready:', error);
    }
  }

  async setRoomStatus(roomId, status) {
    try {
      const room = await this.getRoom(roomId);
      if (!room) return;

      room.status = status;
      if (status === 'playing') {
        room.gameStartedAt = Date.now();
      }
      
      await this.saveRoom(room);
    } catch (error) {
      console.error('Error setting room status:', error);
    }
  }

  async saveRoom(room) {
    await this.redis.setEx(`room:${room.id}`, this.roomTimeout, JSON.stringify(room));
  }

  async deleteRoom(roomId) {
    try {
      await this.redis.del(`room:${roomId}`);
      await this.redis.sRem('active_rooms', roomId);
      console.log(`Deleted room ${roomId}`);
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  }

  async getAvailableRooms() {
    try {
      return await this.redis.sMembers('active_rooms');
    } catch (error) {
      console.error('Error getting available rooms:', error);
      return [];
    }
  }

  async cleanupExpiredRooms() {
    try {
      const roomIds = await this.getAvailableRooms();
      const now = Date.now();
      
      for (const roomId of roomIds) {
        const room = await this.getRoom(roomId);
        if (!room || (now - room.createdAt) > this.roomTimeout) {
          await this.deleteRoom(roomId);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired rooms:', error);
    }
  }

  async getRoomStats() {
    try {
      const roomIds = await this.getAvailableRooms();
      const stats = {
        totalRooms: roomIds.length,
        totalPlayers: 0,
        waitingRooms: 0,
        playingRooms: 0,
        activeRooms: roomIds.length,
        onlineCount: 0
      };

      for (const roomId of roomIds) {
        const room = await this.getRoom(roomId);
        if (room) {
          stats.totalPlayers += room.players.length;
          stats.onlineCount += room.players.length;
          if (room.status === 'waiting') stats.waitingRooms++;
          if (room.status === 'playing') stats.playingRooms++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting room stats:', error);
      return { 
        totalRooms: 0, 
        totalPlayers: 0, 
        waitingRooms: 0, 
        playingRooms: 0,
        activeRooms: 0,
        onlineCount: 0
      };
    }
  }
}

module.exports = RoomManager;
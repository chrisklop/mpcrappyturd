class GameManager {
  constructor(redis) {
    this.redis = redis;
    this.gameTickRate = 60; // Server tick rate
    this.maxPositionDelta = 200; // Max pixels player can move per tick
    this.activeGames = new Map();
  }

  async startGame(roomId, players) {
    try {
      const gameState = {
        roomId,
        players: players.map(p => ({
          ...p,
          x: 100, // Starting position
          y: 300,
          velocity: 0,
          score: 0,
          eliminated: false,
          lastUpdate: Date.now()
        })),
        obstacles: [],
        status: 'playing',
        startTime: Date.now(),
        obstacleCounter: 0,
        nextObstacleTime: Date.now() + 2000 // First obstacle in 2 seconds
      };

      // Generate initial obstacles
      await this.generateObstacles(gameState);

      // Save game state
      await this.redis.setEx(`game:${roomId}`, 1800, JSON.stringify(gameState)); // 30 min expiry
      this.activeGames.set(roomId, gameState);

      // Start game loop for this room
      this.startGameLoop(roomId);

      console.log(`Started game for room ${roomId} with ${players.length} players`);
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  async generateObstacles(gameState) {
    const now = Date.now();
    const gameTime = (now - gameState.startTime) / 1000; // seconds since start

    // Generate obstacles every 2-3 seconds
    while (gameState.nextObstacleTime <= now + 5000) { // 5 seconds ahead
      const obstacleTypes = [
        { type: 'pipe', visual: 'pipe', width: 80, gapSize: 150 },
        { type: 'creature', visual: 'rat', width: 60, gapSize: 120 },
        { type: 'creature', visual: 'gator', width: 100, gapSize: 180 }
      ];

      // Difficulty increases over time
      const difficultyMultiplier = Math.min(1 + gameTime * 0.1, 2.0);
      const selectedType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      
      const obstacle = {
        id: `obs_${gameState.obstacleCounter++}`,
        x: 800, // Start off-screen
        type: selectedType.type,
        visual: selectedType.visual,
        width: selectedType.width,
        gapY: 150 + Math.random() * 200, // Random gap position
        gapSize: Math.max(100, selectedType.gapSize - gameTime * 2), // Gap gets smaller over time
        speed: 180 + (gameTime * 10), // Speed increases over time
        scored: false,
        spawnTime: gameState.nextObstacleTime
      };

      gameState.obstacles.push(obstacle);
      gameState.nextObstacleTime += 2000 + Math.random() * 1000; // 2-3 seconds
    }

    // Remove old obstacles that are off-screen
    gameState.obstacles = gameState.obstacles.filter(obs => obs.x > -200);
  }

  startGameLoop(roomId) {
    const gameLoop = setInterval(async () => {
      try {
        const gameState = this.activeGames.get(roomId);
        if (!gameState || gameState.status !== 'playing') {
          clearInterval(gameLoop);
          return;
        }

        // Update obstacles
        const deltaTime = 1 / this.gameTickRate;
        const now = Date.now();

        gameState.obstacles.forEach(obstacle => {
          obstacle.x -= obstacle.speed * deltaTime;
        });

        // Generate new obstacles
        await this.generateObstacles(gameState);

        // Check for remaining players
        const alivePlayers = gameState.players.filter(p => !p.eliminated);
        if (alivePlayers.length <= 1) {
          await this.endGame(roomId, alivePlayers[0]);
          clearInterval(gameLoop);
          return;
        }

        // Save updated game state
        await this.redis.setEx(`game:${roomId}`, 1800, JSON.stringify(gameState));

      } catch (error) {
        console.error('Game loop error:', error);
        clearInterval(gameLoop);
      }
    }, 1000 / this.gameTickRate);

    // Store interval reference for cleanup
    if (!this.activeGames.has(roomId)) return;
    this.activeGames.get(roomId).gameLoopInterval = gameLoop;
  }

  async updatePlayerPosition(roomId, playerId, positionData) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return false;

      const player = gameState.players.find(p => p.id === playerId);
      if (!player || player.eliminated) return false;

      // Basic validation - prevent teleporting
      const timeDelta = (positionData.timestamp - player.lastUpdate) / 1000;
      const maxDistance = this.maxPositionDelta * timeDelta;
      
      const distance = Math.sqrt(
        Math.pow(positionData.x - player.x, 2) + 
        Math.pow(positionData.y - player.y, 2)
      );

      if (distance > maxDistance) {
        console.warn(`Suspicious movement from player ${playerId}: ${distance}px in ${timeDelta}s`);
        return false;
      }

      // Update player position
      player.x = positionData.x;
      player.y = positionData.y;
      player.velocity = positionData.velocity;
      player.lastUpdate = positionData.timestamp;

      return true;
    } catch (error) {
      console.error('Error updating player position:', error);
      return false;
    }
  }

  validatePlayerPosition(roomId, playerId, positionData) {
    // Basic validation - can be expanded with more sophisticated anti-cheat
    return positionData.x >= 0 && 
           positionData.x <= 800 && 
           positionData.y >= 0 && 
           positionData.y <= 600 &&
           Math.abs(positionData.velocity) <= 1000;
  }

  async validatePlayerDeath(roomId, playerId, deathData) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return false;

      const player = gameState.players.find(p => p.id === playerId);
      if (!player || player.eliminated) return false;

      // Validate score is reasonable
      const gameTime = (Date.now() - gameState.startTime) / 1000;
      const maxPossibleScore = Math.floor(gameTime / 2) * 10; // Rough estimate

      if (deathData.score > maxPossibleScore * 2) {
        console.warn(`Suspicious score from player ${playerId}: ${deathData.score}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating player death:', error);
      return false;
    }
  }

  async eliminatePlayer(roomId, playerId, score) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return;

      const player = gameState.players.find(p => p.id === playerId);
      if (player) {
        player.eliminated = true;
        player.finalScore = score;
        player.eliminationTime = Date.now();
        
        console.log(`Player ${playerId} eliminated with score ${score}`);
      }
    } catch (error) {
      console.error('Error eliminating player:', error);
    }
  }

  async getRemainingPlayers(roomId) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return [];

      return gameState.players.filter(p => !p.eliminated);
    } catch (error) {
      console.error('Error getting remaining players:', error);
      return [];
    }
  }

  async getObstacles(roomId) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return [];

      // Return obstacles that should be visible to clients
      return gameState.obstacles.filter(obs => obs.x > -100 && obs.x < 900);
    } catch (error) {
      console.error('Error getting obstacles:', error);
      return [];
    }
  }

  async endGame(roomId, winner = null) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return;

      gameState.status = 'finished';
      gameState.endTime = Date.now();
      gameState.winner = winner;

      // Clear game loop
      if (gameState.gameLoopInterval) {
        clearInterval(gameState.gameLoopInterval);
      }

      // Save final game results
      await this.saveGameResults(roomId, gameState);

      // Clean up
      this.activeGames.delete(roomId);
      
      console.log(`Game ended for room ${roomId}. Winner: ${winner ? winner.gamertag : 'None'}`);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  async getFinalScores(roomId) {
    try {
      const gameState = this.activeGames.get(roomId);
      if (!gameState) return [];

      return gameState.players
        .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
        .map(p => ({
          playerId: p.id,
          gamertag: p.gamertag,
          score: p.finalScore || 0,
          eliminated: p.eliminated,
          placement: 0 // Will be calculated
        }))
        .map((p, index) => ({ ...p, placement: index + 1 }));
    } catch (error) {
      console.error('Error getting final scores:', error);
      return [];
    }
  }

  async saveGameResults(roomId, gameState) {
    try {
      const results = {
        roomId,
        gameTime: gameState.endTime - gameState.startTime,
        playerCount: gameState.players.length,
        winner: gameState.winner,
        finalScores: await this.getFinalScores(roomId),
        timestamp: Date.now()
      };

      // Save to leaderboard
      await this.redis.zAdd('global_leaderboard', [
        ...results.finalScores.map(score => ({
          score: score.score,
          value: `${score.gamertag}:${Date.now()}`
        }))
      ]);

      // Save game history
      await this.redis.lPush('game_history', JSON.stringify(results));
      await this.redis.lTrim('game_history', 0, 999); // Keep last 1000 games

    } catch (error) {
      console.error('Error saving game results:', error);
    }
  }

  async getGlobalStats() {
    try {
      const [
        totalGames,
        topScores,
        recentGames
      ] = await Promise.all([
        this.redis.lLen('game_history'),
        this.redis.zRevRange('global_leaderboard', 0, 9, { WITHSCORES: true }),
        this.redis.lRange('game_history', 0, 4)
      ]);

      return {
        totalGames,
        topScores: topScores.map(item => ({
          player: item.value.split(':')[0],
          score: item.score
        })),
        recentGames: recentGames.map(game => JSON.parse(game)),
        activeRooms: this.activeGames.size
      };
    } catch (error) {
      console.error('Error getting global stats:', error);
      return { totalGames: 0, topScores: [], recentGames: [], activeRooms: 0 };
    }
  }
}

module.exports = GameManager;
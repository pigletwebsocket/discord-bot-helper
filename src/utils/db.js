// Database connection
const { Pool } = require('pg');

// Create a new pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Database connected, current time:', res.rows[0].now);
  }
});

// DB helper functions
async function getUserById(userId) {
  try {
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    return userResult.rows[0];
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

async function createUser(userId, username, startingCash = 1000) {
  try {
    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (id, username, cash, level) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, username, startingCash, 0]
    );
    
    // Initialize stats
    await pool.query(
      'INSERT INTO stats (user_id) VALUES ($1)',
      [userId]
    );
    
    // Initialize game stats for each game
    const games = ['coinflip', 'blackjack', 'diceroll', 'slots', 'roulette'];
    for (const game of games) {
      await pool.query(
        'INSERT INTO game_stats (user_id, game) VALUES ($1, $2)',
        [userId, game]
      );
    }
    
    return userResult.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function updateUser(userId, updateData) {
  try {
    const { cash, level } = updateData;
    let query = 'UPDATE users SET ';
    const values = [];
    const updateFields = [];
    
    let paramIndex = 1;
    
    if (cash !== undefined) {
      updateFields.push(`cash = $${paramIndex}`);
      values.push(cash);
      paramIndex++;
    }
    
    if (level !== undefined) {
      updateFields.push(`level = $${paramIndex}`);
      values.push(level);
      paramIndex++;
    }
    
    if (updateFields.length === 0) {
      return await getUserById(userId);
    }
    
    query += updateFields.join(', ');
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    values.push(userId);
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function getUserStats(userId) {
  try {
    const statsResult = await pool.query(
      'SELECT * FROM stats WHERE user_id = $1',
      [userId]
    );
    
    if (statsResult.rows.length === 0) {
      return null;
    }
    
    return statsResult.rows[0];
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

async function getGameStats(userId, game) {
  try {
    const gameStatsResult = await pool.query(
      'SELECT * FROM game_stats WHERE user_id = $1 AND game = $2',
      [userId, game]
    );
    
    if (gameStatsResult.rows.length === 0) {
      return null;
    }
    
    return gameStatsResult.rows[0];
  } catch (error) {
    console.error('Error getting game stats:', error);
    throw error;
  }
}

async function getAllGameStats(userId) {
  try {
    const gameStatsResult = await pool.query(
      'SELECT * FROM game_stats WHERE user_id = $1',
      [userId]
    );
    
    return gameStatsResult.rows.reduce((acc, curr) => {
      acc[curr.game] = {
        played: curr.played,
        won: curr.won,
        lost: curr.lost,
        bet: curr.bet,
        won_amount: curr.won_amount,
        lost_amount: curr.lost_amount
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting all game stats:', error);
    throw error;
  }
}

async function getCooldowns(userId) {
  try {
    const cooldownsResult = await pool.query(
      'SELECT command, last_used FROM cooldowns WHERE user_id = $1',
      [userId]
    );
    
    return cooldownsResult.rows.reduce((acc, curr) => {
      acc[curr.command] = curr.last_used;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting cooldowns:', error);
    throw error;
  }
}

async function setCooldown(userId, command, timestamp) {
  try {
    await pool.query(
      'INSERT INTO cooldowns (user_id, command, last_used) VALUES ($1, $2, $3) ' +
      'ON CONFLICT (user_id, command) DO UPDATE SET last_used = $3',
      [userId, command, timestamp]
    );
  } catch (error) {
    console.error('Error setting cooldown:', error);
    throw error;
  }
}

async function updateStats(userId, game, outcome, bet, winnings) {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update global stats
      if (outcome === 'win') {
        await client.query(
          'UPDATE stats SET games_played = games_played + 1, games_won = games_won + 1, ' +
          'total_bet = total_bet + $1, total_won = total_won + $2 WHERE user_id = $3',
          [bet, winnings, userId]
        );
      } else {
        await client.query(
          'UPDATE stats SET games_played = games_played + 1, games_lost = games_lost + 1, ' +
          'total_bet = total_bet + $1, total_lost = total_lost + $1 WHERE user_id = $3',
          [bet, userId]
        );
      }
      
      // Update game specific stats
      if (outcome === 'win') {
        await client.query(
          'UPDATE game_stats SET played = played + 1, won = won + 1, ' +
          'bet = bet + $1, won_amount = won_amount + $2 WHERE user_id = $3 AND game = $4',
          [bet, winnings, userId, game]
        );
      } else {
        await client.query(
          'UPDATE game_stats SET played = played + 1, lost = lost + 1, ' +
          'bet = bet + $1, lost_amount = lost_amount + $1 WHERE user_id = $3 AND game = $4',
          [bet, userId, game]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
}

module.exports = {
  getUserById,
  createUser,
  updateUser,
  getUserStats,
  getGameStats,
  getAllGameStats,
  getCooldowns,
  setCooldown,
  updateStats
};
// PostgreSQL database connection and operations
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database - create tables if they don't exist
async function initDb() {
  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        cash BIGINT NOT NULL DEFAULT 1000,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_daily TIMESTAMP
      )
    `);

    // Create stats table for user statistics
    await client.query(`
      CREATE TABLE IF NOT EXISTS stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        games_played INTEGER NOT NULL DEFAULT 0,
        games_won INTEGER NOT NULL DEFAULT 0,
        total_wagered BIGINT NOT NULL DEFAULT 0,
        total_won BIGINT NOT NULL DEFAULT 0,
        net_profit BIGINT NOT NULL DEFAULT 0
      )
    `);

    // Create game_stats table for individual game statistics
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_stats (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_name TEXT NOT NULL,
        games_played INTEGER NOT NULL DEFAULT 0,
        games_won INTEGER NOT NULL DEFAULT 0,
        total_wagered BIGINT NOT NULL DEFAULT 0,
        total_won BIGINT NOT NULL DEFAULT 0,
        net_profit BIGINT NOT NULL DEFAULT 0,
        UNIQUE(user_id, game_name)
      )
    `);

    // Create cooldowns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        command TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        UNIQUE(user_id, command)
      )
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Initialize database on startup
initDb().catch(console.error);

// User functions
async function getUserById(userId) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } catch (err) {
    console.error('Error in getUserById:', err);
    throw err;
  }
}

async function createUser(userId, username, startingCash = 1000) {
  const client = await pool.connect();
  try {
    // Begin transaction
    await client.query('BEGIN');

    // Create user
    const userResult = await client.query(
      'INSERT INTO users (id, username, cash) VALUES ($1, $2, $3) RETURNING *',
      [userId, username, startingCash]
    );

    // Create user stats
    await client.query(
      'INSERT INTO stats (user_id) VALUES ($1)',
      [userId]
    );

    // Commit transaction
    await client.query('COMMIT');

    return userResult.rows[0];
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error in createUser:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function updateUser(userId, updateData) {
  // Build dynamic SET clause and values array
  const setClause = [];
  const values = [userId];
  let valueIndex = 2;

  for (const [key, value] of Object.entries(updateData)) {
    setClause.push(`${key} = $${valueIndex}`);
    values.push(value);
    valueIndex++;
  }

  if (setClause.length === 0) {
    return null; // No updates to apply
  }

  const query = `UPDATE users SET ${setClause.join(', ')} WHERE id = $1 RETURNING *`;

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error in updateUser:', err);
    throw err;
  }
}

// Stats functions
async function getUserStats(userId) {
  try {
    const result = await pool.query('SELECT * FROM stats WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      // Create stats if they don't exist
      await pool.query('INSERT INTO stats (user_id) VALUES ($1)', [userId]);
      return { user_id: userId, games_played: 0, games_won: 0, total_wagered: 0, total_won: 0, net_profit: 0 };
    }
    return result.rows[0];
  } catch (err) {
    console.error('Error in getUserStats:', err);
    throw err;
  }
}

async function getGameStats(userId, game) {
  try {
    const result = await pool.query(
      'SELECT * FROM game_stats WHERE user_id = $1 AND game_name = $2',
      [userId, game]
    );
    
    if (result.rows.length === 0) {
      // Create game stats if they don't exist
      await pool.query(
        'INSERT INTO game_stats (user_id, game_name) VALUES ($1, $2)',
        [userId, game]
      );
      return { user_id: userId, game_name: game, games_played: 0, games_won: 0, total_wagered: 0, total_won: 0, net_profit: 0 };
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in getGameStats:', err);
    throw err;
  }
}

async function getAllGameStats(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM game_stats WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  } catch (err) {
    console.error('Error in getAllGameStats:', err);
    throw err;
  }
}

// Cooldown functions
async function getCooldowns(userId) {
  try {
    const result = await pool.query('SELECT * FROM cooldowns WHERE user_id = $1', [userId]);
    return result.rows;
  } catch (err) {
    console.error('Error in getCooldowns:', err);
    throw err;
  }
}

async function setCooldown(userId, command, timestamp) {
  try {
    // Use upsert pattern with ON CONFLICT
    const result = await pool.query(
      `INSERT INTO cooldowns (user_id, command, timestamp) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, command) 
       DO UPDATE SET timestamp = $3
       RETURNING *`,
      [userId, command, timestamp]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error in setCooldown:', err);
    throw err;
  }
}

// Game stats update function
async function updateStats(userId, game, outcome, bet, winnings) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure user exists
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    // Calculate profit/loss
    const isWin = outcome === 'win';
    const profit = isWin ? winnings - bet : -bet;

    // Update overall stats
    await client.query(`
      INSERT INTO stats (user_id, games_played, games_won, total_wagered, total_won, net_profit)
      VALUES ($1, 1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        games_played = stats.games_played + 1,
        games_won = stats.games_won + $2,
        total_wagered = stats.total_wagered + $3,
        total_won = stats.total_won + $4,
        net_profit = stats.net_profit + $5
    `, [userId, isWin ? 1 : 0, bet, winnings, profit]);

    // Update game-specific stats
    await client.query(`
      INSERT INTO game_stats (user_id, game_name, games_played, games_won, total_wagered, total_won, net_profit)
      VALUES ($1, $2, 1, $3, $4, $5, $6)
      ON CONFLICT (user_id, game_name)
      DO UPDATE SET
        games_played = game_stats.games_played + 1,
        games_won = game_stats.games_won + $3,
        total_wagered = game_stats.total_wagered + $4,
        total_won = game_stats.total_won + $5,
        net_profit = game_stats.net_profit + $6
    `, [userId, game, isWin ? 1 : 0, bet, winnings, profit]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in updateStats:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Export direct db connection for the websocket control panel
module.exports = {
  db: pool,
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
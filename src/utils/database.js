// This file is a wrapper around the PostgreSQL database operations
// It provides a simpler interface for the bot commands to use

const db = require('./db');

// User management
async function getUser(userId, username) {
  try {
    // Try to get user, create if doesn't exist
    let user = await db.getUserById(userId);
    
    if (!user) {
      console.log(`Creating new user: ${username} (${userId})`);
      user = await db.createUser(userId, username);
    }
    
    return user;
  } catch (err) {
    console.error('Error in getUser:', err);
    throw err;
  }
}

async function updateUser(userId, updateData) {
  try {
    return await db.updateUser(userId, updateData);
  } catch (err) {
    console.error('Error in updateUser:', err);
    throw err;
  }
}

// Economy functions
async function addCash(userId, amount) {
  try {
    if (amount <= 0) return false;
    
    const user = await db.getUserById(userId);
    if (!user) return false;
    
    const newBalance = user.cash + amount;
    await db.updateUser(userId, { cash: newBalance });
    return true;
  } catch (err) {
    console.error('Error in addCash:', err);
    return false;
  }
}

async function removeCash(userId, amount) {
  try {
    if (amount <= 0) return false;
    
    const user = await db.getUserById(userId);
    if (!user) return false;
    
    if (user.cash < amount) return false;
    
    const newBalance = user.cash - amount;
    await db.updateUser(userId, { cash: newBalance });
    return true;
  } catch (err) {
    console.error('Error in removeCash:', err);
    return false;
  }
}

async function hasEnoughCash(userId, amount) {
  try {
    const user = await db.getUserById(userId);
    return user && user.cash >= amount;
  } catch (err) {
    console.error('Error in hasEnoughCash:', err);
    return false;
  }
}

// Game statistics
async function updateStats(userId, game, outcome, bet, winnings) {
  try {
    return await db.updateStats(userId, game, outcome, bet, winnings);
  } catch (err) {
    console.error('Error in updateStats:', err);
  }
}

// Cooldown management
async function setCooldown(userId, command) {
  try {
    const now = Date.now();
    return await db.setCooldown(userId, command, now);
  } catch (err) {
    console.error('Error in setCooldown:', err);
  }
}

async function checkCooldown(userId, command) {
  try {
    return await db.getCooldowns(userId)
      .then(cooldowns => {
        const commandCooldown = cooldowns.find(cd => cd.command === command);
        return commandCooldown ? commandCooldown.timestamp : null;
      });
  } catch (err) {
    console.error('Error in checkCooldown:', err);
    return null;
  }
}

// Export the database connection for direct queries
const { db: dbConnection } = require('./db');

module.exports = {
  getUser,
  updateUser,
  addCash,
  removeCash,
  hasEnoughCash,
  updateStats,
  setCooldown,
  checkCooldown,
  db: dbConnection
};
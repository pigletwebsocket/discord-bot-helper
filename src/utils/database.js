// PostgreSQL database for the gambling bot
const db = require('./db');
const config = require('../../config');

// Get user data, create if not exists
async function getUser(userId, username) {
  try {
    let user = await db.getUserById(userId);
    
    if (!user) {
      // Create new user
      user = await db.createUser(userId, username, config.economy.startingCash);
    }
    
    // Get user stats
    const stats = await db.getUserStats(userId);
    const gameStats = await db.getAllGameStats(userId);
    const cooldowns = await db.getCooldowns(userId);
    
    // Format the user object to match the expected structure
    return {
      id: user.id,
      username: user.username,
      cash: user.cash,
      level: user.level,
      stats: {
        gamesPlayed: stats?.games_played || 0,
        gamesWon: stats?.games_won || 0,
        gamesLost: stats?.games_lost || 0,
        totalBet: stats?.total_bet || 0,
        totalWon: stats?.total_won || 0,
        totalLost: stats?.total_lost || 0,
        ...gameStats
      },
      cooldowns: cooldowns || {
        daily: 0,
        coinflip: 0,
        blackjack: 0,
        diceroll: 0,
        slots: 0,
        roulette: 0
      }
    };
  } catch (error) {
    console.error('Error in getUser:', error);
    
    // Fallback to a default user if database fails
    return {
      id: userId,
      username: username,
      cash: config.economy.startingCash,
      level: 0,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalBet: 0,
        totalWon: 0,
        totalLost: 0,
        coinflip: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
        blackjack: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
        diceroll: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
        slots: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
        roulette: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 }
      },
      cooldowns: {
        daily: 0,
        coinflip: 0,
        blackjack: 0,
        diceroll: 0,
        slots: 0,
        roulette: 0
      }
    };
  }
}

// Update user data
async function updateUser(userId, updateData) {
  try {
    const updatedUser = await db.updateUser(userId, updateData);
    return await getUser(userId);
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw new Error('User not found');
  }
}

// Add cash to user
async function addCash(userId, amount) {
  try {
    const user = await getUser(userId);
    const newCash = user.cash + amount;
    
    await db.updateUser(userId, { cash: newCash });
    user.cash = newCash;
    
    return user;
  } catch (error) {
    console.error('Error in addCash:', error);
    throw error;
  }
}

// Remove cash from user
async function removeCash(userId, amount) {
  try {
    const user = await getUser(userId);
    const newCash = Math.max(0, user.cash - amount);
    
    await db.updateUser(userId, { cash: newCash });
    user.cash = newCash;
    
    return user;
  } catch (error) {
    console.error('Error in removeCash:', error);
    throw error;
  }
}

// Check if user has enough cash
async function hasEnoughCash(userId, amount) {
  try {
    const user = await getUser(userId);
    return user.cash >= amount;
  } catch (error) {
    console.error('Error in hasEnoughCash:', error);
    return false;
  }
}

// Update user stats
async function updateStats(userId, game, outcome, bet, winnings) {
  try {
    await db.updateStats(userId, game, outcome, bet, winnings);
    return await getUser(userId);
  } catch (error) {
    console.error('Error in updateStats:', error);
    throw error;
  }
}

// Update cooldown timestamp
async function setCooldown(userId, command) {
  try {
    await db.setCooldown(userId, command, Date.now());
    return await getUser(userId);
  } catch (error) {
    console.error('Error in setCooldown:', error);
    throw error;
  }
}

// Check if cooldown has expired
async function checkCooldown(userId, command) {
  try {
    const user = await getUser(userId);
    const lastUsed = user.cooldowns[command] || 0;
    const cooldownTime = config.cooldowns[command];
    
    const timePassed = Date.now() - lastUsed;
    const timeRemaining = cooldownTime - timePassed;
    
    return {
      onCooldown: timeRemaining > 0,
      timeRemaining: timeRemaining > 0 ? timeRemaining : 0
    };
  } catch (error) {
    console.error('Error in checkCooldown:', error);
    return {
      onCooldown: false,
      timeRemaining: 0
    };
  }
}

module.exports = {
  getUser,
  updateUser,
  addCash,
  removeCash,
  hasEnoughCash,
  updateStats,
  setCooldown,
  checkCooldown
};

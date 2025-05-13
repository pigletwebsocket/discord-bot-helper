// In-memory database for the gambling bot
// This stores user profiles, balances, statistics, and game history

// Users database - stores all user data
const users = new Map();

// Default user template
const defaultUser = {
  id: null,
  username: null,
  cash: 0,
  level: 0,
  stats: {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalBet: 0,
    totalWon: 0,
    totalLost: 0,
    // Game specific stats
    coinflip: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
    blackjack: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
    diceroll: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
    slots: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 },
    roulette: { played: 0, won: 0, lost: 0, bet: 0, won_amount: 0, lost_amount: 0 }
  },
  cooldowns: {
    // Stores timestamps of when commands were last used
    daily: 0,
    coinflip: 0,
    blackjack: 0,
    diceroll: 0,
    slots: 0,
    roulette: 0
  }
};

// Get user data, create if not exists
function getUser(userId, username) {
  if (!users.has(userId)) {
    const config = require('../../config');
    const newUser = {
      ...defaultUser,
      id: userId,
      username: username,
      cash: config.economy.startingCash
    };
    users.set(userId, newUser);
  }
  return users.get(userId);
}

// Update user data
function updateUser(userId, updateData) {
  if (!users.has(userId)) {
    throw new Error('User not found');
  }
  
  const userData = users.get(userId);
  const updatedUser = { ...userData, ...updateData };
  users.set(userId, updatedUser);
  return updatedUser;
}

// Add cash to user
function addCash(userId, amount) {
  const user = getUser(userId);
  user.cash += amount;
  return user;
}

// Remove cash from user
function removeCash(userId, amount) {
  const user = getUser(userId);
  user.cash -= amount;
  if (user.cash < 0) {
    user.cash = 0;
  }
  return user;
}

// Check if user has enough cash
function hasEnoughCash(userId, amount) {
  const user = getUser(userId);
  return user.cash >= amount;
}

// Update user stats
function updateStats(userId, game, outcome, bet, winnings) {
  const user = getUser(userId);
  
  // Update general stats
  user.stats.gamesPlayed++;
  user.stats.totalBet += bet;
  
  if (outcome === 'win') {
    user.stats.gamesWon++;
    user.stats.totalWon += winnings;
    
    // Update game specific stats
    user.stats[game].played++;
    user.stats[game].won++;
    user.stats[game].bet += bet;
    user.stats[game].won_amount += winnings;
  } else {
    user.stats.gamesLost++;
    user.stats.totalLost += bet;
    
    // Update game specific stats
    user.stats[game].played++;
    user.stats[game].lost++;
    user.stats[game].bet += bet;
    user.stats[game].lost_amount += bet;
  }
  
  return user;
}

// Update cooldown timestamp
function setCooldown(userId, command) {
  const user = getUser(userId);
  user.cooldowns[command] = Date.now();
  return user;
}

// Check if cooldown has expired
function checkCooldown(userId, command) {
  const user = getUser(userId);
  const lastUsed = user.cooldowns[command] || 0;
  const config = require('../../config');
  const cooldownTime = config.cooldowns[command];
  
  const timePassed = Date.now() - lastUsed;
  const timeRemaining = cooldownTime - timePassed;
  
  return {
    onCooldown: timeRemaining > 0,
    timeRemaining: timeRemaining > 0 ? timeRemaining : 0
  };
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

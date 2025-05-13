const { Collection } = require('discord.js');
const { formatTime } = require('./formatter');
const db = require('./database');
const config = require('../../config');

// Check command cooldown
async function checkCommandCooldown(userId, commandName) {
  const cooldownInfo = await db.checkCooldown(userId, commandName);
  
  return {
    onCooldown: cooldownInfo.onCooldown,
    timeRemaining: cooldownInfo.timeRemaining,
    formattedTime: formatTime(cooldownInfo.timeRemaining)
  };
}

// Set command cooldown
async function setCommandCooldown(userId, commandName) {
  return await db.setCooldown(userId, commandName);
}

// Get all cooldowns for a user
async function getUserCooldowns(userId) {
  const user = await db.getUser(userId);
  const cooldowns = user.cooldowns;
  const cooldownInfo = {};
  
  // Process each cooldown
  for (const [command, timestamp] of Object.entries(cooldowns)) {
    if (!config.cooldowns[command]) continue;
    
    const cooldownTime = config.cooldowns[command];
    const timePassed = Date.now() - timestamp;
    const timeRemaining = cooldownTime - timePassed;
    
    cooldownInfo[command] = {
      onCooldown: timeRemaining > 0,
      timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
      formattedTime: formatTime(timeRemaining > 0 ? timeRemaining : 0),
      cooldownTime: cooldownTime,
      formattedCooldownTime: formatTime(cooldownTime)
    };
  }
  
  return cooldownInfo;
}

module.exports = {
  checkCommandCooldown,
  setCommandCooldown,
  getUserCooldowns
};

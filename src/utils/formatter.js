// Utility functions for formatting messages, numbers, and time

// Format number with commas for thousands
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format cash amount with $ symbol and commas
function formatCash(amount) {
  return `$${formatNumber(amount)}`;
}

// Convert milliseconds to a readable time string
function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

// Parse bet amount from string input (handles k, m, b, t abbreviations)
function parseBetAmount(bet, maxAmount) {
  if (!bet) return null;
  
  // Convert to lowercase for easier comparison
  bet = bet.toString().toLowerCase();
  
  // Check for max or all-in
  if (bet === 'max' || bet === 'm' || bet === 'allin' || bet === 'all-in' || bet === 'all') {
    return maxAmount;
  }
  
  // Handle letter abbreviations (k, m, b, t, etc.)
  const multipliers = {
    'k': 1000,
    'm': 1000000,
    'g': 1000000000,
    't': 1000000000000,
    'p': 1000000000000000,
    'e': 1000000000000000000,
    'z': 1000000000000000000000,
    'y': 1000000000000000000000000
  };
  
  // Extract letter suffix
  const regex = /^(\d+)([kmgtpezy])?$/;
  const match = bet.match(regex);
  
  if (match) {
    const number = parseInt(match[1]);
    const suffix = match[2];
    
    if (suffix && multipliers[suffix]) {
      return number * multipliers[suffix];
    }
    
    return number;
  }
  
  // Try to parse as a number
  const numBet = parseInt(bet);
  if (!isNaN(numBet)) {
    return numBet;
  }
  
  return null;
}

// Validates and formats bet amount
function validateBet(betInput, userCash) {
  const betAmount = parseBetAmount(betInput, userCash);
  
  if (betAmount === null) {
    return { valid: false, message: 'Invalid bet amount. Please enter a valid number.' };
  }
  
  if (betAmount <= 0) {
    return { valid: false, message: 'Bet amount must be greater than 0.' };
  }
  
  if (betAmount > userCash) {
    return { valid: false, message: `You don't have enough cash. Your balance: ${formatCash(userCash)}` };
  }
  
  return { valid: true, amount: betAmount };
}

// Create embed for displaying user profiles
function createProfileEmbed(user) {
  const { EmbedBuilder } = require('discord.js');
  
  return new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`${user.username}'s Profile`)
    .setDescription('Your gambling profile and statistics')
    .addFields(
      { name: 'Cash', value: formatCash(user.cash), inline: true },
      { name: 'Level', value: user.level.toString(), inline: true },
      { name: 'Games Played', value: formatNumber(user.stats.gamesPlayed), inline: true },
      { name: 'Win/Loss', value: `${formatNumber(user.stats.gamesWon)}/${formatNumber(user.stats.gamesLost)}`, inline: true },
      { name: 'Win Rate', value: `${user.stats.gamesPlayed > 0 ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100) : 0}%`, inline: true },
      { name: 'Total Bet', value: formatCash(user.stats.totalBet), inline: true },
      { name: 'Total Won', value: formatCash(user.stats.totalWon), inline: true },
      { name: 'Total Lost', value: formatCash(user.stats.totalLost), inline: true },
      { name: 'Profit', value: formatCash(user.stats.totalWon - user.stats.totalLost), inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Gamble Bot' });
}

// Create embed for game results
function createGameResultEmbed(user, game, result, bet, winnings) {
  const { EmbedBuilder } = require('discord.js');
  
  let color = '#ff0000'; // Red for loss
  if (result === 'win') {
    color = '#00ff00'; // Green for win
  } else if (result === 'tie') {
    color = '#ffff00'; // Yellow for tie
  }
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${game.charAt(0).toUpperCase() + game.slice(1)} Results`)
    .setTimestamp()
    .setFooter({ text: 'Gamble Bot' });
  
  if (result === 'win') {
    embed.setDescription(`**${user.username}** won ${formatCash(winnings)}!`);
    embed.addFields(
      { name: 'Bet', value: formatCash(bet), inline: true },
      { name: 'Winnings', value: formatCash(winnings), inline: true },
      { name: 'New Balance', value: formatCash(user.cash), inline: true }
    );
  } else if (result === 'loss') {
    embed.setDescription(`**${user.username}** lost ${formatCash(bet)}!`);
    embed.addFields(
      { name: 'Bet', value: formatCash(bet), inline: true },
      { name: 'Loss', value: formatCash(bet), inline: true },
      { name: 'New Balance', value: formatCash(user.cash), inline: true }
    );
  } else {
    embed.setDescription(`**${user.username}** tied and got their ${formatCash(bet)} back.`);
    embed.addFields(
      { name: 'Bet', value: formatCash(bet), inline: true },
      { name: 'New Balance', value: formatCash(user.cash), inline: true }
    );
  }
  
  return embed;
}

module.exports = {
  formatNumber,
  formatCash,
  formatTime,
  parseBetAmount,
  validateBet,
  createProfileEmbed,
  createGameResultEmbed
};

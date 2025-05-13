const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

// Helper functions for roulette
function isValidBet(prediction) {
  const validBets = [
    'red', 'black', 'odd', 'even', 'low', 'high', // Even money bets
    '1st', '2nd', '3rd', // Dozen bets
    '1st column', '2nd column', '3rd column', // Column bets
    ...Array.from({length: 37}, (_, i) => i.toString()), // Straight up bets (0-36)
    '00' // 00 for American roulette
  ];
  
  return validBets.includes(prediction);
}

function getRouletteNumber() {
  // 0-36 + 00 (represented as 37)
  const number = Math.floor(Math.random() * 38);
  return number === 37 ? '00' : number.toString();
}

function isWinningBet(prediction, result) {
  const resultNumber = result === '00' ? 37 : parseInt(result);
  
  // Define red numbers
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  
  // Check prediction type
  switch (prediction) {
    case 'red':
      return redNumbers.includes(resultNumber);
    case 'black':
      return resultNumber > 0 && resultNumber <= 36 && !redNumbers.includes(resultNumber);
    case 'odd':
      return resultNumber > 0 && resultNumber % 2 === 1;
    case 'even':
      return resultNumber > 0 && resultNumber % 2 === 0;
    case 'low':
      return resultNumber >= 1 && resultNumber <= 18;
    case 'high':
      return resultNumber >= 19 && resultNumber <= 36;
    case '1st':
      return resultNumber >= 1 && resultNumber <= 12;
    case '2nd':
      return resultNumber >= 13 && resultNumber <= 24;
    case '3rd':
      return resultNumber >= 25 && resultNumber <= 36;
    case '1st column':
      return resultNumber > 0 && resultNumber <= 36 && resultNumber % 3 === 1;
    case '2nd column':
      return resultNumber > 0 && resultNumber <= 36 && resultNumber % 3 === 2;
    case '3rd column':
      return resultNumber > 0 && resultNumber <= 36 && resultNumber % 3 === 0;
    default:
      // Straight up bet
      return prediction === result;
  }
}

function getBetType(prediction) {
  const straightUp = [
    ...Array.from({length: 37}, (_, i) => i.toString()),
    '00'
  ];
  
  if (straightUp.includes(prediction)) return 'number';
  if (['red', 'black', 'odd', 'even', 'low', 'high'].includes(prediction)) return 'even_money';
  if (['1st', '2nd', '3rd'].includes(prediction)) return 'dozen';
  if (['1st column', '2nd column', '3rd column'].includes(prediction)) return 'column';
  
  return 'invalid';
}

function getPayoutMultiplier(betType) {
  const payouts = config.games.roulette.payouts;
  switch (betType) {
    case 'number':
      return payouts.number;
    case 'even_money':
      return payouts.red; // Same as black, odd, even, etc.
    case 'dozen':
      return payouts.dozen;
    case 'column':
      return payouts.column;
    default:
      return 0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Play roulette')
    .addStringOption(option => 
      option.setName('prediction')
        .setDescription('Your prediction (e.g., red, black, odd, even, 0, 00, 1-36)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    // Check cooldown
    const cooldownInfo = cooldowns.checkCommandCooldown(interaction.user.id, 'roulette');
    
    if (cooldownInfo.onCooldown) {
      return interaction.reply({
        content: `You need to wait ${cooldownInfo.formattedTime} before playing roulette again.`,
        ephemeral: true
      });
    }
    
    // Get prediction and bet
    const prediction = interaction.options.getString('prediction').toLowerCase();
    const betInput = interaction.options.getString('bet');
    
    // Validate prediction
    if (!isValidBet(prediction)) {
      return interaction.reply({
        content: 'Invalid prediction. Valid bets include: red, black, odd, even, low, high, 1st, 2nd, 3rd, 1st column, 2nd column, 3rd column, or any number from 0 to 36, or 00.',
        ephemeral: true
      });
    }
    
    // Get user data
    const user = db.getUser(interaction.user.id, interaction.user.username);
    
    // Validate the bet
    const betValidation = formatter.validateBet(betInput, user.cash);
    if (!betValidation.valid) {
      return interaction.reply({
        content: betValidation.message,
        ephemeral: true
      });
    }
    
    const betAmount = betValidation.amount;
    
    // Set cooldown
    cooldowns.setCommandCooldown(user.id, 'roulette');
    
    // Spin the roulette wheel
    const result = getRouletteNumber();
    
    // Determine if the user won
    const isWin = isWinningBet(prediction, result);
    
    // Get bet type and payout multiplier
    const betType = getBetType(prediction);
    const payoutMultiplier = getPayoutMultiplier(betType);
    
    // Calculate winnings and update user data
    let winnings = 0;
    if (isWin) {
      winnings = betAmount * payoutMultiplier;
      db.addCash(user.id, winnings - betAmount); // Add winnings (minus the original bet)
      db.updateStats(user.id, 'roulette', 'win', betAmount, winnings);
    } else {
      db.removeCash(user.id, betAmount); // Remove the bet amount
      db.updateStats(user.id, 'roulette', 'loss', betAmount, 0);
    }
    
    // Create game embed
    const resultNumber = result === '00' ? 37 : parseInt(result);
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const resultColor = result === '0' || result === '00' ? 'Green' : (redNumbers.includes(resultNumber) ? 'Red' : 'Black');
    
    const gameEmbed = new EmbedBuilder()
      .setColor(isWin ? '#00ff00' : '#ff0000')
      .setTitle('Roulette')
      .setDescription(`The ball landed on **${result}** (${resultColor})!`)
      .addFields(
        { name: 'Your Bet', value: prediction, inline: true },
        { name: 'Result', value: isWin ? 'You won!' : 'You lost!', inline: true },
        { name: 'Bet Amount', value: formatter.formatCash(betAmount), inline: true },
        { name: isWin ? 'Winnings' : 'Loss', value: isWin ? formatter.formatCash(winnings) : formatter.formatCash(betAmount), inline: true },
        { name: 'New Balance', value: formatter.formatCash(user.cash), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Payout: ${payoutMultiplier}x` });
    
    // Send the embed
    await interaction.reply({ embeds: [gameEmbed] });
  }
};

const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and bet on the outcome')
    .addStringOption(option => 
      option.setName('choice')
        .setDescription('Choose heads or tails')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' }
        ))
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    // Check cooldown
    const cooldownInfo = cooldowns.checkCommandCooldown(interaction.user.id, 'coinflip');
    
    if (cooldownInfo.onCooldown) {
      return interaction.reply({
        content: `You need to wait ${cooldownInfo.formattedTime} before flipping another coin.`,
        ephemeral: true
      });
    }
    
    // Get user choice and bet
    const userChoice = interaction.options.getString('choice').toLowerCase();
    const betInput = interaction.options.getString('bet');
    
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
    cooldowns.setCommandCooldown(user.id, 'coinflip');
    
    // Flip the coin (50/50 chance)
    const outcomes = ['heads', 'tails'];
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    // Determine if the user won
    const isWin = userChoice === result;
    
    // Calculate winnings and update user data
    let winnings = 0;
    if (isWin) {
      winnings = betAmount * config.games.coinflip.winMultiplier;
      db.addCash(user.id, winnings - betAmount); // Add winnings (minus the original bet)
      db.updateStats(user.id, 'coinflip', 'win', betAmount, winnings);
    } else {
      db.removeCash(user.id, betAmount); // Remove the bet amount
      db.updateStats(user.id, 'coinflip', 'loss', betAmount, 0);
    }
    
    // Create game embed
    const gameEmbed = new EmbedBuilder()
      .setColor(isWin ? '#00ff00' : '#ff0000')
      .setTitle('Coin Flip')
      .setDescription(`The coin landed on **${result}**!`)
      .addFields(
        { name: 'Your Choice', value: userChoice, inline: true },
        { name: 'Result', value: isWin ? 'You won!' : 'You lost!', inline: true },
        { name: 'Bet', value: formatter.formatCash(betAmount), inline: true },
        { name: isWin ? 'Winnings' : 'Loss', value: isWin ? formatter.formatCash(winnings) : formatter.formatCash(betAmount), inline: true },
        { name: 'New Balance', value: formatter.formatCash(user.cash), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot' });
    
    // Add coin image
    if (result === 'heads') {
      gameEmbed.setThumbnail('https://i.imgur.com/HAvGDQP.png'); // Heads coin image
    } else {
      gameEmbed.setThumbnail('https://i.imgur.com/WUvU2HV.png'); // Tails coin image
    }
    
    // Send the embed
    await interaction.reply({ embeds: [gameEmbed] });
  }
};

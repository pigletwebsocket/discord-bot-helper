const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine')
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    // Check cooldown
    const cooldownInfo = cooldowns.checkCommandCooldown(interaction.user.id, 'slots');
    
    if (cooldownInfo.onCooldown) {
      return interaction.reply({
        content: `You need to wait ${cooldownInfo.formattedTime} before playing slots again.`,
        ephemeral: true
      });
    }
    
    // Get bet
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
    cooldowns.setCommandCooldown(user.id, 'slots');
    
    // Get symbols from config
    const { symbols, payouts } = config.games.slots;
    
    // Roll the slots
    const reels = [];
    for (let i = 0; i < 3; i++) {
      reels.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    
    // Check for win
    const isWin = reels[0] === reels[1] && reels[1] === reels[2];
    const result = reels.join('');
    
    // Calculate winnings and update user data
    let winnings = 0;
    if (isWin) {
      const multiplier = payouts[result] || 0;
      winnings = betAmount * multiplier;
      db.addCash(user.id, winnings - betAmount);
      db.updateStats(user.id, 'slots', 'win', betAmount, winnings);
    } else {
      db.removeCash(user.id, betAmount);
      db.updateStats(user.id, 'slots', 'loss', betAmount, 0);
    }
    
    // Create game embed
    const gameEmbed = new EmbedBuilder()
      .setColor(isWin ? '#00ff00' : '#ff0000')
      .setTitle('Slot Machine')
      .setDescription(`[ ${reels.join(' | ')} ]`)
      .addFields(
        { name: 'Result', value: isWin ? `You won! ${result} is a winning combination!` : 'You lost!', inline: false },
        { name: 'Bet', value: formatter.formatCash(betAmount), inline: true },
        { name: isWin ? 'Winnings' : 'Loss', value: isWin ? formatter.formatCash(winnings) : formatter.formatCash(betAmount), inline: true },
        { name: 'New Balance', value: formatter.formatCash(user.cash), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot' });
    
    // Send the embed
    await interaction.reply({ embeds: [gameEmbed] });
  }
};

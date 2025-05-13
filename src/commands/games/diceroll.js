const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diceroll')
    .setDescription('Roll a dice and bet on the outcome')
    .addStringOption(option => 
      option.setName('dicetype')
        .setDescription('Type of dice to roll')
        .setRequired(true)
        .addChoices(
          { name: 'D4 (4-sided)', value: 'd4' },
          { name: 'D6 (6-sided)', value: 'd6' },
          { name: 'D8 (8-sided)', value: 'd8' },
          { name: 'D10 (10-sided)', value: 'd10' },
          { name: 'D12 (12-sided)', value: 'd12' },
          { name: 'D20 (20-sided)', value: 'd20' }
        ))
    .addIntegerOption(option => 
      option.setName('prediction')
        .setDescription('Your prediction for the roll')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    // Check cooldown
    const cooldownInfo = cooldowns.checkCommandCooldown(interaction.user.id, 'diceroll');
    
    if (cooldownInfo.onCooldown) {
      return interaction.reply({
        content: `You need to wait ${cooldownInfo.formattedTime} before rolling another dice.`,
        ephemeral: true
      });
    }
    
    // Get dice type, prediction, and bet
    const diceType = interaction.options.getString('dicetype');
    const prediction = interaction.options.getInteger('prediction');
    const betInput = interaction.options.getString('bet');
    
    // Get max value for the dice type
    const diceValues = {
      'd4': 4,
      'd6': 6,
      'd8': 8,
      'd10': 10,
      'd12': 12,
      'd20': 20
    };
    
    const maxValue = diceValues[diceType];
    
    // Validate prediction
    if (prediction < 1 || prediction > maxValue) {
      return interaction.reply({
        content: `Your prediction must be between 1 and ${maxValue} for a ${diceType}.`,
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
    cooldowns.setCommandCooldown(user.id, 'diceroll');
    
    // Roll the dice
    const roll = Math.floor(Math.random() * maxValue) + 1;
    
    // Determine if the user won
    const isWin = prediction === roll;
    
    // Calculate winnings and update user data
    let winnings = 0;
    if (isWin) {
      winnings = Math.floor(betAmount * config.games.diceroll.multipliers[diceType]);
      db.addCash(user.id, winnings - betAmount); // Add winnings (minus the original bet)
      db.updateStats(user.id, 'diceroll', 'win', betAmount, winnings);
    } else {
      db.removeCash(user.id, betAmount); // Remove the bet amount
      db.updateStats(user.id, 'diceroll', 'loss', betAmount, 0);
    }
    
    // Create game embed
    const gameEmbed = new EmbedBuilder()
      .setColor(isWin ? '#00ff00' : '#ff0000')
      .setTitle(`Dice Roll - ${diceType.toUpperCase()}`)
      .setDescription(`You rolled a **${roll}**!`)
      .addFields(
        { name: 'Your Prediction', value: prediction.toString(), inline: true },
        { name: 'Dice Roll', value: roll.toString(), inline: true },
        { name: 'Result', value: isWin ? 'You won!' : 'You lost!', inline: true },
        { name: 'Bet', value: formatter.formatCash(betAmount), inline: true },
        { name: isWin ? 'Winnings' : 'Loss', value: isWin ? formatter.formatCash(winnings) : formatter.formatCash(betAmount), inline: true },
        { name: 'New Balance', value: formatter.formatCash(user.cash), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Odds: 1:${maxValue} | Payout: ${config.games.diceroll.multipliers[diceType]}x` });
    
    // Send the embed
    await interaction.reply({ embeds: [gameEmbed] });
  }
};

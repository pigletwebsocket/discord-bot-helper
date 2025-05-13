const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const achievements = require('../../utils/achievements');
const config = require('../../../config');

// Add RPS configuration to config if not already present
if (!config.games.rps) {
  config.games.rps = {
    odds: 1.5,            // Payout odds are 3:2, so 1.5x
    choices: ['rock', 'paper', 'scissors'],
    emojis: {
      rock: '🪨',
      paper: '📃',
      scissors: '✂️'
    },
    cooldown: 30 * 1000   // 30 seconds cooldown
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rockpaperscissors')
    .setDescription('Play Rock, Paper, Scissors against the bot')
    .addStringOption(option => 
      option.setName('selection')
        .setDescription('Your choice of Rock, Paper or Scissors')
        .setRequired(true)
        .addChoices(
          { name: 'Rock', value: 'rock' },
          { name: 'Paper', value: 'paper' },
          { name: 'Scissors', value: 'scissors' }
        ))
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    try {
      // Get user selection and bet
      const userChoice = interaction.options.getString('selection');
      const betInput = interaction.options.getString('bet');
      
      // Validate user choice
      if (!config.games.rps.choices.includes(userChoice)) {
        return interaction.reply({
          content: 'Invalid selection. Please choose Rock, Paper, or Scissors.',
          ephemeral: true
        });
      }
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'rps');
      
      if (cooldownInfo.onCooldown) {
        return interaction.reply({
          content: `You need to wait ${cooldownInfo.formattedTime} before playing Rock, Paper, Scissors again.`,
          ephemeral: true
        });
      }
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
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
      await cooldowns.setCommandCooldown(user.id, 'rps');
      
      // Bot randomly selects rock, paper, or scissors
      const botChoice = config.games.rps.choices[Math.floor(Math.random() * config.games.rps.choices.length)];
      
      // Determine winner
      let result = 'tie';
      if (userChoice === botChoice) {
        result = 'tie';
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = 'win';
      } else {
        result = 'lose';
      }
      
      // Create embed for result
      const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: 'Gamble Bot - Rock Paper Scissors' });
      
      // Process the result
      if (result === 'win') {
        const winnings = Math.floor(betAmount * config.games.rps.odds);
        
        // Update user cash and stats
        await db.addCash(user.id, winnings);
        await db.updateStats(user.id, 'rockpaperscissors', 'win', betAmount, betAmount + winnings);
        
        // Check for achievements
        const achievementsCompleted = await achievements.trackGamePlay(user.id, 'rockpaperscissors', betAmount, 'win', betAmount + winnings);
        
        embed.setColor('#00ff00')
          .setTitle('Rock Paper Scissors - You Won! 🎉')
          .setDescription(
            `You chose ${config.games.rps.emojis[userChoice]} **${userChoice}**\n` +
            `Bot chose ${config.games.rps.emojis[botChoice]} **${botChoice}**\n\n` +
            `${config.games.rps.emojis[userChoice]} beats ${config.games.rps.emojis[botChoice]}\n\n` +
            `Your bet: ${formatter.formatCash(betAmount)}\n` +
            `Winnings: ${formatter.formatCash(winnings)}\n` +
            `New balance: ${formatter.formatCash(user.cash + winnings)}`
          );
        
        // If achievements were completed, add a field to the embed
        if (achievementsCompleted.length > 0) {
          const achievementEmbed = achievements.createAchievementEmbed(achievementsCompleted);
          await interaction.reply({ embeds: [embed] });
          return interaction.followUp({ embeds: [achievementEmbed] });
        }
      } else if (result === 'lose') {
        // Update user cash and stats
        await db.removeCash(user.id, betAmount);
        await db.updateStats(user.id, 'rockpaperscissors', 'loss', betAmount, 0);
        
        // Check for achievements (for participation)
        await achievements.trackGamePlay(user.id, 'rockpaperscissors', betAmount, 'loss', 0);
        
        embed.setColor('#ff0000')
          .setTitle('Rock Paper Scissors - You Lost! 😢')
          .setDescription(
            `You chose ${config.games.rps.emojis[userChoice]} **${userChoice}**\n` +
            `Bot chose ${config.games.rps.emojis[botChoice]} **${botChoice}**\n\n` +
            `${config.games.rps.emojis[botChoice]} beats ${config.games.rps.emojis[userChoice]}\n\n` +
            `Your bet: ${formatter.formatCash(betAmount)}\n` +
            `You lost: ${formatter.formatCash(betAmount)}\n` +
            `New balance: ${formatter.formatCash(user.cash - betAmount)}`
          );
      } else {
        // Handle tie - return the bet
        embed.setColor('#ffff00')
          .setTitle('Rock Paper Scissors - It\'s a Tie! 🤝')
          .setDescription(
            `You chose ${config.games.rps.emojis[userChoice]} **${userChoice}**\n` +
            `Bot chose ${config.games.rps.emojis[botChoice]} **${botChoice}**\n\n` +
            `It's a tie! Your bet has been returned.\n\n` +
            `Your bet: ${formatter.formatCash(betAmount)}\n` +
            `Balance: ${formatter.formatCash(user.cash)}`
          );
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in Rock Paper Scissors command:', error);
      await interaction.reply({
        content: 'There was an error processing your game. Please try again later.',
        ephemeral: true
      });
    }
  }
};
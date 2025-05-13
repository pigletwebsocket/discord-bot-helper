const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to process
      await interaction.deferReply();
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'daily');
      
      if (cooldownInfo.onCooldown) {
        return interaction.editReply({
          content: `You've already claimed your daily reward! Try again in ${cooldownInfo.formattedTime}.`
        });
      }
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Add daily reward
      const reward = config.economy.dailyReward;
      const updatedUser = await db.addCash(user.id, reward);
      
      // Set cooldown
      await cooldowns.setCommandCooldown(user.id, 'daily');
      
      // Create reward embed
      const rewardEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Daily Reward Claimed!')
        .setDescription(`You received ${formatter.formatCash(reward)}!`)
        .addFields(
          { name: 'New Balance', value: formatter.formatCash(updatedUser.cash), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Gamble Bot' });
      
      // Send the embed
      await interaction.editReply({ embeds: [rewardEmbed] });
    } catch (error) {
      console.error('Error in daily command:', error);
      await interaction.editReply({ content: 'There was an error claiming your daily reward. Please try again later.' });
    }
  }
};

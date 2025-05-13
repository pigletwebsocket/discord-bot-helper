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
    // Check cooldown
    const cooldownInfo = cooldowns.checkCommandCooldown(interaction.user.id, 'daily');
    
    if (cooldownInfo.onCooldown) {
      return interaction.reply({
        content: `You've already claimed your daily reward! Try again in ${cooldownInfo.formattedTime}.`,
        ephemeral: true
      });
    }
    
    // Get user data
    const user = db.getUser(interaction.user.id, interaction.user.username);
    
    // Add daily reward
    const reward = config.economy.dailyReward;
    db.addCash(user.id, reward);
    
    // Set cooldown
    cooldowns.setCommandCooldown(user.id, 'daily');
    
    // Create reward embed
    const rewardEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Daily Reward Claimed!')
      .setDescription(`You received ${formatter.formatCash(reward)}!`)
      .addFields(
        { name: 'New Balance', value: formatter.formatCash(user.cash), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot' });
    
    // Send the embed
    await interaction.reply({ embeds: [rewardEmbed] });
  }
};

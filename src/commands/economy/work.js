const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

// Add work configuration to config if not already present
if (!config.economy) {
  config.economy = {
    workReward: {
      min: 100,
      max: 500
    },
    workCooldown: 10 * 60 * 1000, // 10 minutes
    workMessages: [
      "You worked as a dealer in a casino for {amount}.",
      "You fixed a slot machine and earned {amount}.",
      "You helped count cards and made {amount}.",
      "You cleaned the casino floor and received {amount}.",
      "You helped a whale gamble and got tipped {amount}.",
      "You served drinks at the poker table and earned {amount}.",
      "You guarded the casino vault and got paid {amount}.",
      "You organized a poker tournament and received {amount}.",
      "You repaired broken dice and got {amount}.",
      "You designed a new gambling game and earned {amount}."
    ]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn some cash (Available every 10 minutes)'),
  
  async execute(interaction) {
    try {
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'work');
      
      if (cooldownInfo.onCooldown) {
        return interaction.reply({
          content: `You need to wait ${cooldownInfo.formattedTime} before working again.`,
          ephemeral: true
        });
      }
      
      // Calculate reward
      const minReward = config.economy.workReward.min;
      const maxReward = config.economy.workReward.max;
      const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
      
      // Get random work message
      const messages = config.economy.workMessages;
      const message = messages[Math.floor(Math.random() * messages.length)];
      const formattedMessage = message.replace('{amount}', formatter.formatCash(reward));
      
      // Add cash to user
      await db.addCash(user.id, reward);
      
      // Set cooldown
      await cooldowns.setCommandCooldown(user.id, 'work');
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Work Completed')
        .setDescription(formattedMessage)
        .addFields(
          { name: 'Reward', value: formatter.formatCash(reward), inline: true },
          { name: 'New Balance', value: formatter.formatCash(user.cash + reward), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Next work available in 10 minutes' });
      
      // Send response
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in work command:', error);
      await interaction.reply({
        content: 'There was an error processing your work request. Please try again later.',
        ephemeral: true
      });
    }
  }
};
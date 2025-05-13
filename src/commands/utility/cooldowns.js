const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cooldowns')
    .setDescription('Check your command cooldowns')
    .addStringOption(option => 
      option.setName('mode')
        .setDescription('Display mode')
        .setRequired(false)
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Detailed', value: 'detailed' }
        )),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to process
      await interaction.deferReply();
      
      // Get display mode
      const mode = interaction.options.getString('mode') || 'normal';
      const isDetailed = mode === 'detailed';
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Get cooldowns
      const userCooldowns = await cooldowns.getUserCooldowns(user.id);
      
      // Create cooldown embed
      const cooldownEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Command Cooldowns')
        .setDescription(`Here are your current cooldowns, ${user.username}:`)
        .setTimestamp()
        .setFooter({ text: 'Gamble Bot' });
      
      // Group cooldowns by category
      const gameCommands = ['coinflip', 'blackjack', 'diceroll', 'slots', 'roulette'];
      const economyCommands = ['daily'];
      
      // Add game cooldowns
      let gameText = '';
      for (const command of gameCommands) {
        if (userCooldowns[command]) {
          const { onCooldown, formattedTime, formattedCooldownTime } = userCooldowns[command];
          
          if (isDetailed) {
            gameText += `**/${command}**: ${onCooldown ? `${formattedTime} remaining` : 'Ready!'} (Cooldown: ${formattedCooldownTime})\n`;
          } else {
            gameText += `**/${command}**: ${onCooldown ? `${formattedTime} remaining` : 'Ready!'}\n`;
          }
        }
      }
      
      if (gameText) {
        cooldownEmbed.addFields({ name: 'Games', value: gameText });
      }
      
      // Add economy cooldowns
      let economyText = '';
      for (const command of economyCommands) {
        if (userCooldowns[command]) {
          const { onCooldown, formattedTime, formattedCooldownTime } = userCooldowns[command];
          
          if (isDetailed) {
            economyText += `**/${command}**: ${onCooldown ? `${formattedTime} remaining` : 'Ready!'} (Cooldown: ${formattedCooldownTime})\n`;
          } else {
            economyText += `**/${command}**: ${onCooldown ? `${formattedTime} remaining` : 'Ready!'}\n`;
          }
        }
      }
      
      if (economyText) {
        cooldownEmbed.addFields({ name: 'Economy', value: economyText });
      }
      
      // Send the embed
      await interaction.editReply({ embeds: [cooldownEmbed] });
    } catch (error) {
      console.error('Error in cooldowns command:', error);
      await interaction.editReply({ content: 'There was an error checking your cooldowns. Please try again later.' });
    }
  }
};

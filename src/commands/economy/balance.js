const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your current balance'),
  
  async execute(interaction) {
    // Get user data from database
    const user = db.getUser(interaction.user.id, interaction.user.username);
    
    // Create balance embed
    const balanceEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${user.username}'s Balance`)
      .setDescription(`You currently have ${formatter.formatCash(user.cash)}`)
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot' });
    
    // Send the embed
    await interaction.reply({ embeds: [balanceEmbed] });
  }
};

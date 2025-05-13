const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your current balance'),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to fetch from the database
      await interaction.deferReply();
      
      // Get user data from database
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Create balance embed
      const balanceEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${user.username}'s Balance`)
        .setDescription(`You currently have ${formatter.formatCash(user.cash)}`)
        .setTimestamp()
        .setFooter({ text: 'Gamble Bot' });
      
      // Send the embed
      await interaction.editReply({ embeds: [balanceEmbed] });
    } catch (error) {
      console.error('Error in balance command:', error);
      await interaction.editReply({ content: 'There was an error checking your balance. Please try again later.' });
    }
  }
};

const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your gambling profile and statistics'),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to fetch from the database
      await interaction.deferReply();
      
      // Get user data from database
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Create profile embed
      const profileEmbed = formatter.createProfileEmbed(user);
      
      // Send the embed
      await interaction.editReply({ embeds: [profileEmbed] });
    } catch (error) {
      console.error('Error in profile command:', error);
      await interaction.editReply({ content: 'There was an error retrieving your profile. Please try again later.' });
    }
  }
};

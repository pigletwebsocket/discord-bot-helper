const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your gambling profile and statistics'),
  
  async execute(interaction) {
    // Get user data from database
    const user = db.getUser(interaction.user.id, interaction.user.username);
    
    // Create profile embed
    const profileEmbed = formatter.createProfileEmbed(user);
    
    // Send the embed
    await interaction.reply({ embeds: [profileEmbed] });
  }
};

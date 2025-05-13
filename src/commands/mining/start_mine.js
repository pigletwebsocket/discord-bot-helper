const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const miningDb = require('../../utils/miningDb');
const miningConfig = require('../../utils/miningConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start_mine')
    .setDescription('Start your mining career or rename your mine')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Name for your mine (defaults to your username)')
        .setRequired(false)),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const user = interaction.user;
      const mineName = interaction.options.getString('name') || user.username + "'s Mine";
      
      // Check if user already has a mine
      let mine;
      let isNewMine = false;
      
      try {
        mine = await miningDb.getMine(user.id, mineName);
      } catch (error) {
        // No mine exists, create one
        isNewMine = true;
        mine = await miningDb.createMine(user.id, mineName);
      }
      
      // If mine exists but user provided a new name, update it
      if (!isNewMine && mineName !== mine.name) {
        mine = await miningDb.updateMine(user.id, { name: mineName });
      }
      
      // Get user's units
      const units = await miningDb.getUnits(user.id);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(isNewMine ? '#00ff00' : '#0099ff')
        .setTitle(isNewMine ? '⛏️ Mine Created!' : '⛏️ Mine Updated')
        .setDescription(isNewMine 
          ? `Welcome to your new mining career, ${user.username}! Your mine "${mine.name}" has been created.`
          : `Your mine has been renamed to "${mine.name}".`)
        .addFields(
          { name: 'Mine Level', value: `${mine.level}`, inline: true },
          { name: 'Prestige', value: `${mine.prestige}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Use /dig to start mining!' });
      
      // Add units field if any exist
      if (units.length > 0) {
        const unitsInfo = units.map(unit => {
          const unitConfig = miningConfig.units[unit.unit_id];
          return `${unitConfig.name} (${unit.quantity}x) - Level ${unit.level}`;
        }).join('\\n');
        
        embed.addFields({ name: 'Units', value: unitsInfo, inline: false });
      }
      
      // Add help section
      if (isNewMine) {
        embed.addFields({
          name: 'Getting Started',
          value: 
            '1. Use `/dig` to collect resources\\n' +
            '2. Use `/process` to process unprocessed materials for rare resources\\n' +
            '3. Use `/craft` to create packs for upgrading\\n' +
            '4. Use `/mine` to view mine stats and shop\\n' +
            '5. Buy units with `/mine buy <quantity> <unit_id>`\\n' +
            '6. Upgrade units with `/upgrade miner <unit_id> <levels>`',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in start_mine command:', error);
      await interaction.editReply({
        content: 'There was an error starting your mine. Please try again later.'
      });
    }
  }
};
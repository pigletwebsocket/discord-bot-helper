const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const miningDb = require('../../utils/miningDb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mining_inventory')
    .setDescription('View your mining inventory and resources')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('Category of items to view')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Resources', value: 'resources' },
          { name: 'Parts', value: 'parts' },
          { name: 'Packs', value: 'packs' }
        )),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const user = interaction.user;
      const category = interaction.options.getString('category') || 'all';
      
      // Get user's mine
      let mine;
      try {
        mine = await miningDb.getMine(user.id, user.username);
      } catch (error) {
        // No mine exists
        return interaction.editReply({
          content: 'You don\'t have a mine yet! Use `/start_mine` to create one.'
        });
      }
      
      // Get resources
      const resources = await miningDb.getResources(user.id);
      
      // Get crafting items
      const craftingItems = await miningDb.getCraftingItems(user.id);
      
      // Filter items based on category
      const filteredResources = category === 'all' || category === 'resources' 
        ? resources.filter(r => ['coal', 'iron', 'gold', 'diamond', 'emerald', 'redstone', 'lapis'].includes(r.resource_id))
        : [];
      
      const filteredParts = category === 'all' || category === 'parts' 
        ? craftingItems.filter(i => i.item_id.endsWith('_part'))
        : [];
      
      const filteredPacks = category === 'all' || category === 'packs' 
        ? craftingItems.filter(i => i.item_id.endsWith('_pack'))
        : [];
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${user.username}'s Mining Inventory`)
        .setDescription(`Your mining inventory for "${mine.name}"`)
        .setTimestamp()
        .setFooter({ text: 'Use /dig to collect more resources' });
      
      // Add unprocessed materials
      if (category === 'all' || category === 'resources') {
        embed.addFields({ 
          name: '📦 Unprocessed Materials', 
          value: `${mine.unprocessed_materials}`,
          inline: true
        });
      }
      
      // Add resources section
      if (filteredResources.length > 0) {
        let resourcesText = '';
        for (const resource of filteredResources) {
          const resourceName = getResourceName(resource.resource_id);
          const emoji = getResourceEmoji(resource.resource_id);
          if (resource.quantity > 0) {
            resourcesText += `${emoji} **${resourceName}**: ${resource.quantity}\n`;
          }
        }
        
        if (resourcesText) {
          embed.addFields({ name: '🪨 Resources', value: resourcesText, inline: false });
        }
      }
      
      // Add parts section
      if (filteredParts.length > 0) {
        let partsText = '';
        for (const part of filteredParts) {
          const partName = getResourceName(part.item_id);
          const emoji = getResourceEmoji(part.item_id);
          if (part.quantity > 0) {
            partsText += `${emoji} **${partName}**: ${part.quantity}\n`;
          }
        }
        
        if (partsText) {
          embed.addFields({ name: '🔧 Parts', value: partsText, inline: false });
        }
      }
      
      // Add packs section
      if (filteredPacks.length > 0) {
        let packsText = '';
        for (const pack of filteredPacks) {
          const packName = getResourceName(pack.item_id);
          const emoji = getResourceEmoji(pack.item_id);
          if (pack.quantity > 0) {
            packsText += `${emoji} **${packName}**: ${pack.quantity}\n`;
          }
        }
        
        if (packsText) {
          embed.addFields({ name: '📦 Packs', value: packsText, inline: false });
        }
      }
      
      // If inventory is empty
      if (!embed.data.fields || embed.data.fields.length === 0) {
        embed.setDescription('Your mining inventory is empty. Use `/dig` to start collecting resources!');
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in inventory command:', error);
      await interaction.editReply({
        content: 'There was an error retrieving your inventory. Please try again later.'
      });
    }
  }
};

// Helper function to get resource name
function getResourceName(resourceId) {
  const resourceNames = {
    coal: 'Coal',
    iron: 'Iron',
    gold: 'Gold',
    diamond: 'Diamond',
    emerald: 'Emerald',
    redstone: 'Redstone',
    lapis: 'Lapis Lazuli',
    unprocessedMaterials: 'Unprocessed Materials',
    tech_part: 'Tech Part',
    utility_part: 'Utility Part',
    production_part: 'Production Part',
    tech_pack: 'Tech Pack',
    utility_pack: 'Utility Pack',
    production_pack: 'Production Pack'
  };
  
  return resourceNames[resourceId] || resourceId;
}

// Helper function to get resource emoji
function getResourceEmoji(resourceId) {
  const resourceEmojis = {
    coal: '🪨',
    iron: '⚙️',
    gold: '💰',
    diamond: '💎',
    emerald: '📗',
    redstone: '🔴',
    lapis: '🔷',
    unprocessedMaterials: '📦',
    tech_part: '🔌',
    utility_part: '🔧',
    production_part: '⚒️',
    tech_pack: '📟',
    utility_pack: '🧰',
    production_pack: '🏭'
  };
  
  return resourceEmojis[resourceId] || '❓';
}
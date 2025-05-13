const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const miningDb = require('../../utils/miningDb');
const miningConfig = require('../../utils/miningConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Craft packs for mining upgrades and units')
    .addStringOption(option => 
      option.setName('pack')
        .setDescription('The pack to craft')
        .setRequired(false)
        .addChoices(
          { name: 'Tech Pack', value: 'tech_pack' },
          { name: 'Utility Pack', value: 'utility_pack' },
          { name: 'Production Pack', value: 'production_pack' }
        ))
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('The amount to craft')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const user = interaction.user;
      
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
      
      const packId = interaction.options.getString('pack');
      
      // If no pack specified, show crafting menu
      if (!packId) {
        await showCraftingMenu(interaction, user, mine);
        return;
      }
      
      const amount = interaction.options.getInteger('amount') || 1;
      
      // Craft the specified pack
      await craftPack(interaction, user, mine, packId, amount);
      
    } catch (error) {
      console.error('Error in craft command:', error);
      await interaction.editReply({
        content: 'There was an error processing your crafting request. Please try again later.'
      });
    }
  }
};

// Show crafting menu
async function showCraftingMenu(interaction, user, mine) {
  try {
    // Get user's resources
    const resources = await miningDb.getResources(user.id);
    const resourceMap = {};
    for (const resource of resources) {
      resourceMap[resource.resource_id] = resource.quantity;
    }
    
    // Get user's crafting items
    const craftingItems = await miningDb.getCraftingItems(user.id);
    const craftingMap = {};
    for (const item of craftingItems) {
      craftingMap[item.item_id] = item.quantity;
    }
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🔨 Crafting Menu')
      .setDescription(`Welcome to the crafting menu, ${user.username}!\nCraft packs to upgrade your mining operations.`)
      .setTimestamp()
      .setFooter({ text: 'Use /craft <pack> <amount> to craft packs' });
    
    // Add packs section
    let packsText = '';
    for (const [packId, packConfig] of Object.entries(miningConfig.crafting)) {
      packsText += `${getResourceEmoji(packId)} **${packConfig.name}** (\`${packId}\`)\n`;
      packsText += `${packConfig.description}\n`;
      
      // Add components
      packsText += '**Components Required:**\n';
      for (const [componentId, amount] of Object.entries(packConfig.components)) {
        const componentName = getResourceName(componentId);
        const userHas = (componentId in resourceMap) ? resourceMap[componentId] : 
                         (componentId in craftingMap) ? craftingMap[componentId] : 0;
        
        const emoji = userHas >= amount ? '✅' : '❌';
        packsText += `${emoji} ${amount}x ${componentName} (You have: ${userHas})\n`;
      }
      
      // Calculate max craftable
      const maxCraftable = calculateMaxCraftable(packConfig.components, resourceMap, craftingMap);
      packsText += `\nYou can craft up to ${maxCraftable} ${packConfig.name}${maxCraftable !== 1 ? 's' : ''}\n\n`;
    }
    
    embed.addFields({ name: 'Available Packs', value: packsText, inline: false });
    
    // Add user's crafted packs
    let craftedPacksText = '';
    for (const item of craftingItems) {
      if (item.item_id.endsWith('_pack') && item.quantity > 0) {
        const packName = getResourceName(item.item_id);
        craftedPacksText += `${getResourceEmoji(item.item_id)} **${packName}**: ${item.quantity}\n`;
      }
    }
    
    if (craftedPacksText) {
      embed.addFields({ name: 'Your Crafted Packs', value: craftedPacksText, inline: false });
    } else {
      embed.addFields({ name: 'Your Crafted Packs', value: 'You haven\'t crafted any packs yet.', inline: false });
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing crafting menu:', error);
    throw error;
  }
}

// Craft a pack
async function craftPack(interaction, user, mine, packId, amount) {
  try {
    // Check if pack exists
    const packConfig = miningConfig.crafting[packId];
    if (!packConfig) {
      return interaction.editReply({
        content: 'Invalid pack ID. Use `/craft` to see available packs.'
      });
    }
    
    // Get user's resources
    const resources = await miningDb.getResources(user.id);
    const resourceMap = {};
    for (const resource of resources) {
      resourceMap[resource.resource_id] = resource.quantity;
    }
    
    // Get user's crafting items
    const craftingItems = await miningDb.getCraftingItems(user.id);
    const craftingMap = {};
    for (const item of craftingItems) {
      craftingMap[item.item_id] = item.quantity;
    }
    
    // Calculate total components needed
    const componentsNeeded = {};
    for (const [componentId, componentAmount] of Object.entries(packConfig.components)) {
      componentsNeeded[componentId] = componentAmount * amount;
    }
    
    // Check if user has enough components
    for (const [componentId, neededAmount] of Object.entries(componentsNeeded)) {
      const userHas = (componentId in resourceMap) ? resourceMap[componentId] : 
                       (componentId in craftingMap) ? craftingMap[componentId] : 0;
      
      if (userHas < neededAmount) {
        return interaction.editReply({
          content: `You don't have enough ${getResourceName(componentId)}. You need ${neededAmount} but only have ${userHas}.`
        });
      }
    }
    
    // All requirements met, process crafting
    
    // Remove components
    for (const [componentId, neededAmount] of Object.entries(componentsNeeded)) {
      if (componentId in resourceMap) {
        await miningDb.removeResource(user.id, componentId, neededAmount);
      } else if (componentId in craftingMap) {
        await miningDb.removeCraftingItem(user.id, componentId, neededAmount);
      }
    }
    
    // Add crafted pack
    await miningDb.addCraftingItem(user.id, packId, amount);
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Crafting Successful')
      .setDescription(`You crafted ${amount}x ${packConfig.name}!`)
      .setTimestamp()
      .setFooter({ text: 'Use /mine shop to buy units with your packs' });
    
    // Add components used
    let componentsText = '';
    for (const [componentId, neededAmount] of Object.entries(componentsNeeded)) {
      componentsText += `${neededAmount}x ${getResourceName(componentId)}\n`;
    }
    
    embed.addFields({ name: 'Components Used', value: componentsText, inline: false });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error crafting pack:', error);
    throw error;
  }
}

// Calculate maximum craftable amount
function calculateMaxCraftable(components, resourceMap, craftingMap) {
  let maxCraftable = Infinity;
  
  for (const [componentId, amount] of Object.entries(components)) {
    const userHas = (componentId in resourceMap) ? resourceMap[componentId] : 
                     (componentId in craftingMap) ? craftingMap[componentId] : 0;
    
    const craftableWithComponent = Math.floor(userHas / amount);
    maxCraftable = Math.min(maxCraftable, craftableWithComponent);
  }
  
  return maxCraftable;
}

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
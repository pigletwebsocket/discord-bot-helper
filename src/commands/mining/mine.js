const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const miningDb = require('../../utils/miningDb');
const miningConfig = require('../../utils/miningConfig');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('View your mine information or shop')
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View your mine information'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('shop')
        .setDescription('View the mining shop'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('buy')
        .setDescription('Buy mining units')
        .addIntegerOption(option =>
          option.setName('quantity')
            .setDescription('Quantity to buy')
            .setRequired(true)
            .setMinValue(1))
        .addStringOption(option =>
          option.setName('unit_id')
            .setDescription('The ID of the unit to buy')
            .setRequired(true)
            .addChoices(
              { name: 'Miner', value: 'miner' },
              { name: 'Excavator', value: 'excavator' },
              { name: 'Driller', value: 'driller' },
              { name: 'Processor', value: 'processor' },
              { name: 'Collector', value: 'collector' }
            ))),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const user = interaction.user;
      const subcommand = interaction.options.getSubcommand();
      
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
      
      // Handle subcommands
      if (subcommand === 'info') {
        await showMineInfo(interaction, user, mine);
      } else if (subcommand === 'shop') {
        await showMineShop(interaction, user, mine);
      } else if (subcommand === 'buy') {
        const quantity = interaction.options.getInteger('quantity');
        const unitId = interaction.options.getString('unit_id');
        await buyUnit(interaction, user, mine, unitId, quantity);
      }
      
    } catch (error) {
      console.error('Error in mine command:', error);
      await interaction.editReply({
        content: 'There was an error processing your request. Please try again later.'
      });
    }
  }
};

// Show mine information
async function showMineInfo(interaction, user, mine) {
  try {
    // Get resources
    const resources = await miningDb.getResources(user.id);
    
    // Get units
    const units = await miningDb.getUnits(user.id);
    
    // Get crafting items
    const craftingItems = await miningDb.getCraftingItems(user.id);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`⛏️ ${mine.name}`)
      .addFields(
        { name: 'Mine Level', value: `${mine.level}`, inline: true },
        { name: 'Prestige', value: `${mine.prestige}`, inline: true },
        { name: 'Unprocessed Materials', value: `${mine.unprocessed_materials}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Use /dig to collect more resources' });
    
    // Add resources section
    let resourcesText = '';
    for (const resource of resources) {
      const resourceName = getResourceName(resource.resource_id);
      const emoji = getResourceEmoji(resource.resource_id);
      resourcesText += `${emoji} **${resourceName}**: ${resource.quantity}\n`;
    }
    
    if (resourcesText) {
      embed.addFields({ name: 'Resources', value: resourcesText, inline: false });
    }
    
    // Add units section
    let unitsText = '';
    for (const unit of units) {
      const unitConfig = miningConfig.units[unit.unit_id];
      if (unitConfig) {
        unitsText += `${getUnitEmoji(unit.unit_id)} **${unitConfig.name}**: ${unit.quantity}x (Level ${unit.level})\n`;
      }
    }
    
    if (unitsText) {
      embed.addFields({ name: 'Units', value: unitsText, inline: false });
    }
    
    // Add crafting items section
    let craftingText = '';
    for (const item of craftingItems) {
      if (item.quantity > 0) {
        const itemName = getResourceName(item.item_id);
        const emoji = getResourceEmoji(item.item_id);
        craftingText += `${emoji} **${itemName}**: ${item.quantity}\n`;
      }
    }
    
    if (craftingText) {
      embed.addFields({ name: 'Crafting Materials', value: craftingText, inline: false });
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing mine info:', error);
    throw error;
  }
}

// Show mine shop
async function showMineShop(interaction, user, mine) {
  try {
    // Get user data for cash check
    const userData = await db.getUser(user.id, user.username);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('⛏️ Mining Shop')
      .setDescription(`Welcome to the mining shop, ${user.username}!\nYou have ${formatter.formatCash(userData.cash)} cash.`)
      .setTimestamp()
      .setFooter({ text: 'Use /mine buy <quantity> <unit_id> to purchase units' });
    
    // Add units section
    let unitsText = '';
    for (const [unitId, unitConfig] of Object.entries(miningConfig.units)) {
      unitsText += `${getUnitEmoji(unitId)} **${unitConfig.name}** (\`${unitId}\`)\n`;
      unitsText += `${unitConfig.description}\n`;
      
      // Add cost info
      let costText = '';
      if (unitConfig.baseCost.cash) {
        costText += `${formatter.formatCash(unitConfig.baseCost.cash)} cash`;
      }
      
      if (unitConfig.baseCost.packs) {
        for (const [packId, packQuantity] of Object.entries(unitConfig.baseCost.packs)) {
          const packName = getResourceName(packId);
          costText += `, ${packQuantity}x ${packName}`;
        }
      }
      
      unitsText += `Cost: ${costText}\n\n`;
    }
    
    embed.addFields({ name: 'Available Units', value: unitsText, inline: false });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing mine shop:', error);
    throw error;
  }
}

// Buy mining units
async function buyUnit(interaction, user, mine, unitId, quantity) {
  try {
    // Check if unit exists
    const unitConfig = miningConfig.units[unitId];
    if (!unitConfig) {
      return interaction.editReply({
        content: 'Invalid unit ID. Use `/mine shop` to see available units.'
      });
    }
    
    // Get user data for cash check
    const userData = await db.getUser(user.id, user.username);
    
    // Calculate total cost
    let totalCashCost = 0;
    const requiredPacks = {};
    
    for (let i = 0; i < quantity; i++) {
      const multiplier = Math.pow(unitConfig.costMultiplier, i);
      totalCashCost += unitConfig.baseCost.cash * multiplier;
      
      // Calculate pack costs
      if (unitConfig.baseCost.packs) {
        for (const [packId, packQuantity] of Object.entries(unitConfig.baseCost.packs)) {
          requiredPacks[packId] = (requiredPacks[packId] || 0) + packQuantity;
        }
      }
    }
    
    totalCashCost = Math.floor(totalCashCost);
    
    // Check if user has enough cash
    if (userData.cash < totalCashCost) {
      return interaction.editReply({
        content: `You don't have enough cash. You need ${formatter.formatCash(totalCashCost)} but only have ${formatter.formatCash(userData.cash)}.`
      });
    }
    
    // Check if user has required packs
    for (const [packId, packQuantity] of Object.entries(requiredPacks)) {
      const userPack = await miningDb.getCraftingItem(user.id, packId);
      if (userPack.quantity < packQuantity) {
        return interaction.editReply({
          content: `You don't have enough ${getResourceName(packId)}. You need ${packQuantity} but only have ${userPack.quantity}.`
        });
      }
    }
    
    // All requirements met, process purchase
    
    // Remove cash
    await db.removeCash(user.id, totalCashCost);
    
    // Remove packs
    for (const [packId, packQuantity] of Object.entries(requiredPacks)) {
      await miningDb.removeCraftingItem(user.id, packId, packQuantity);
    }
    
    // Add units
    await miningDb.addUnit(user.id, unitId, quantity);
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Purchase Successful')
      .setDescription(`You bought ${quantity}x ${unitConfig.name}!`)
      .addFields(
        { name: 'Cost', value: `${formatter.formatCash(totalCashCost)} cash`, inline: true },
        { name: 'New Balance', value: formatter.formatCash(userData.cash - totalCashCost), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Use /dig to start mining with your new units' });
    
    // Add packs used if any
    if (Object.keys(requiredPacks).length > 0) {
      let packsText = '';
      for (const [packId, packQuantity] of Object.entries(requiredPacks)) {
        packsText += `${packQuantity}x ${getResourceName(packId)}\n`;
      }
      
      embed.addFields({ name: 'Packs Used', value: packsText, inline: false });
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error buying unit:', error);
    throw error;
  }
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

// Helper function to get unit emoji
function getUnitEmoji(unitId) {
  const unitEmojis = {
    miner: '👷',
    excavator: '🚜',
    driller: '🔨',
    processor: '🔬',
    collector: '🧲'
  };
  
  return unitEmojis[unitId] || '❓';
}
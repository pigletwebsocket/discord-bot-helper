const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const miningDb = require('../../utils/miningDb');
const miningConfig = require('../../utils/miningConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('process')
    .setDescription('Process unprocessed materials into rare resources'),
  
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
      
      // Check if user has unprocessed materials
      if (mine.unprocessed_materials <= 0) {
        return interaction.editReply({
          content: 'You don\'t have any unprocessed materials to process. Use `/dig` to find some!'
        });
      }
      
      // Get user's units
      const units = await miningDb.getUnits(user.id);
      
      // Calculate processing multipliers based on units and upgrades
      const multipliers = calculateProcessingMultipliers(units, mine);
      
      // Process unprocessed materials into resources
      const resources = processResources(mine.unprocessed_materials, multipliers);
      
      // Reset unprocessed materials
      await miningDb.updateMine(user.id, { unprocessed_materials: 0 });
      
      // Add resources to user
      const updatedResources = {};
      for (const [resource, amount] of Object.entries(resources)) {
        if (amount > 0) {
          const result = await miningDb.addResource(user.id, resource, amount);
          updatedResources[resource] = amount;
        }
      }
      
      // Check for parts
      const partsFound = generateParts(mine.unprocessed_materials, multipliers);
      for (const [part, amount] of Object.entries(partsFound)) {
        if (amount > 0) {
          await miningDb.addCraftingItem(user.id, part, amount);
          updatedResources[part] = amount;
        }
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔧 Processing Results')
        .setDescription(`You processed ${mine.unprocessed_materials} unprocessed materials and found:`)
        .setTimestamp()
        .setFooter({ text: 'Use /dig to collect more resources' });
      
      // Add resources to embed
      let resourcesText = '';
      for (const [resource, amount] of Object.entries(updatedResources)) {
        if (amount > 0) {
          const resourceName = getResourceName(resource);
          const emoji = getResourceEmoji(resource);
          resourcesText += `${emoji} **${resourceName}**: ${amount}\n`;
        }
      }
      
      // If no resources were found
      if (resourcesText === '') {
        resourcesText = 'Nothing. Better luck next time!';
      }
      
      embed.addFields({ name: 'Resources Found', value: resourcesText, inline: false });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in process command:', error);
      await interaction.editReply({
        content: 'There was an error processing your materials. Please try again later.'
      });
    }
  }
};

// Calculate processing multipliers based on units and upgrades
function calculateProcessingMultipliers(units, mine) {
  const multipliers = {
    processing: 1,
    global: 1
  };
  
  // Apply prestige bonus
  const prestigeBonus = mine.prestige * miningConfig.prestige.rewards.globalMultiplier;
  multipliers.global = 1 + prestigeBonus;
  
  // Apply unit effects
  for (const unit of units) {
    const unitConfig = miningConfig.units[unit.unit_id];
    if (!unitConfig) continue;
    
    const unitEffect = unitConfig.effect;
    const effectStrength = Math.pow(unitEffect.multiplier, unit.level);
    
    if (unitEffect.type === 'processing') {
      // Processing boost
      multipliers.processing *= 1 + (effectStrength - 1) * unit.quantity;
    } else if (unitEffect.type === 'global') {
      // Global production boost
      multipliers.global *= effectStrength;
    }
  }
  
  return multipliers;
}

// Process unprocessed materials into rare resources
function processResources(umAmount, multipliers) {
  const resources = {
    diamond: 0,
    emerald: 0,
    redstone: 0,
    lapis: 0
  };
  
  // Process each UM
  for (let i = 0; i < umAmount; i++) {
    for (const [resource, config] of Object.entries(miningConfig.mine.processYield)) {
      // Apply processing multiplier to chance
      const processingChance = config.chance * multipliers.processing;
      
      // Check if resource is found
      if (Math.random() < processingChance) {
        const amount = Math.floor(
          (Math.random() * (config.max - config.min + 1) + config.min) *
          multipliers.global
        );
        resources[resource] += amount;
      }
    }
  }
  
  return resources;
}

// Generate parts from processing
function generateParts(umAmount, multipliers) {
  const parts = {
    tech_part: 0,
    utility_part: 0,
    production_part: 0
  };
  
  // Check each part
  for (const [partId, partConfig] of Object.entries(miningConfig.parts)) {
    // Only consider parts that can be found from unprocessed materials
    if (partConfig.foundFrom.includes('unprocessedMaterials')) {
      // Process each UM
      for (let i = 0; i < umAmount; i++) {
        const chance = partConfig.chance * multipliers.processing;
        if (Math.random() < chance) {
          parts[partId] += 1;
        }
      }
    }
  }
  
  return parts;
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
    production_part: 'Production Part'
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
    production_part: '⚒️'
  };
  
  return resourceEmojis[resourceId] || '❓';
}
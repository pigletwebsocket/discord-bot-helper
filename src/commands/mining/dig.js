const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const miningDb = require('../../utils/miningDb');
const miningConfig = require('../../utils/miningConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dig')
    .setDescription('Dig in your mine to collect resources'),
  
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
      
      // Check dig cooldown
      const now = new Date();
      const lastDig = mine.last_dig ? new Date(mine.last_dig) : null;
      
      if (lastDig) {
        const timeSinceLastDig = now - lastDig;
        const cooldown = miningConfig.mine.digCooldown;
        
        if (timeSinceLastDig < cooldown) {
          const remainingTime = cooldown - timeSinceLastDig;
          const remainingSeconds = Math.ceil(remainingTime / 1000);
          
          return interaction.editReply({
            content: `You need to wait ${remainingSeconds} seconds before digging again.`
          });
        }
      }
      
      // Get user's units
      const units = await miningDb.getUnits(user.id);
      
      // Calculate production multipliers based on units and upgrades
      const multipliers = calculateMultipliers(units, mine);
      
      // Generate resources from dig
      const resources = generateResources(multipliers);
      
      // Update last dig time
      await miningDb.updateMine(user.id, { last_dig: now });
      
      // Add resources to user
      const updatedResources = {};
      for (const [resource, amount] of Object.entries(resources)) {
        if (amount > 0) {
          if (resource === 'unprocessedMaterials') {
            await miningDb.updateMine(user.id, { unprocessed_materials: mine.unprocessed_materials + amount });
            updatedResources[resource] = amount;
          } else {
            const result = await miningDb.addResource(user.id, resource, amount);
            updatedResources[resource] = amount;
          }
        }
      }
      
      // Check for parts
      const partsFound = generateParts(multipliers);
      for (const [part, amount] of Object.entries(partsFound)) {
        if (amount > 0) {
          await miningDb.addCraftingItem(user.id, part, amount);
          updatedResources[part] = amount;
        }
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('⛏️ Mining Results')
        .setDescription(`You dig in your mine "${mine.name}" and found:`)
        .setTimestamp()
        .setFooter({ text: 'Use /process to process your unprocessed materials' });
      
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
      
      // Add unprocessed materials info
      if (updatedResources.unprocessedMaterials && updatedResources.unprocessedMaterials > 0) {
        const totalUM = mine.unprocessed_materials + updatedResources.unprocessedMaterials;
        embed.addFields({
          name: 'Unprocessed Materials',
          value: `You now have ${totalUM} unprocessed materials. Use \`/process\` to process them into rare resources!`,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in dig command:', error);
      await interaction.editReply({
        content: 'There was an error while digging. Please try again later.'
      });
    }
  }
};

// Calculate production multipliers based on units and upgrades
function calculateMultipliers(units, mine) {
  const multipliers = {
    coal: 1,
    iron: 1,
    gold: 1,
    unprocessedMaterials: 1,
    global: 1,
    umChance: 1,
    partChance: 1
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
    
    if (unitEffect.type === 'resource') {
      // Specific resource boost
      multipliers[unitEffect.resource] *= 1 + (effectStrength - 1) * unit.quantity;
    } else if (unitEffect.type === 'processing') {
      // Processing boost
      multipliers.processing = multipliers.processing || 1;
      multipliers.processing *= 1 + (effectStrength - 1) * unit.quantity;
    } else if (unitEffect.type === 'umChance') {
      // Unprocessed materials chance boost
      multipliers.umChance *= 1 + (effectStrength - 1) * unit.quantity;
    } else if (unitEffect.type === 'global') {
      // Global production boost
      multipliers.global *= effectStrength;
    }
  }
  
  return multipliers;
}

// Generate resources from a dig
function generateResources(multipliers) {
  const resources = {
    coal: 0,
    iron: 0,
    gold: 0,
    unprocessedMaterials: 0
  };
  
  // Generate coal
  const coalConfig = miningConfig.mine.digYield.coal;
  resources.coal = Math.floor(
    (Math.random() * (coalConfig.max - coalConfig.min + 1) + coalConfig.min) *
    multipliers.coal *
    multipliers.global
  );
  
  // Generate iron
  const ironConfig = miningConfig.mine.digYield.iron;
  resources.iron = Math.floor(
    (Math.random() * (ironConfig.max - ironConfig.min + 1) + ironConfig.min) *
    multipliers.iron *
    multipliers.global
  );
  
  // Generate gold
  const goldConfig = miningConfig.mine.digYield.gold;
  resources.gold = Math.floor(
    (Math.random() * (goldConfig.max - goldConfig.min + 1) + goldConfig.min) *
    multipliers.gold *
    multipliers.global
  );
  
  // Generate unprocessed materials
  const umConfig = miningConfig.mine.digYield.unprocessedMaterials;
  const umChance = umConfig.chance * multipliers.umChance;
  if (Math.random() < umChance) {
    resources.unprocessedMaterials = Math.floor(
      (Math.random() * (umConfig.max - umConfig.min + 1) + umConfig.min) *
      multipliers.global
    );
  }
  
  return resources;
}

// Generate parts while digging
function generateParts(multipliers) {
  const parts = {
    tech_part: 0,
    utility_part: 0,
    production_part: 0
  };
  
  // Check each part
  for (const [partId, partConfig] of Object.entries(miningConfig.parts)) {
    // Only consider parts that can be found from digging
    if (partConfig.foundFrom.includes('dig')) {
      const chance = partConfig.chance * (multipliers.partChance || 1);
      if (Math.random() < chance) {
        parts[partId] += 1;
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
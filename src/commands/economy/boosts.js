const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

// Define boost constants
const BOOST_TYPES = {
  CASH: 'cash_boost',
  XP: 'xp_boost'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boosts')
    .setDescription('View and activate your boosts')
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Show your available boosts'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('use')
        .setDescription('Activate a boost')
        .addStringOption(option =>
          option.setName('boost')
            .setDescription('The boost to activate')
            .setRequired(true)
            .addChoices(
              { name: 'Small Cash Boost', value: 'cash_boost_small' },
              { name: 'Medium Cash Boost', value: 'cash_boost_medium' },
              { name: 'Large Cash Boost', value: 'cash_boost_large' },
              { name: 'Small XP Boost', value: 'xp_boost_small' },
              { name: 'Medium XP Boost', value: 'xp_boost_medium' }
            ))
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('How many boosts to activate')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10))),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'show') {
        // Show available boosts
        await showBoosts(interaction, user);
      } else if (subcommand === 'use') {
        // Use a boost
        const boostId = interaction.options.getString('boost');
        const amount = interaction.options.getInteger('amount') || 1;
        
        await useBoost(interaction, user, boostId, amount);
      }
      
    } catch (error) {
      console.error('Error in boosts command:', error);
      await interaction.editReply({
        content: 'There was an error processing your request. Please try again later.'
      });
    }
  }
};

// Show user's available boosts
async function showBoosts(interaction, user) {
  try {
    // Get boosts from inventory
    const boostsResult = await db.db.query(`
      SELECT i.item_id, i.quantity, i.purchased_at
      FROM inventory i
      WHERE i.user_id = $1 AND i.item_id LIKE '%boost%'
    `, [user.id]);
    
    // Get active boosts
    const activeBoostsResult = await db.db.query(`
      SELECT *
      FROM active_boosts
      WHERE user_id = $1
    `, [user.id]);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`${user.username}'s Boosts`)
      .setTimestamp()
      .setFooter({ text: `Use "/boosts use <boost_name>" to activate a boost` });
    
    // Add active boosts section
    if (activeBoostsResult.rows.length > 0) {
      let activeBoostsText = '';
      
      for (const boost of activeBoostsResult.rows) {
        const now = new Date();
        const expiresAt = new Date(boost.expires_at);
        const timeRemaining = expiresAt - now;
        
        if (timeRemaining <= 0) {
          // Remove expired boosts
          await db.db.query(`
            DELETE FROM active_boosts
            WHERE id = $1
          `, [boost.id]);
          continue;
        }
        
        // Format time remaining
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        const boostName = getBoostName(boost.boost_id);
        const boostType = boost.boost_type === BOOST_TYPES.CASH ? 'Cash' : 'XP';
        const multiplier = (boost.multiplier * 100) - 100;
        
        activeBoostsText += `**${boostName}**\n` +
                            `Type: ${boostType}\n` +
                            `Bonus: +${multiplier}%\n` +
                            `Time remaining: ${hours}h ${minutes}m\n\n`;
      }
      
      if (activeBoostsText) {
        embed.addFields({ name: '🔥 Active Boosts', value: activeBoostsText, inline: false });
      }
    }
    
    // Add available boosts section
    if (boostsResult.rows.length > 0) {
      let availableBoostsText = '';
      
      for (const boost of boostsResult.rows) {
        const boostName = getBoostName(boost.item_id);
        const purchaseDate = new Date(boost.purchased_at).toLocaleDateString();
        
        availableBoostsText += `**${boostName}** - ${boost.quantity}x\n` +
                              `Purchased: ${purchaseDate}\n\n`;
      }
      
      if (availableBoostsText) {
        embed.addFields({ name: '📦 Available Boosts', value: availableBoostsText, inline: false });
      }
    }
    
    // If no boosts at all
    if (boostsResult.rows.length === 0 && activeBoostsResult.rows.length === 0) {
      embed.setDescription('You don\'t have any boosts. Purchase boosts from the shop using `/shop boosts`.');
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing boosts:', error);
    throw error;
  }
}

// Use a boost
async function useBoost(interaction, user, boostId, amount) {
  try {
    // Check if user has the boost
    const boostResult = await db.db.query(`
      SELECT quantity
      FROM inventory
      WHERE user_id = $1 AND item_id = $2
    `, [user.id, boostId]);
    
    if (boostResult.rows.length === 0 || boostResult.rows[0].quantity < amount) {
      return interaction.editReply({
        content: `You don't have ${amount}x ${getBoostName(boostId)}. Purchase boosts from the shop using \`/shop boosts\`.`
      });
    }
    
    // Get boost details
    const boostDetails = getBoostDetails(boostId);
    if (!boostDetails) {
      return interaction.editReply({
        content: 'Invalid boost selected.'
      });
    }
    
    // Check if user already has this type of boost active
    const activeBoostResult = await db.db.query(`
      SELECT *
      FROM active_boosts
      WHERE user_id = $1 AND boost_type = $2
    `, [user.id, boostDetails.type]);
    
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setTime(now.getTime() + (boostDetails.duration * amount));
    
    if (activeBoostResult.rows.length > 0) {
      // Extend existing boost
      const activeBoost = activeBoostResult.rows[0];
      const currentExpiresAt = new Date(activeBoost.expires_at);
      
      // If expired, treat as new boost
      if (currentExpiresAt <= now) {
        await db.db.query(`
          DELETE FROM active_boosts
          WHERE id = $1
        `, [activeBoost.id]);
        
        // Add new boost
        await db.db.query(`
          INSERT INTO active_boosts
          (user_id, boost_id, started_at, expires_at, multiplier, boost_type)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.id, boostId, now, expiresAt, boostDetails.multiplier, boostDetails.type]);
      } else {
        // Add more time to existing boost
        const newExpiresAt = new Date(currentExpiresAt.getTime() + (boostDetails.duration * amount));
        
        await db.db.query(`
          UPDATE active_boosts
          SET expires_at = $1
          WHERE id = $2
        `, [newExpiresAt, activeBoost.id]);
      }
    } else {
      // Add new boost
      await db.db.query(`
        INSERT INTO active_boosts
        (user_id, boost_id, started_at, expires_at, multiplier, boost_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [user.id, boostId, now, expiresAt, boostDetails.multiplier, boostDetails.type]);
    }
    
    // Remove boosts from inventory
    await db.db.query(`
      UPDATE inventory
      SET quantity = quantity - $1
      WHERE user_id = $2 AND item_id = $3
    `, [amount, user.id, boostId]);
    
    // Remove if quantity becomes 0
    await db.db.query(`
      DELETE FROM inventory
      WHERE user_id = $1 AND item_id = $2 AND quantity <= 0
    `, [user.id, boostId]);
    
    // Calculate duration text
    const hours = Math.floor((boostDetails.duration * amount) / (1000 * 60 * 60));
    const minutes = Math.floor(((boostDetails.duration * amount) % (1000 * 60 * 60)) / (1000 * 60));
    
    // Create success embed
    const boostType = boostDetails.type === BOOST_TYPES.CASH ? 'Cash' : 'XP';
    const multiplier = (boostDetails.multiplier * 100) - 100;
    
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Boost Activated!')
      .setDescription(`You've activated ${amount}x ${getBoostName(boostId)}!`)
      .addFields(
        { name: 'Boost Type', value: boostType, inline: true },
        { name: 'Bonus', value: `+${multiplier}%`, inline: true },
        { name: 'Duration', value: `${hours}h ${minutes}m`, inline: true },
        { name: 'Expires At', value: expiresAt.toLocaleString(), inline: false }
      )
      .setTimestamp()
      .setFooter({ text: `Use "/boosts show" to see your active boosts` });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error using boost:', error);
    throw error;
  }
}

// Helper function to get boost name
function getBoostName(boostId) {
  const boostNames = {
    'cash_boost_small': 'Small Cash Boost',
    'cash_boost_medium': 'Medium Cash Boost',
    'cash_boost_large': 'Large Cash Boost',
    'xp_boost_small': 'Small XP Boost',
    'xp_boost_medium': 'Medium XP Boost'
  };
  
  return boostNames[boostId] || boostId;
}

// Helper function to get boost details
function getBoostDetails(boostId) {
  const boostDetails = {
    'cash_boost_small': {
      multiplier: 1.1,
      duration: 60 * 60 * 1000, // 1 hour
      type: BOOST_TYPES.CASH
    },
    'cash_boost_medium': {
      multiplier: 1.25,
      duration: 3 * 60 * 60 * 1000, // 3 hours
      type: BOOST_TYPES.CASH
    },
    'cash_boost_large': {
      multiplier: 1.5,
      duration: 8 * 60 * 60 * 1000, // 8 hours
      type: BOOST_TYPES.CASH
    },
    'xp_boost_small': {
      multiplier: 1.25,
      duration: 2 * 60 * 60 * 1000, // 2 hours
      type: BOOST_TYPES.XP
    },
    'xp_boost_medium': {
      multiplier: 1.5,
      duration: 5 * 60 * 60 * 1000, // 5 hours
      type: BOOST_TYPES.XP
    }
  };
  
  return boostDetails[boostId];
}
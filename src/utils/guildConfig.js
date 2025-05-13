// Guild configuration database and utilities
const { db } = require('./db');
const { PermissionFlagsBits } = require('discord.js');

// Initialize database tables for guild configuration
async function initGuildConfigDb() {
  try {
    // Create guilds table
    await db.query(`
      CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        admin_ids TEXT[] NOT NULL DEFAULT '{}',
        prefix TEXT,
        allowed_channels TEXT[] NOT NULL DEFAULT '{}',
        nickname TEXT,
        force_commands BOOLEAN NOT NULL DEFAULT false,
        cash_name TEXT DEFAULT 'cash',
        cash_emoji TEXT DEFAULT '💰',
        crypto_name TEXT DEFAULT 'crypto',
        crypto_emoji TEXT DEFAULT '🪙',
        disable_update_messages BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('Guild configuration database initialized');
  } catch (err) {
    console.error('Error initializing guild configuration database:', err);
  }
}

// Initialize database
initGuildConfigDb();

// Get guild config, create if doesn't exist
async function getGuildConfig(guildId) {
  try {
    // Check if guild config exists
    const result = await db.query('SELECT * FROM guild_config WHERE guild_id = $1', [guildId]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Create new guild config
    const newConfig = await db.query(
      'INSERT INTO guild_config (guild_id) VALUES ($1) RETURNING *',
      [guildId]
    );
    
    return newConfig.rows[0];
  } catch (err) {
    console.error('Error getting guild config:', err);
    throw err;
  }
}

// Update guild config
async function updateGuildConfig(guildId, updateData) {
  try {
    // Build dynamic SET clause and values array
    const setClause = [];
    const values = [guildId];
    let valueIndex = 2;

    for (const [key, value] of Object.entries(updateData)) {
      setClause.push(`${key} = $${valueIndex}`);
      values.push(value);
      valueIndex++;
    }

    // Add updated_at timestamp
    setClause.push(`updated_at = NOW()`);

    if (setClause.length === 0) {
      throw new Error('No updates to apply');
    }

    const query = `UPDATE guild_config SET ${setClause.join(', ')} WHERE guild_id = $1 RETURNING *`;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error updating guild config:', err);
    throw err;
  }
}

// Add admin to guild config
async function addGuildAdmin(guildId, adminId) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Check if admin already exists
    if (config.admin_ids && config.admin_ids.includes(adminId)) {
      return config;
    }
    
    // Add admin ID to array
    const newAdminIds = config.admin_ids ? [...config.admin_ids, adminId] : [adminId];
    
    return await updateGuildConfig(guildId, { admin_ids: newAdminIds });
  } catch (err) {
    console.error('Error adding guild admin:', err);
    throw err;
  }
}

// Remove admin from guild config
async function removeGuildAdmin(guildId, adminId) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Check if admin exists
    if (!config.admin_ids || !config.admin_ids.includes(adminId)) {
      return config;
    }
    
    // Remove admin ID from array
    const newAdminIds = config.admin_ids.filter(id => id !== adminId);
    
    return await updateGuildConfig(guildId, { admin_ids: newAdminIds });
  } catch (err) {
    console.error('Error removing guild admin:', err);
    throw err;
  }
}

// Add allowed channel to guild config
async function addAllowedChannel(guildId, channelId) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Check if channel already exists
    if (config.allowed_channels && config.allowed_channels.includes(channelId)) {
      return config;
    }
    
    // Add channel ID to array
    const newChannels = config.allowed_channels ? [...config.allowed_channels, channelId] : [channelId];
    
    return await updateGuildConfig(guildId, { allowed_channels: newChannels });
  } catch (err) {
    console.error('Error adding allowed channel:', err);
    throw err;
  }
}

// Remove allowed channel from guild config
async function removeAllowedChannel(guildId, channelId) {
  try {
    const config = await getGuildConfig(guildId);
    
    // Check if channel exists
    if (!config.allowed_channels || !config.allowed_channels.includes(channelId)) {
      return config;
    }
    
    // Remove channel ID from array
    const newChannels = config.allowed_channels.filter(id => id !== channelId);
    
    return await updateGuildConfig(guildId, { allowed_channels: newChannels });
  } catch (err) {
    console.error('Error removing allowed channel:', err);
    throw err;
  }
}

// Set allowed channels for guild config (replace all)
async function setAllowedChannels(guildId, channelIds) {
  try {
    // Update channels
    return await updateGuildConfig(guildId, { allowed_channels: channelIds });
  } catch (err) {
    console.error('Error setting allowed channels:', err);
    throw err;
  }
}

// Check if user has permission to modify guild config
async function hasGuildConfigPermission(guildId, userId, member) {
  try {
    // Always allow admins and guild owners
    if (member && (member.permissions.has(PermissionFlagsBits.Administrator) || member.id === member.guild.ownerId)) {
      return true;
    }
    
    // Check if user is in admin_ids
    const config = await getGuildConfig(guildId);
    return config.admin_ids && config.admin_ids.includes(userId);
  } catch (err) {
    console.error('Error checking guild config permission:', err);
    return false;
  }
}

// Check if channel is allowed for commands
async function isChannelAllowed(guildId, channelId) {
  try {
    const config = await getGuildConfig(guildId);
    
    // If no channels are specified, all channels are allowed
    if (!config.allowed_channels || config.allowed_channels.length === 0) {
      return true;
    }
    
    // Check if channel is in allowed_channels
    return config.allowed_channels.includes(channelId);
  } catch (err) {
    console.error('Error checking allowed channel:', err);
    return true; // Default to allowing the channel on error
  }
}

module.exports = {
  getGuildConfig,
  updateGuildConfig,
  addGuildAdmin,
  removeGuildAdmin,
  addAllowedChannel,
  removeAllowedChannel,
  setAllowedChannels,
  hasGuildConfigPermission,
  isChannelAllowed
};
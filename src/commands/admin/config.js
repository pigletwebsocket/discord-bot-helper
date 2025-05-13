const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Show the current configuration for this server'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('Set allowed channels for the bot to respond in')
        .addChannelOption(option =>
          option.setName('channel1')
            .setDescription('A channel to add (leave empty to allow all channels)')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('channel2')
            .setDescription('An additional channel to add')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('channel3')
            .setDescription('An additional channel to add')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('channel4')
            .setDescription('An additional channel to add')
            .setRequired(false))
        .addChannelOption(option =>
          option.setName('channel5')
            .setDescription('An additional channel to add')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('admin_ids')
        .setDescription('Add an admin user who can change server settings')
        .addStringOption(option =>
          option.setName('action')
            .setDescription('Add or remove an admin')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            ))
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to add or remove as admin')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cash_name')
        .setDescription('Set a custom name for the cash currency in this server')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('The name to use for cash')
            .setRequired(true)
            .setMaxLength(24)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cashmoji')
        .setDescription('Set a custom emoji for the cash currency in this server')
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('The emoji to use')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('crypto_name')
        .setDescription('Set a custom name for the crypto currency in this server')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('The name to use for crypto')
            .setRequired(true)
            .setMaxLength(24)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('cryptomoji')
        .setDescription('Set a custom emoji for the crypto currency in this server')
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('The emoji to use')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable_update_messages')
        .setDescription('Toggle whether update messages are shown in this server')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Whether to disable update messages')
            .setRequired(true))),
  
  async execute(interaction) {
    try {
      // Check if user has permission
      const hasPermission = await guildConfig.hasGuildConfigPermission(
        interaction.guildId,
        interaction.user.id,
        interaction.member
      );
      
      if (!hasPermission) {
        return interaction.reply({
          content: 'You don\'t have permission to configure the bot. You need to be a server admin or be added to the admin list.',
          ephemeral: true
        });
      }
      
      // Get the subcommand
      const subcommand = interaction.options.getSubcommand();
      
      // Execute the appropriate subcommand
      switch (subcommand) {
        case 'show':
          await showConfig(interaction);
          break;
        case 'channel':
          await setAllowedChannels(interaction);
          break;
        case 'admin_ids':
          await manageAdmins(interaction);
          break;
        case 'cash_name':
          await setCashName(interaction);
          break;
        case 'cashmoji':
          await setCashEmoji(interaction);
          break;
        case 'crypto_name':
          await setCryptoName(interaction);
          break;
        case 'cryptomoji':
          await setCryptoEmoji(interaction);
          break;
        case 'disable_update_messages':
          await setDisableUpdateMessages(interaction);
          break;
        default:
          await interaction.reply({
            content: 'Unknown subcommand. Please use one of the available options.',
            ephemeral: true
          });
      }
      
    } catch (error) {
      console.error('Error in config command:', error);
      await interaction.reply({
        content: 'There was an error processing your command. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// Show current configuration
async function showConfig(interaction) {
  try {
    // Get guild config
    const config = await guildConfig.getGuildConfig(interaction.guildId);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Server Configuration: ${interaction.guild.name}`)
      .setThumbnail(interaction.guild.iconURL())
      .setTimestamp()
      .setFooter({ text: `Server ID: ${interaction.guildId}` });
    
    // Admin IDs
    const adminUsers = [];
    if (config.admin_ids && config.admin_ids.length > 0) {
      for (const adminId of config.admin_ids) {
        try {
          const user = await interaction.client.users.fetch(adminId);
          adminUsers.push(`${user.tag} (${adminId})`);
        } catch {
          adminUsers.push(`Unknown User (${adminId})`);
        }
      }
    }
    
    // Allowed channels
    const allowedChannels = [];
    if (config.allowed_channels && config.allowed_channels.length > 0) {
      for (const channelId of config.allowed_channels) {
        try {
          const channel = await interaction.guild.channels.fetch(channelId);
          allowedChannels.push(`${channel.name} (${channelId})`);
        } catch {
          allowedChannels.push(`Unknown Channel (${channelId})`);
        }
      }
    }
    
    // Add fields
    embed.addFields(
      { name: 'Admin Users', value: adminUsers.length > 0 ? adminUsers.join('\\n') : 'None (only server admins can configure)', inline: false },
      { name: 'Allowed Channels', value: allowedChannels.length > 0 ? allowedChannels.join('\\n') : 'All channels', inline: false },
      { name: 'Cash Settings', value: `Name: ${config.cash_name}\\nEmoji: ${config.cash_emoji}`, inline: true },
      { name: 'Crypto Settings', value: `Name: ${config.crypto_name}\\nEmoji: ${config.crypto_emoji}`, inline: true },
      { name: 'Other Settings', value: `Disable Update Messages: ${config.disable_update_messages ? 'Yes' : 'No'}\\nForce Commands: ${config.force_commands ? 'Yes' : 'No'}`, inline: false }
    );
    
    // Add nickname field if set
    if (config.nickname) {
      embed.addFields({ name: 'Bot Nickname', value: config.nickname, inline: true });
    }
    
    // Add prefix field if set
    if (config.prefix) {
      embed.addFields({ name: 'Command Prefix', value: config.prefix, inline: true });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing config:', error);
    throw error;
  }
}

// Set allowed channels
async function setAllowedChannels(interaction) {
  try {
    const channelOptions = [
      interaction.options.getChannel('channel1'),
      interaction.options.getChannel('channel2'),
      interaction.options.getChannel('channel3'),
      interaction.options.getChannel('channel4'),
      interaction.options.getChannel('channel5')
    ].filter(Boolean); // Remove null values
    
    // If no channels specified, clear the allowed channels list
    if (channelOptions.length === 0) {
      await guildConfig.setAllowedChannels(interaction.guildId, []);
      
      await interaction.reply({
        content: 'The bot will now respond in all channels.',
        ephemeral: true
      });
      return;
    }
    
    // Set allowed channels
    const channelIds = channelOptions.map(channel => channel.id);
    await guildConfig.setAllowedChannels(interaction.guildId, channelIds);
    
    // Format channel names for response
    const channelMentions = channelOptions.map(channel => `<#${channel.id}>`).join(', ');
    
    await interaction.reply({
      content: `The bot will now only respond in these channels: ${channelMentions}`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error setting allowed channels:', error);
    throw error;
  }
}

// Manage admin users
async function manageAdmins(interaction) {
  try {
    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');
    
    if (action === 'add') {
      // Add admin
      await guildConfig.addGuildAdmin(interaction.guildId, user.id);
      
      await interaction.reply({
        content: `Added ${user.tag} as an admin for this server's bot configuration.`,
        ephemeral: true
      });
    } else {
      // Remove admin
      await guildConfig.removeGuildAdmin(interaction.guildId, user.id);
      
      await interaction.reply({
        content: `Removed ${user.tag} from the admin list for this server's bot configuration.`,
        ephemeral: true
      });
    }
    
  } catch (error) {
    console.error('Error managing admins:', error);
    throw error;
  }
}

// Set cash name
async function setCashName(interaction) {
  try {
    const name = interaction.options.getString('name');
    
    // Validate name
    if (name.length > 24) {
      return interaction.reply({
        content: 'Cash name must be 24 characters or less.',
        ephemeral: true
      });
    }
    
    // Update config
    await guildConfig.updateGuildConfig(interaction.guildId, { cash_name: name });
    
    await interaction.reply({
      content: `Cash currency will now be called "${name}" in this server.`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error setting cash name:', error);
    throw error;
  }
}

// Set cash emoji
async function setCashEmoji(interaction) {
  try {
    const emoji = interaction.options.getString('emoji');
    
    // Validate emoji (basic validation)
    if (emoji.length > 2 && !emoji.startsWith('<') && !emoji.endsWith('>')) {
      return interaction.reply({
        content: 'Please provide a valid emoji.',
        ephemeral: true
      });
    }
    
    // Update config
    await guildConfig.updateGuildConfig(interaction.guildId, { cash_emoji: emoji });
    
    await interaction.reply({
      content: `Cash emoji has been set to ${emoji} in this server.`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error setting cash emoji:', error);
    throw error;
  }
}

// Set crypto name
async function setCryptoName(interaction) {
  try {
    const name = interaction.options.getString('name');
    
    // Validate name
    if (name.length > 24) {
      return interaction.reply({
        content: 'Crypto name must be 24 characters or less.',
        ephemeral: true
      });
    }
    
    // Update config
    await guildConfig.updateGuildConfig(interaction.guildId, { crypto_name: name });
    
    await interaction.reply({
      content: `Crypto currency will now be called "${name}" in this server.`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error setting crypto name:', error);
    throw error;
  }
}

// Set crypto emoji
async function setCryptoEmoji(interaction) {
  try {
    const emoji = interaction.options.getString('emoji');
    
    // Validate emoji (basic validation)
    if (emoji.length > 2 && !emoji.startsWith('<') && !emoji.endsWith('>')) {
      return interaction.reply({
        content: 'Please provide a valid emoji.',
        ephemeral: true
      });
    }
    
    // Update config
    await guildConfig.updateGuildConfig(interaction.guildId, { crypto_emoji: emoji });
    
    await interaction.reply({
      content: `Crypto emoji has been set to ${emoji} in this server.`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error setting crypto emoji:', error);
    throw error;
  }
}

// Set disable update messages
async function setDisableUpdateMessages(interaction) {
  try {
    const enabled = interaction.options.getBoolean('enabled');
    
    // Update config
    await guildConfig.updateGuildConfig(interaction.guildId, { disable_update_messages: enabled });
    
    await interaction.reply({
      content: `Update messages are now ${enabled ? 'disabled' : 'enabled'} in this server.`,
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error setting disable update messages:', error);
    throw error;
  }
}
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const guildConfig = require('../../utils/guildConfig');

// Store update messages - normally these would come from a database or config file
const updateMessages = [
  {
    date: '2025-05-13',
    title: 'Version 1.0.0',
    description: 'Initial release of the Discord Gambling Bot',
    changes: [
      'Implemented multiple casino games: slots, roulette, blackjack, and more',
      'Added economy system with daily rewards and work commands',
      'Implemented achievement system with progress tracking',
      'Created shop system for boosts and cosmetics',
      'Added player-to-player interactions with send command',
      'Implemented WebSocket control panel for monitoring the bot',
      'Added mining mini-game with resource collection and crafting'
    ]
  },
  {
    date: '2025-05-12',
    title: 'Beta Release',
    description: 'Beta testing version with core features',
    changes: [
      'Added basic casino games: slots, coinflip, and blackjack',
      'Implemented simple economy system with daily rewards',
      'Added profile tracking and statistics',
      'Fixed various bugs and performance issues'
    ]
  },
  {
    date: '2025-05-10',
    title: 'Alpha Release',
    description: 'Early testing version with limited functionality',
    changes: [
      'Initial framework setup',
      'Basic command handling',
      'Database integration',
      'Slot machine game implementation'
    ]
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updates')
    .setDescription('Show the latest bot updates and changes'),
  
  async execute(interaction) {
    try {
      // Check if updates are disabled for this guild
      if (interaction.guildId) {
        const config = await guildConfig.getGuildConfig(interaction.guildId);
        if (config.disable_update_messages) {
          return interaction.reply({
            content: 'Update messages are disabled in this server. An administrator can enable them using `/config disable_update_messages enabled:false`.',
            ephemeral: true
          });
        }
      }
      
      // Get latest update
      const latestUpdate = updateMessages[0];
      
      // Create the main embed for the latest update
      const latestEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🔄 ${latestUpdate.title}`)
        .setDescription(latestUpdate.description)
        .setTimestamp(new Date(latestUpdate.date))
        .setFooter({ text: `Released: ${latestUpdate.date}` });
      
      // Add changes
      if (latestUpdate.changes && latestUpdate.changes.length > 0) {
        latestEmbed.addFields({
          name: 'Changes',
          value: latestUpdate.changes.map(change => `• ${change}`).join('\\n'),
          inline: false
        });
      }
      
      // Create embeds for previous updates (up to 2 more)
      const additionalEmbeds = [];
      
      for (let i = 1; i < Math.min(3, updateMessages.length); i++) {
        const update = updateMessages[i];
        
        const embed = new EmbedBuilder()
          .setColor('#7289da')
          .setTitle(`📜 ${update.title}`)
          .setDescription(update.description)
          .setTimestamp(new Date(update.date))
          .setFooter({ text: `Released: ${update.date}` });
        
        // Add changes
        if (update.changes && update.changes.length > 0) {
          embed.addFields({
            name: 'Changes',
            value: update.changes.map(change => `• ${change}`).join('\\n'),
            inline: false
          });
        }
        
        additionalEmbeds.push(embed);
      }
      
      // Send the embeds
      await interaction.reply({
        content: '📣 **Latest Bot Updates**',
        embeds: [latestEmbed, ...additionalEmbeds]
      });
      
    } catch (error) {
      console.error('Error in updates command:', error);
      await interaction.reply({
        content: 'There was an error showing updates. Please try again later.',
        ephemeral: true
      });
    }
  }
};
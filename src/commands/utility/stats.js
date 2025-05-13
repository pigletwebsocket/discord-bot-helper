const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const db = require('../../utils/database');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows bot statistics, ping, and system information'),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to collect stats
      await interaction.deferReply();
      
      // Calculate ping
      const pingStart = Date.now();
      
      // Get bot stats from Discord API
      const botUser = interaction.client.user;
      const guildCount = interaction.client.guilds.cache.size;
      const channelCount = interaction.client.channels.cache.size;
      
      // Get stats from database
      const userCountResult = await db.db.query('SELECT COUNT(*) FROM users');
      const userCount = parseInt(userCountResult.rows[0].count);
      
      const totalCashResult = await db.db.query('SELECT SUM(cash) FROM users');
      const totalCash = parseInt(totalCashResult.rows[0].sum || 0);
      
      const totalGamesResult = await db.db.query('SELECT SUM(games_played) FROM stats');
      const totalGames = parseInt(totalGamesResult.rows[0].sum || 0);
      
      // Calculate uptime
      const uptimeMs = interaction.client.uptime;
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
      
      // System information
      const memUsage = process.memoryUsage();
      const systemMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = systemMemory - freeMemory;
      
      // Calculate ping after collecting stats
      const pingTime = Date.now() - pingStart;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Bot Statistics')
        .setThumbnail(botUser.displayAvatarURL())
        .addFields(
          { name: 'Bot Info', value: 
            `**Name:** ${botUser.username}\n` +
            `**ID:** ${botUser.id}\n` +
            `**Created:** ${botUser.createdAt.toDateString()}\n` +
            `**Discord.js:** v${version}\n` +
            `**Node.js:** ${process.version}`,
            inline: true
          },
          { name: 'Stats', value: 
            `**Servers:** ${guildCount.toLocaleString()}\n` +
            `**Channels:** ${channelCount.toLocaleString()}\n` +
            `**Users:** ${userCount.toLocaleString()}\n` +
            `**Total Games:** ${totalGames.toLocaleString()}\n` +
            `**Total Cash:** ${totalCash.toLocaleString()}`,
            inline: true
          },
          { name: 'System', value: 
            `**Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s\n` +
            `**Memory Usage:** ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB\n` +
            `**System Memory:** ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(systemMemory / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
            `**Ping:** ${pingTime}ms`,
            inline: false
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Gambling Bot Statistics' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in stats command:', error);
      await interaction.editReply({
        content: 'There was an error fetching bot statistics. Please try again later.'
      });
    }
  }
};
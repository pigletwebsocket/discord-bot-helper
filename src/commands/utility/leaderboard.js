const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows various leaderboards')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('The type of leaderboard to display')
        .setRequired(true)
        .addChoices(
          { name: 'Cash', value: 'cash' },
          { name: 'Total Wagered', value: 'wagered' },
          { name: 'Total Won', value: 'won' },
          { name: 'Net Profit', value: 'profit' },
          { name: 'Blackjack', value: 'blackjack' },
          { name: 'Coinflip', value: 'coinflip' },
          { name: 'Crash', value: 'crash' },
          { name: 'Diceroll', value: 'diceroll' },
          { name: 'Hi-Lo', value: 'hilo' },
          { name: 'Mines', value: 'mines' },
          { name: 'Roulette', value: 'roulette' },
          { name: 'Slots', value: 'slots' }
        ))
    .addBooleanOption(option =>
      option.setName('global')
        .setDescription('Whether to show global leaderboard (true) or server leaderboard (false)')
        .setRequired(false)),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const type = interaction.options.getString('type');
      const isGlobal = interaction.options.getBoolean('global') ?? true;
      
      // Set up query based on leaderboard type
      let query = '';
      let queryParams = [];
      
      if (['cash'].includes(type)) {
        // Cash leaderboard from users table
        query = `SELECT username, cash FROM users ORDER BY cash DESC LIMIT 10`;
      } else if (['wagered', 'won', 'profit'].includes(type)) {
        // Stats from stats table
        const columnMapping = {
          'wagered': 'total_wagered',
          'won': 'total_won',
          'profit': 'net_profit'
        };
        
        query = `
          SELECT u.username, s.${columnMapping[type]} as value
          FROM stats s
          JOIN users u ON s.user_id = u.id
          ORDER BY value DESC
          LIMIT 10
        `;
      } else {
        // Game-specific stats
        query = `
          SELECT u.username, gs.games_played, gs.games_won, gs.net_profit
          FROM game_stats gs
          JOIN users u ON gs.user_id = u.id
          WHERE gs.game_name = $1
          ORDER BY gs.net_profit DESC
          LIMIT 10
        `;
        queryParams.push(type);
      }
      
      // Fetch leaderboard data
      const result = await db.db.query(query, queryParams);
      
      if (result.rows.length === 0) {
        return interaction.editReply({
          content: `No data available for the ${type} leaderboard yet.`
        });
      }
      
      // Generate embed based on leaderboard type
      let title = '';
      let description = '';
      let fields = [];
      
      if (type === 'cash') {
        title = '💰 Cash Leaderboard';
        description = 'The richest gamblers in the casino';
        
        fields = result.rows.map((row, index) => {
          return {
            name: `#${index + 1} - ${row.username}`,
            value: formatter.formatCash(row.cash),
            inline: false
          };
        });
      } else if (['wagered', 'won', 'profit'].includes(type)) {
        const titleMapping = {
          'wagered': '🎲 Total Wagered Leaderboard',
          'won': '🏆 Total Won Leaderboard',
          'profit': '📈 Net Profit Leaderboard'
        };
        
        title = titleMapping[type];
        description = `Top players by ${type === 'wagered' ? 'amount wagered' : type === 'won' ? 'amount won' : 'net profit'}`;
        
        fields = result.rows.map((row, index) => {
          return {
            name: `#${index + 1} - ${row.username}`,
            value: formatter.formatCash(row.value),
            inline: false
          };
        });
      } else {
        // Game-specific leaderboard
        const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
        title = `${getGameEmoji(type)} ${capitalized} Leaderboard`;
        description = `Top ${capitalized} players by net profit`;
        
        fields = result.rows.map((row, index) => {
          return {
            name: `#${index + 1} - ${row.username}`,
            value: `Profit: ${formatter.formatCash(row.net_profit)} | Games: ${row.games_played} | Wins: ${row.games_won} (${Math.round((row.games_won / row.games_played) * 100) || 0}%)`,
            inline: false
          };
        });
      }
      
      // Create and send embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(title)
        .setDescription(description)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ 
          text: isGlobal ? 'Global Leaderboard' : `Server Leaderboard: ${interaction.guild.name}` 
        });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.editReply({
        content: 'There was an error fetching the leaderboard. Please try again later.'
      });
    }
  }
};

// Helper function to get emoji for game
function getGameEmoji(game) {
  const emojiMap = {
    'blackjack': '🃏',
    'coinflip': '🪙',
    'crash': '📉',
    'diceroll': '🎲',
    'hilo': '↕️',
    'mines': '💣',
    'roulette': '🎯',
    'slots': '🎰'
  };
  
  return emojiMap[game] || '🎮';
}
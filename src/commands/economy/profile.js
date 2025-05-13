const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const achievements = require('../../utils/achievements');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your gambling profile')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to view profile of')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('view')
        .setDescription('What to view')
        .setRequired(false)
        .addChoices(
          { name: 'Profile', value: 'profile' },
          { name: 'Statistics', value: 'stats' },
          { name: 'Achievements', value: 'achievements' }
        )),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Check if a user was mentioned
      const mentionedUser = interaction.options.getUser('user');
      const targetUser = mentionedUser || interaction.user;
      
      // Get view type
      const viewType = interaction.options.getString('view') || 'profile';
      
      // Get user data from database
      const userData = await db.getUser(targetUser.id, targetUser.username);
      
      // Handle different view types
      switch (viewType) {
        case 'profile':
          // Basic profile view
          const profileEmbed = formatter.createProfileEmbed(userData);
          await interaction.editReply({ embeds: [profileEmbed] });
          break;
          
        case 'stats':
          // Detailed statistics view
          const gameStats = await db.getAllGameStats(targetUser.id);
          const statsEmbed = createStatsEmbed(userData, gameStats);
          await interaction.editReply({ embeds: [statsEmbed] });
          break;
          
        case 'achievements':
          // Achievements view
          const userAchievements = await achievements.getUserAchievements(targetUser.id);
          const achievementsEmbed = createAchievementsEmbed(targetUser, userAchievements);
          await interaction.editReply({ embeds: [achievementsEmbed] });
          break;
      }
      
    } catch (error) {
      console.error('Error in profile command:', error);
      await interaction.editReply({ 
        content: 'There was an error fetching the profile. Please try again later.'
      });
    }
  }
};

// Create a statistics embed
function createStatsEmbed(user, gameStats) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`${user.username}'s Gambling Statistics`)
    .setDescription(`Detailed statistics for ${user.username}`)
    .setThumbnail('https://cdn.discordapp.com/emojis/778588554975633428.png?v=1')
    .setTimestamp();
  
  // Add overall stats
  let totalGamesPlayed = 0;
  let totalGamesWon = 0;
  let totalWagered = 0;
  let totalWon = 0;
  let netProfit = 0;
  
  gameStats.forEach(game => {
    totalGamesPlayed += game.games_played;
    totalGamesWon += game.games_won;
    totalWagered += Number(game.total_wagered);
    totalWon += Number(game.total_won);
    netProfit += Number(game.net_profit);
  });
  
  embed.addFields(
    { name: 'Total Games Played', value: totalGamesPlayed.toString(), inline: true },
    { name: 'Total Games Won', value: totalGamesWon.toString(), inline: true },
    { name: 'Win Rate', value: `${totalGamesPlayed > 0 ? Math.round((totalGamesWon / totalGamesPlayed) * 100) : 0}%`, inline: true },
    { name: 'Total Wagered', value: formatter.formatCash(totalWagered), inline: true },
    { name: 'Total Won', value: formatter.formatCash(totalWon), inline: true },
    { name: 'Net Profit', value: formatter.formatCash(netProfit), inline: true }
  );
  
  // Add individual game stats
  if (gameStats.length > 0) {
    embed.addFields({ name: '\u200B', value: '**Game Statistics**', inline: false });
    
    for (const game of gameStats) {
      const winRate = game.games_played > 0 ? Math.round((game.games_won / game.games_played) * 100) : 0;
      const gameTitle = game.game_name.charAt(0).toUpperCase() + game.game_name.slice(1);
      
      embed.addFields({
        name: gameTitle,
        value: `Played: ${game.games_played} | Won: ${game.games_won} | Win Rate: ${winRate}%\nWagered: ${formatter.formatCash(game.total_wagered)} | Profit: ${formatter.formatCash(game.net_profit)}`,
        inline: false
      });
    }
  }
  
  return embed;
}

// Create an achievements embed
function createAchievementsEmbed(user, userAchievements) {
  // Sort achievements: completed first, then by progress percentage
  userAchievements.sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    
    const aProgress = Math.min(1, a.progress / a.threshold);
    const bProgress = Math.min(1, b.progress / b.threshold);
    
    return bProgress - aProgress;
  });
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`${user.username}'s Achievements`)
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp();
  
  // Count completed achievements
  const completedCount = userAchievements.filter(a => a.completed).length;
  const totalCount = userAchievements.length;
  const completionPercent = Math.floor((completedCount / totalCount) * 100);
  
  embed.setDescription(`${completedCount}/${totalCount} achievements completed (${completionPercent}%)`);
  
  // Add fields for some achievements (max 10 to avoid cluttering)
  const maxDisplayed = 10;
  const displayedAchievements = userAchievements.slice(0, maxDisplayed);
  
  if (displayedAchievements.length === 0) {
    embed.addFields({
      name: 'No Achievements Yet',
      value: 'Start playing games to earn achievements!',
      inline: false
    });
  } else {
    for (const achievement of displayedAchievements) {
      const progress = Math.min(achievement.progress, achievement.threshold);
      const progressPercent = Math.floor((progress / achievement.threshold) * 100);
      const progressBar = createProgressBar(progressPercent);
      
      const value = achievement.completed 
        ? `✅ Completed! (${achievement.threshold}/${achievement.threshold})`
        : `${progressBar} ${progress}/${achievement.threshold} (${progressPercent}%)`;
      
      embed.addFields({
        name: achievement.name,
        value: `${achievement.description}\n${value}`,
        inline: false
      });
    }
  }
  
  // Add note if there are more achievements
  if (userAchievements.length > maxDisplayed) {
    embed.setFooter({ 
      text: `And ${userAchievements.length - maxDisplayed} more achievements. Use /achievements to see all.` 
    });
  }
  
  return embed;
}

// Helper function to create a progress bar
function createProgressBar(percent, size = 10) {
  const filledCount = Math.floor((percent / 100) * size);
  const emptyCount = size - filledCount;
  
  // Unicode block characters for better-looking progress bar
  const filled = '█';
  const empty = '░';
  
  return filled.repeat(filledCount) + empty.repeat(emptyCount);
}

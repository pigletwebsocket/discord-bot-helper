const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const achievements = require('../../utils/achievements');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your achievements')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Category of achievements to view')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Completed', value: 'completed' },
          { name: 'In Progress', value: 'progress' },
          { name: 'Games', value: 'games' },
          { name: 'Economy', value: 'economy' }
        )),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      const category = interaction.options.getString('category') || 'all';
      
      // Get user
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Get achievements
      const userAchievements = await achievements.getUserAchievements(interaction.user.id);
      
      if (userAchievements.length === 0) {
        return interaction.editReply({
          content: 'You have no achievements yet. Start playing games to earn achievements!'
        });
      }
      
      // Filter achievements based on category
      let filteredAchievements = userAchievements;
      
      switch (category) {
        case 'completed':
          filteredAchievements = userAchievements.filter(a => a.completed);
          break;
        case 'progress':
          filteredAchievements = userAchievements.filter(a => !a.completed);
          break;
        case 'games':
          filteredAchievements = userAchievements.filter(a => 
            a.type.includes('games_') || 
            a.type.includes('mines_') || 
            a.type.includes('crash_') || 
            a.type.includes('hilo_') || 
            a.type.includes('blackjack_')
          );
          break;
        case 'economy':
          filteredAchievements = userAchievements.filter(a => 
            a.type.includes('cash_') || 
            a.type.includes('daily_') || 
            a.type.includes('work_')
          );
          break;
      }
      
      if (filteredAchievements.length === 0) {
        return interaction.editReply({
          content: `You have no ${category} achievements yet.`
        });
      }
      
      // Sort achievements: completed first, then by progress percentage
      filteredAchievements.sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        
        const aProgress = Math.min(1, a.progress / a.threshold);
        const bProgress = Math.min(1, b.progress / b.threshold);
        
        return bProgress - aProgress;
      });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${interaction.user.username}'s Achievements`)
        .setDescription(`Showing ${category} achievements`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();
      
      // Add fields for achievements
      const fields = [];
      const maxFieldsPerEmbed = 25; // Discord limit
      
      for (const achievement of filteredAchievements.slice(0, maxFieldsPerEmbed)) {
        const progress = Math.min(achievement.progress, achievement.threshold);
        const progressPercent = Math.floor((progress / achievement.threshold) * 100);
        const progressBar = createProgressBar(progressPercent);
        
        const value = achievement.completed 
          ? `✅ Completed! (${achievement.threshold}/${achievement.threshold})`
          : `${progressBar} ${progress}/${achievement.threshold} (${progressPercent}%)`;
        
        fields.push({
          name: achievement.name,
          value: `${achievement.description}\n${value}`,
          inline: false
        });
      }
      
      embed.addFields(fields);
      
      // Add total achievements stats
      const completedCount = userAchievements.filter(a => a.completed).length;
      const totalCount = userAchievements.length;
      const completionPercent = Math.floor((completedCount / totalCount) * 100);
      
      embed.setFooter({ 
        text: `${completedCount}/${totalCount} achievements completed (${completionPercent}%)` 
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in achievements command:', error);
      await interaction.editReply({
        content: 'There was an error fetching your achievements. Please try again later.'
      });
    }
  }
};

// Helper function to create a progress bar
function createProgressBar(percent, size = 10) {
  const filledCount = Math.floor((percent / 100) * size);
  const emptyCount = size - filledCount;
  
  // Unicode block characters for better-looking progress bar
  const filled = '█';
  const empty = '░';
  
  return filled.repeat(filledCount) + empty.repeat(emptyCount);
}
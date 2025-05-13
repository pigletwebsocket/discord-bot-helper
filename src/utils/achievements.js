// Achievements system for the Discord bot
const db = require('./database');
const { EmbedBuilder } = require('discord.js');

// Define the achievements
const achievementTypes = {
  CASH_EARNED: 'cash_earned',
  CASH_WON: 'cash_won',
  CASH_WAGERED: 'cash_wagered',
  GAMES_PLAYED: 'games_played',
  GAMES_WON: 'games_won',
  MINES_SURVIVED: 'mines_survived',
  CRASH_MULTIPLIER: 'crash_multiplier',
  HILO_STREAK: 'hilo_streak',
  BLACKJACK_BLACKJACKS: 'blackjack_blackjacks',
  DAILY_STREAK: 'daily_streak',
  WORK_COMPLETED: 'work_completed'
};

// Achievement definitions with thresholds
const achievements = [
  // Cash earned
  { 
    id: 'cash_earned_1', 
    type: achievementTypes.CASH_EARNED, 
    name: 'Pocket Change', 
    description: 'Earn 10,000 cash', 
    threshold: 10000,
    xp: 100
  },
  { 
    id: 'cash_earned_2', 
    type: achievementTypes.CASH_EARNED, 
    name: 'Money Maker', 
    description: 'Earn 100,000 cash', 
    threshold: 100000,
    xp: 250
  },
  { 
    id: 'cash_earned_3', 
    type: achievementTypes.CASH_EARNED, 
    name: 'Cashing In', 
    description: 'Earn 1,000,000 cash', 
    threshold: 1000000,
    xp: 500
  },
  { 
    id: 'cash_earned_4', 
    type: achievementTypes.CASH_EARNED, 
    name: 'Millionaire', 
    description: 'Earn 10,000,000 cash', 
    threshold: 10000000,
    xp: 1000
  },
  { 
    id: 'cash_earned_5', 
    type: achievementTypes.CASH_EARNED, 
    name: 'Fortune Teller', 
    description: 'Earn 100,000,000 cash', 
    threshold: 100000000,
    xp: 2500
  },
  
  // Games played
  { 
    id: 'games_played_1', 
    type: achievementTypes.GAMES_PLAYED, 
    name: 'Novice Gambler', 
    description: 'Play 10 games', 
    threshold: 10,
    xp: 100
  },
  { 
    id: 'games_played_2', 
    type: achievementTypes.GAMES_PLAYED, 
    name: 'Regular', 
    description: 'Play 50 games', 
    threshold: 50,
    xp: 200
  },
  { 
    id: 'games_played_3', 
    type: achievementTypes.GAMES_PLAYED, 
    name: 'Casino Enthusiast', 
    description: 'Play 100 games', 
    threshold: 100,
    xp: 300
  },
  { 
    id: 'games_played_4', 
    type: achievementTypes.GAMES_PLAYED, 
    name: 'Gambling Addict', 
    description: 'Play 500 games', 
    threshold: 500,
    xp: 500
  },
  { 
    id: 'games_played_5', 
    type: achievementTypes.GAMES_PLAYED, 
    name: 'High Roller', 
    description: 'Play 1,000 games', 
    threshold: 1000,
    xp: 1000
  },
  
  // Games won
  { 
    id: 'games_won_1', 
    type: achievementTypes.GAMES_WON, 
    name: 'Beginner\'s Luck', 
    description: 'Win 5 games', 
    threshold: 5,
    xp: 100
  },
  { 
    id: 'games_won_2', 
    type: achievementTypes.GAMES_WON, 
    name: 'Lucky Streak', 
    description: 'Win 25 games', 
    threshold: 25,
    xp: 200
  },
  { 
    id: 'games_won_3', 
    type: achievementTypes.GAMES_WON, 
    name: 'On a Roll', 
    description: 'Win 50 games', 
    threshold: 50,
    xp: 300
  },
  { 
    id: 'games_won_4', 
    type: achievementTypes.GAMES_WON, 
    name: 'Professional Gambler', 
    description: 'Win 100 games', 
    threshold: 100,
    xp: 500
  },
  { 
    id: 'games_won_5', 
    type: achievementTypes.GAMES_WON, 
    name: 'Casino Legend', 
    description: 'Win 500 games', 
    threshold: 500,
    xp: 1000
  },
  
  // Game-specific achievements
  // Mines
  { 
    id: 'mines_survived_1', 
    type: achievementTypes.MINES_SURVIVED, 
    name: 'Mine Sweeper', 
    description: 'Reveal 50 safe tiles in Mines', 
    threshold: 50,
    xp: 200
  },
  { 
    id: 'mines_survived_2', 
    type: achievementTypes.MINES_SURVIVED, 
    name: 'Explosive Expert', 
    description: 'Reveal 200 safe tiles in Mines', 
    threshold: 200,
    xp: 500
  },
  
  // Crash
  { 
    id: 'crash_multiplier_1', 
    type: achievementTypes.CRASH_MULTIPLIER, 
    name: 'Quick Cash', 
    description: 'Cash out at 2x multiplier or higher', 
    threshold: 2,
    xp: 100
  },
  { 
    id: 'crash_multiplier_2', 
    type: achievementTypes.CRASH_MULTIPLIER, 
    name: 'Risk Taker', 
    description: 'Cash out at 5x multiplier or higher', 
    threshold: 5,
    xp: 300
  },
  { 
    id: 'crash_multiplier_3', 
    type: achievementTypes.CRASH_MULTIPLIER, 
    name: 'To The Moon!', 
    description: 'Cash out at 10x multiplier or higher', 
    threshold: 10,
    xp: 1000
  },
  
  // Hi-Lo
  { 
    id: 'hilo_streak_1', 
    type: achievementTypes.HILO_STREAK, 
    name: 'Predictable', 
    description: 'Get a streak of 3 correct guesses in Hi-Lo', 
    threshold: 3,
    xp: 100
  },
  { 
    id: 'hilo_streak_2', 
    type: achievementTypes.HILO_STREAK, 
    name: 'Fortune Teller', 
    description: 'Get a streak of 5 correct guesses in Hi-Lo', 
    threshold: 5,
    xp: 300
  },
  { 
    id: 'hilo_streak_3', 
    type: achievementTypes.HILO_STREAK, 
    name: 'Psychic', 
    description: 'Get a streak of 10 correct guesses in Hi-Lo', 
    threshold: 10,
    xp: 1000
  },
  
  // Blackjack
  { 
    id: 'blackjack_blackjacks_1', 
    type: achievementTypes.BLACKJACK_BLACKJACKS, 
    name: 'Lucky 21', 
    description: 'Get 5 blackjacks', 
    threshold: 5,
    xp: 200
  },
  { 
    id: 'blackjack_blackjacks_2', 
    type: achievementTypes.BLACKJACK_BLACKJACKS, 
    name: 'Blackjack Master', 
    description: 'Get 20 blackjacks', 
    threshold: 20,
    xp: 500
  },
  
  // Daily streak
  { 
    id: 'daily_streak_1', 
    type: achievementTypes.DAILY_STREAK, 
    name: 'Regular Visitor', 
    description: 'Claim daily rewards 7 days in a row', 
    threshold: 7,
    xp: 200
  },
  { 
    id: 'daily_streak_2', 
    type: achievementTypes.DAILY_STREAK, 
    name: 'Loyal Customer', 
    description: 'Claim daily rewards 30 days in a row', 
    threshold: 30,
    xp: 1000
  },
  
  // Work completed
  { 
    id: 'work_completed_1', 
    type: achievementTypes.WORK_COMPLETED, 
    name: 'Part-Timer', 
    description: 'Complete the work command 10 times', 
    threshold: 10,
    xp: 100
  },
  { 
    id: 'work_completed_2', 
    type: achievementTypes.WORK_COMPLETED, 
    name: 'Full-Timer', 
    description: 'Complete the work command 50 times', 
    threshold: 50,
    xp: 300
  },
  { 
    id: 'work_completed_3', 
    type: achievementTypes.WORK_COMPLETED, 
    name: 'Workaholic', 
    description: 'Complete the work command 100 times', 
    threshold: 100,
    xp: 500
  }
];

// Initialize database schema for achievements
async function initAchievementsDb() {
  try {
    // Create user_achievements table to track user progress
    await db.db.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      )
    `);
    
    // Create user_stats table to track various stats for achievements
    await db.db.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        cash_earned BIGINT NOT NULL DEFAULT 0,
        cash_won BIGINT NOT NULL DEFAULT 0,
        cash_wagered BIGINT NOT NULL DEFAULT 0,
        mines_survived INTEGER NOT NULL DEFAULT 0,
        crash_max_multiplier REAL NOT NULL DEFAULT 0,
        hilo_max_streak INTEGER NOT NULL DEFAULT 0,
        blackjack_blackjacks INTEGER NOT NULL DEFAULT 0,
        daily_streak INTEGER NOT NULL DEFAULT 0,
        work_completed INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Create or get user_stats entry for each user
    await db.db.query(`
      INSERT INTO user_stats (user_id)
      SELECT id FROM users
      ON CONFLICT (user_id) DO NOTHING
    `);
    
    console.log('Achievements database initialized');
  } catch (err) {
    console.error('Error initializing achievements database:', err);
  }
}

// Initialize the achievements system
initAchievementsDb();

// Get user achievements
async function getUserAchievements(userId) {
  try {
    // Get all achievements for the user
    const result = await db.db.query(`
      SELECT 
        ua.achievement_id,
        ua.progress,
        ua.completed,
        ua.completed_at
      FROM user_achievements ua
      WHERE ua.user_id = $1
    `, [userId]);
    
    // Map achievements with their definitions
    return result.rows.map(row => {
      const achievementDef = achievements.find(a => a.id === row.achievement_id);
      return {
        ...achievementDef,
        progress: row.progress,
        completed: row.completed,
        completedAt: row.completed_at
      };
    });
  } catch (err) {
    console.error('Error getting user achievements:', err);
    return [];
  }
}

// Get user stats for achievements
async function getUserStats(userId) {
  try {
    // First ensure the user has a stats row
    await db.db.query(`
      INSERT INTO user_stats (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);
    
    // Get user stats
    const result = await db.db.query(`
      SELECT * FROM user_stats WHERE user_id = $1
    `, [userId]);
    
    return result.rows[0];
  } catch (err) {
    console.error('Error getting user stats:', err);
    return null;
  }
}

// Update user stats
async function updateUserStats(userId, stats) {
  try {
    // Build SET clause from stats object
    const setClause = [];
    const values = [userId];
    let valueIndex = 2;
    
    for (const [key, value] of Object.entries(stats)) {
      setClause.push(`${key} = $${valueIndex}`);
      values.push(value);
      valueIndex++;
    }
    
    if (setClause.length === 0) {
      return null; // No updates to apply
    }
    
    // Update stats
    const query = `
      UPDATE user_stats
      SET ${setClause.join(', ')}
      WHERE user_id = $1
      RETURNING *
    `;
    
    const result = await db.db.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error updating user stats:', err);
    return null;
  }
}

// Check for achievement completion
async function checkAchievements(userId, type, value = 1) {
  try {
    // Get user stats
    const userStats = await getUserStats(userId);
    if (!userStats) return [];
    
    // Get relevant achievements for the type
    const relevantAchievements = achievements.filter(a => a.type === type);
    if (relevantAchievements.length === 0) return [];
    
    // Get user's progress on these achievements
    const userAchievements = await Promise.all(
      relevantAchievements.map(async (achievement) => {
        const result = await db.db.query(`
          SELECT * FROM user_achievements
          WHERE user_id = $1 AND achievement_id = $2
        `, [userId, achievement.id]);
        
        if (result.rows.length === 0) {
          // Create new achievement progress
          const newProgress = await db.db.query(`
            INSERT INTO user_achievements (user_id, achievement_id, progress, completed)
            VALUES ($1, $2, 0, false)
            RETURNING *
          `, [userId, achievement.id]);
          
          return newProgress.rows[0];
        }
        
        return result.rows[0];
      })
    );
    
    // Check each achievement for completion
    const completedAchievements = [];
    
    for (const achievement of relevantAchievements) {
      const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
      
      // Skip if already completed
      if (userAchievement.completed) continue;
      
      let newProgress = userAchievement.progress;
      
      // Update progress based on type
      switch (type) {
        case achievementTypes.CASH_EARNED:
          newProgress = userStats.cash_earned;
          break;
        case achievementTypes.CASH_WON:
          newProgress = userStats.cash_won;
          break;
        case achievementTypes.CASH_WAGERED:
          newProgress = userStats.cash_wagered;
          break;
        case achievementTypes.GAMES_PLAYED:
          // This comes from stats table
          const statsResult = await db.db.query(`
            SELECT games_played FROM stats WHERE user_id = $1
          `, [userId]);
          newProgress = statsResult.rows[0]?.games_played || 0;
          break;
        case achievementTypes.GAMES_WON:
          // This comes from stats table
          const wonResult = await db.db.query(`
            SELECT games_won FROM stats WHERE user_id = $1
          `, [userId]);
          newProgress = wonResult.rows[0]?.games_won || 0;
          break;
        case achievementTypes.MINES_SURVIVED:
          newProgress = userStats.mines_survived;
          break;
        case achievementTypes.CRASH_MULTIPLIER:
          // For crash multiplier we compare if the current value is higher than the threshold
          if (value > userStats.crash_max_multiplier) {
            await updateUserStats(userId, { crash_max_multiplier: value });
          }
          newProgress = userStats.crash_max_multiplier;
          break;
        case achievementTypes.HILO_STREAK:
          // For hilo streak we compare if the current value is higher than the threshold
          if (value > userStats.hilo_max_streak) {
            await updateUserStats(userId, { hilo_max_streak: value });
          }
          newProgress = userStats.hilo_max_streak;
          break;
        case achievementTypes.BLACKJACK_BLACKJACKS:
          newProgress = userStats.blackjack_blackjacks;
          break;
        case achievementTypes.DAILY_STREAK:
          newProgress = userStats.daily_streak;
          break;
        case achievementTypes.WORK_COMPLETED:
          newProgress = userStats.work_completed;
          break;
        default:
          // For other types, increment by the value
          newProgress += value;
      }
      
      // Update progress
      await db.db.query(`
        UPDATE user_achievements
        SET progress = $1
        WHERE user_id = $2 AND achievement_id = $3
      `, [newProgress, userId, achievement.id]);
      
      // Check if completed
      if (newProgress >= achievement.threshold) {
        // Mark as completed
        await db.db.query(`
          UPDATE user_achievements
          SET completed = true, completed_at = NOW()
          WHERE user_id = $1 AND achievement_id = $2
        `, [userId, achievement.id]);
        
        // Add XP to user
        await db.db.query(`
          UPDATE users
          SET xp = COALESCE(xp, 0) + $1
          WHERE id = $2
        `, [achievement.xp, userId]);
        
        // Add to completed achievements
        completedAchievements.push({
          ...achievement,
          progress: newProgress
        });
      }
    }
    
    return completedAchievements;
  } catch (err) {
    console.error('Error checking achievements:', err);
    return [];
  }
}

// Update user stats for a specific event
async function trackEvent(userId, event, value = 1) {
  try {
    // Get current stats
    const stats = await getUserStats(userId);
    if (!stats) return [];
    
    const updates = {};
    
    // Update stats based on event
    switch (event) {
      case 'cash_earned':
        updates.cash_earned = stats.cash_earned + value;
        break;
      case 'cash_won':
        updates.cash_won = stats.cash_won + value;
        break;
      case 'cash_wagered':
        updates.cash_wagered = stats.cash_wagered + value;
        break;
      case 'mines_survived':
        updates.mines_survived = stats.mines_survived + value;
        break;
      case 'daily_claimed':
        updates.daily_streak = stats.daily_streak + 1;
        break;
      case 'daily_missed':
        updates.daily_streak = 0;
        break;
      case 'work_completed':
        updates.work_completed = stats.work_completed + 1;
        break;
      case 'blackjack_blackjack':
        updates.blackjack_blackjacks = stats.blackjack_blackjacks + 1;
        break;
    }
    
    if (Object.keys(updates).length > 0) {
      // Update stats
      await updateUserStats(userId, updates);
      
      // Check achievements
      const completedAchievements = [];
      
      // Check each relevant achievement type
      for (const [eventType, eventValue] of Object.entries(updates)) {
        const achievementType = eventTypeToAchievementType(eventType);
        if (achievementType) {
          const achievements = await checkAchievements(userId, achievementType, eventValue);
          completedAchievements.push(...achievements);
        }
      }
      
      return completedAchievements;
    }
    
    return [];
  } catch (err) {
    console.error('Error tracking event:', err);
    return [];
  }
}

// Track game play
async function trackGamePlay(userId, game, bet, outcome, winnings = 0) {
  try {
    // Track game stats
    if (outcome === 'win') {
      // Check for game-specific achievements
      if (game === 'blackjack') {
        // Check if it was a natural blackjack (can be tracked in game logic)
        // For example, call trackEvent(userId, 'blackjack_blackjack') when a player gets a blackjack
      }
      
      // Track cash won
      await trackEvent(userId, 'cash_won', winnings);
    }
    
    // Track cash wagered
    await trackEvent(userId, 'cash_wagered', bet);
    
    // Check general achievements - these use stats table which is updated by the games already
    const gamePlayedAchievements = await checkAchievements(userId, achievementTypes.GAMES_PLAYED);
    const gameWonAchievements = outcome === 'win' ? await checkAchievements(userId, achievementTypes.GAMES_WON) : [];
    
    return [...gamePlayedAchievements, ...gameWonAchievements];
  } catch (err) {
    console.error('Error tracking game play:', err);
    return [];
  }
}

// Track Crash game cashout
async function trackCrashCashout(userId, multiplier) {
  try {
    return await checkAchievements(userId, achievementTypes.CRASH_MULTIPLIER, multiplier);
  } catch (err) {
    console.error('Error tracking crash cashout:', err);
    return [];
  }
}

// Track HiLo streak
async function trackHiLoStreak(userId, streak) {
  try {
    return await checkAchievements(userId, achievementTypes.HILO_STREAK, streak);
  } catch (err) {
    console.error('Error tracking hilo streak:', err);
    return [];
  }
}

// Track Mines game
async function trackMinesSurvived(userId, tiles) {
  try {
    // Update mines survived count
    await trackEvent(userId, 'mines_survived', tiles);
    
    // Check achievements
    return await checkAchievements(userId, achievementTypes.MINES_SURVIVED);
  } catch (err) {
    console.error('Error tracking mines survived:', err);
    return [];
  }
}

// Create achievement embed
function createAchievementEmbed(achievements) {
  if (achievements.length === 0) return null;
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 Achievement Unlocked!');
  
  if (achievements.length === 1) {
    const achievement = achievements[0];
    embed.setDescription(`**${achievement.name}**\n${achievement.description}`);
    embed.addFields(
      { name: 'Reward', value: `${achievement.xp} XP`, inline: true }
    );
  } else {
    embed.setDescription(`You've unlocked ${achievements.length} achievements!`);
    
    const fields = achievements.map(achievement => {
      return {
        name: achievement.name,
        value: `${achievement.description}\nReward: ${achievement.xp} XP`,
        inline: false
      };
    });
    
    embed.addFields(fields);
  }
  
  return embed;
}

// Helper function to convert event type to achievement type
function eventTypeToAchievementType(eventType) {
  const mapping = {
    'cash_earned': achievementTypes.CASH_EARNED,
    'cash_won': achievementTypes.CASH_WON,
    'cash_wagered': achievementTypes.CASH_WAGERED,
    'mines_survived': achievementTypes.MINES_SURVIVED,
    'daily_streak': achievementTypes.DAILY_STREAK,
    'work_completed': achievementTypes.WORK_COMPLETED,
    'blackjack_blackjacks': achievementTypes.BLACKJACK_BLACKJACKS
  };
  
  return mapping[eventType];
}

module.exports = {
  getUserAchievements,
  getUserStats,
  trackEvent,
  trackGamePlay,
  trackCrashCashout,
  trackHiLoStreak,
  trackMinesSurvived,
  createAchievementEmbed,
  achievementTypes
};
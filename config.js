// Configuration for the Discord Gambling Bot
module.exports = {
  // Bot token should be stored in environment variables for security
  token: process.env.DISCORD_TOKEN,
  
  // Bot application ID for slash commands
  clientId: process.env.CLIENT_ID || '',
  
  // Economy settings
  economy: {
    startingCash: 1000,
    dailyReward: 500,
  },
  
  // Game cooldowns in milliseconds
  cooldowns: {
    coinflip: 60 * 1000, // 1 minute
    blackjack: 2 * 60 * 1000, // 2 minutes
    diceroll: 60 * 1000, // 1 minute
    slots: 2 * 60 * 1000, // 2 minutes
    roulette: 3 * 60 * 1000, // 3 minutes
    daily: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Game odds and payouts
  games: {
    coinflip: {
      winMultiplier: 2,
    },
    blackjack: {
      winMultiplier: 2,
      blackjackMultiplier: 2.5
    },
    diceroll: {
      multipliers: {
        d4: 3.5,
        d6: 5.5,
        d8: 7.5,
        d10: 9.5,
        d12: 11.5,
        d20: 19.5
      }
    },
    slots: {
      symbols: ['🍒', '🍋', '🍊', '🍉', '🍇', '💎', '7️⃣'],
      payouts: {
        '🍒🍒🍒': 2,
        '🍋🍋🍋': 3,
        '🍊🍊🍊': 4,
        '🍉🍉🍉': 5,
        '🍇🍇🍇': 6,
        '💎💎💎': 10,
        '7️⃣7️⃣7️⃣': 20
      }
    },
    roulette: {
      payouts: {
        'number': 36, // Single number bet (0, 00, or 1-36)
        'split': 18, // Two adjacent numbers
        'street': 12, // Three numbers in a row
        'corner': 9, // Four numbers forming a square
        'five': 7, // Five-number bet (0, 00, 1, 2, 3)
        'line': 6, // Six numbers in two rows
        'dozen': 3, // Twelve numbers (1-12, 13-24, 25-36)
        'column': 3, // Twelve numbers in a column
        'red': 2, // All red numbers
        'black': 2, // All black numbers
        'odd': 2, // All odd numbers
        'even': 2, // All even numbers
        'low': 2, // 1-18
        'high': 2 // 19-36
      }
    }
  }
};

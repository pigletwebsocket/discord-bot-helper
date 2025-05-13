const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows information about commands')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('Specific command to get help for')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Show commands in a specific category')
        .setRequired(false)
        .addChoices(
          { name: 'Economy', value: 'economy' },
          { name: 'Games', value: 'games' },
          { name: 'Mining', value: 'mining' },
          { name: 'Shop', value: 'shop' },
          { name: 'Utility', value: 'utility' }
        )),
  
  async execute(interaction) {
    try {
      // Get the options
      const commandName = interaction.options.getString('command');
      const category = interaction.options.getString('category');
      
      if (commandName) {
        // Show help for specific command
        await showCommandHelp(interaction, commandName);
      } else if (category) {
        // Show help for specific category
        await showCategoryHelp(interaction, category);
      } else {
        // Show general help
        await showGeneralHelp(interaction);
      }
    } catch (error) {
      console.error('Error in help command:', error);
      await interaction.reply({
        content: 'There was an error showing the help information. Please try again later.',
        ephemeral: true
      });
    }
  }
};

// Show general help with all command categories
async function showGeneralHelp(interaction) {
  try {
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Gambling Bot Help')
      .setDescription('Here\'s a list of all available command categories. Use `/help category <name>` to see commands in a specific category.')
      .setTimestamp()
      .setFooter({ text: 'Use "/help command <name>" to see detailed information about a specific command' });
    
    // Add categories
    embed.addFields(
      { name: '💰 Economy Commands', value: 
        '`balance`, `daily`, `work`, `profile`, `send`, `boosts`, `inventory`\n' +
        'Commands for managing your virtual currency and profile.',
        inline: false
      },
      { name: '🎲 Game Commands', value: 
        '`blackjack`, `coinflip`, `crash`, `diceroll`, `findthelady`, `hilo`, `mines`, ' +
        '`rockpaperscissors`, `roulette`, `slots`, `tictactoe`\n' +
        'Gambling games to play with your virtual currency.',
        inline: false
      },
      { name: '⛏️ Mining Commands', value: 
        '`start_mine`, `dig`, `process`, `craft`, `mine`, `mining_inventory`\n' +
        'Commands for the mining mini-game system.',
        inline: false
      },
      { name: '🛒 Shop Commands', value: 
        '`shop`, `buy`\n' +
        'Commands for buying items, boosts, and cosmetics.',
        inline: false
      },
      { name: '🔧 Utility Commands', value: 
        '`help`, `cooldowns`, `achievements`, `leaderboard`, `stats`, `invite`, ' +
        '`support`, `donate`, `delete_my_data`\n' +
        'Various utility and informational commands.',
        inline: false
      }
    );
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing general help:', error);
    throw error;
  }
}

// Show help for a specific command category
async function showCategoryHelp(interaction, category) {
  try {
    // Get commands in the category
    const commands = loadCommandsInCategory(category);
    
    if (commands.length === 0) {
      return interaction.reply({
        content: `No commands found in the category "${category}".`,
        ephemeral: true
      });
    }
    
    // Category display names and colors
    const categoryInfo = {
      economy: { 
        name: 'Economy Commands', 
        description: 'Commands for managing your virtual currency and profile.',
        color: '#00ff00',
        emoji: '💰'
      },
      games: { 
        name: 'Game Commands', 
        description: 'Gambling games to play with your virtual currency.',
        color: '#ff0000',
        emoji: '🎲'
      },
      mining: { 
        name: 'Mining Commands', 
        description: 'Commands for the mining mini-game system.',
        color: '#964B00',
        emoji: '⛏️'
      },
      shop: { 
        name: 'Shop Commands', 
        description: 'Commands for buying items, boosts, and cosmetics.',
        color: '#9933ff',
        emoji: '🛒'
      },
      utility: { 
        name: 'Utility Commands', 
        description: 'Various utility and informational commands.',
        color: '#0099ff',
        emoji: '🔧'
      }
    };
    
    const info = categoryInfo[category] || { 
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
      description: 'Commands in this category.',
      color: '#0099ff',
      emoji: '📚'
    };
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(info.color)
      .setTitle(`${info.emoji} ${info.name}`)
      .setDescription(info.description)
      .setTimestamp()
      .setFooter({ text: 'Use "/help command <name>" to see detailed information about a specific command' });
    
    // Add each command to the embed
    for (const command of commands) {
      embed.addFields({
        name: `/${command.data.name}`,
        value: command.data.description,
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing category help:', error);
    throw error;
  }
}

// Show detailed help for a specific command
async function showCommandHelp(interaction, commandName) {
  try {
    // Get all commands
    const commands = interaction.client.commands;
    
    // Find the command
    const command = commands.get(commandName);
    
    if (!command) {
      return interaction.reply({ 
        content: `I couldn't find a command called "${commandName}".`, 
        ephemeral: true 
      });
    }
    
    // Get command options if any
    const options = command.data.options || [];
    
    // Command-specific help
    const helpInfo = getCommandHelpInfo(commandName);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Command: /${commandName}`)
      .setDescription(command.data.description)
      .setTimestamp()
      .setFooter({ text: 'Gambling Bot Help System' });
    
    // Add usage information
    if (helpInfo.usage) {
      embed.addFields({ name: 'Usage', value: helpInfo.usage, inline: false });
    }
    
    // Add options if any
    if (options.length > 0) {
      let optionsText = '';
      
      for (const option of options) {
        if (option.type === 1) {
          // This is a subcommand, handle it specially
          optionsText += `**/${commandName} ${option.name}** - ${option.description}\n`;
        } else {
          const required = option.required ? ' (Required)' : ' (Optional)';
          optionsText += `**${option.name}**${required}: ${option.description}\n`;
        }
      }
      
      if (optionsText) {
        embed.addFields({ name: 'Options', value: optionsText, inline: false });
      }
    }
    
    // Add examples
    if (helpInfo.examples && helpInfo.examples.length > 0) {
      const examplesText = helpInfo.examples.join('\n');
      embed.addFields({ name: 'Examples', value: examplesText, inline: false });
    }
    
    // Add additional information if available
    if (helpInfo.additional) {
      embed.addFields({ name: 'Additional Information', value: helpInfo.additional, inline: false });
    }
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error showing command help:', error);
    throw error;
  }
}

// Load commands in a specific category
function loadCommandsInCategory(category) {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', category);
  
  // Check if the category directory exists
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        commands.push(command);
      }
    }
  }
  
  return commands;
}

// Get detailed help info for a specific command
function getCommandHelpInfo(commandName) {
  // Command-specific help
  const helpInfo = {
    // Economy commands
    balance: {
      usage: '`/balance`',
      examples: ['`/balance`'],
      additional: 'Check your current cash balance.'
    },
    daily: {
      usage: '`/daily`',
      examples: ['`/daily`'],
      additional: 'Claim your daily reward. Resets at midnight UTC.'
    },
    work: {
      usage: '`/work`',
      examples: ['`/work`'],
      additional: 'Work to earn some cash. Available every 10 minutes.'
    },
    profile: {
      usage: '`/profile [user] [view]`',
      examples: [
        '`/profile`', 
        '`/profile @username`',
        '`/profile view:statistics`',
        '`/profile view:achievements`'
      ],
      additional: 'View your gambling profile with statistics and achievements.'
    },
    send: {
      usage: '`/send recipient amount`',
      examples: [
        '`/send @username 1000`',
        '`/send @username max`'
      ],
      additional: 'Send cash to another player. A small tax is applied to the transaction.'
    },
    
    // Game commands
    blackjack: {
      usage: '`/blackjack bet [mode]`',
      examples: [
        '`/blackjack bet:100`',
        '`/blackjack bet:1000 mode:hard`'
      ],
      additional: 'Play a game of blackjack against the dealer. Get as close to 21 as possible without going over.'
    },
    coinflip: {
      usage: '`/coinflip prediction bet`',
      examples: [
        '`/coinflip prediction:heads bet:100`',
        '`/coinflip prediction:tails bet:500`'
      ],
      additional: 'Bet on a coin flip. Choose heads or tails.'
    },
    crash: {
      usage: '`/crash bet [mode]`',
      examples: [
        '`/crash bet:100`',
        '`/crash bet:1000 mode:hard`'
      ],
      additional: 'Play the crash game. Try to cash out before the multiplier crashes!'
    },
    diceroll: {
      usage: '`/diceroll dice-type prediction bet`',
      examples: [
        '`/diceroll dice-type:d6 prediction:3 bet:100`',
        '`/diceroll dice-type:d20 prediction:20 bet:500`'
      ],
      additional: 'Roll a dice and bet on the outcome. Available dice: d4, d6, d8, d10, d12, d20'
    },
    
    // Mining commands
    start_mine: {
      usage: '`/start_mine [name]`',
      examples: [
        '`/start_mine`',
        '`/start_mine name:My Awesome Mine`'
      ],
      additional: 'Start your mining career or rename your mine.'
    },
    dig: {
      usage: '`/dig`',
      examples: ['`/dig`'],
      additional: 'Dig in your mine to collect resources like coal, iron, and gold.'
    },
    process: {
      usage: '`/process`',
      examples: ['`/process`'],
      additional: 'Process unprocessed materials into rare resources like diamonds and emeralds.'
    },
    
    // Utility commands
    help: {
      usage: '`/help [command] [category]`',
      examples: [
        '`/help`',
        '`/help command:blackjack`',
        '`/help category:games`'
      ],
      additional: 'Get help for all commands, a specific command, or a category of commands.'
    },
    stats: {
      usage: '`/stats`',
      examples: ['`/stats`'],
      additional: 'Show bot statistics, ping, and system information.'
    },
    leaderboard: {
      usage: '`/leaderboard type [global]`',
      examples: [
        '`/leaderboard type:cash`',
        '`/leaderboard type:blackjack global:true`'
      ],
      additional: 'View leaderboards for various statistics. Set global to true to see global rankings instead of server-only rankings.'
    }
  };
  
  return helpInfo[commandName] || {
    usage: `\`/${commandName}\``,
    examples: [`\`/${commandName}\``]
  };
}

const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows information about bot commands')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('Specific command to get help with')
        .setRequired(false)),
  
  async execute(interaction) {
    const commandName = interaction.options.getString('command');
    
    // If no specific command, show general help
    if (!commandName) {
      return await showGeneralHelp(interaction);
    }
    
    // Show help for specific command
    return await showCommandHelp(interaction, commandName);
  }
};

// Show general help with command categories
async function showGeneralHelp(interaction) {
  // Load all command folders
  const commandsPath = path.join(__dirname, '../..');
  const commandFolders = fs.readdirSync(path.join(commandsPath, 'commands'));
  
  // Group commands by category
  const commandsByCategory = {};
  
  for (const folder of commandFolders) {
    const categoryCommands = [];
    const commandFiles = fs.readdirSync(path.join(commandsPath, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, 'commands', folder, file));
      if (command.data) {
        categoryCommands.push({
          name: command.data.name,
          description: command.data.description
        });
      }
    }
    
    if (categoryCommands.length > 0) {
      commandsByCategory[folder] = categoryCommands;
    }
  }
  
  // Create help embed
  const helpEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Gamble Bot Help')
    .setDescription('Here are the available commands:')
    .setTimestamp()
    .setFooter({ text: 'Use /help <command> for details on a specific command' });
  
  // Add fields for each category
  for (const [category, commands] of Object.entries(commandsByCategory)) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const commandList = commands.map(cmd => `\`/${cmd.name}\` - ${cmd.description}`).join('\n');
    
    helpEmbed.addFields({ name: categoryName, value: commandList });
  }
  
  // Send the embed
  await interaction.reply({ embeds: [helpEmbed] });
}

// Show help for a specific command
async function showCommandHelp(interaction, commandName) {
  const commandsPath = path.join(__dirname, '../..');
  const commandFolders = fs.readdirSync(path.join(commandsPath, 'commands'));
  
  let command = null;
  let commandFile = null;
  
  // Look for the command in all folders
  outerLoop:
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(path.join(commandsPath, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const currentCommand = require(path.join(commandsPath, 'commands', folder, file));
      if (currentCommand.data && currentCommand.data.name === commandName) {
        command = currentCommand;
        commandFile = file;
        break outerLoop;
      }
    }
  }
  
  // If command not found
  if (!command) {
    return await interaction.reply({
      content: `Command \`/${commandName}\` not found. Use \`/help\` to see all available commands.`,
      ephemeral: true
    });
  }
  
  // Create command help embed
  const commandEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Command: /${command.data.name}`)
    .setDescription(command.data.description)
    .setTimestamp()
    .setFooter({ text: 'Gamble Bot' });
  
  // Add options if any
  if (command.data.options && command.data.options.length > 0) {
    const options = command.data.options.map(option => {
      const required = option.required ? '(required)' : '(optional)';
      let choicesText = '';
      
      if (option.choices) {
        choicesText = `\nChoices: ${option.choices.map(choice => choice.name).join(', ')}`;
      }
      
      return `\`${option.name}\` - ${option.description} ${required}${choicesText}`;
    }).join('\n');
    
    commandEmbed.addFields({ name: 'Options', value: options });
  }
  
  // Add examples if available
  if (command.examples) {
    commandEmbed.addFields({ name: 'Examples', value: command.examples.join('\n') });
  } else {
    // Generate a basic example
    const example = `/${command.data.name}`;
    commandEmbed.addFields({ name: 'Example', value: example });
  }
  
  // Add aliases if available
  if (command.aliases) {
    commandEmbed.addFields({ name: 'Aliases', value: command.aliases.join(', ') });
  }
  
  // Send the embed
  await interaction.reply({ embeds: [commandEmbed] });
}

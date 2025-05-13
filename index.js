const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds
  ] 
});

// Initialize collections for commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands from the commands directory
const loadCommands = (dir) => {
  const commandFolders = fs.readdirSync(dir);
  
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`${dir}/${folder}`).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`${dir}/${folder}/${file}`);
      // Set a new item in the Collection with the key as the command name and the value as the command module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
      } else {
        console.log(`[WARNING] The command at ${dir}/${folder}/${file} is missing a required "data" or "execute" property.`);
      }
    }
  }
};

// Load commands
loadCommands('./src/commands');

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    const errorMessage = { 
      content: 'There was an error while executing this command!', 
      ephemeral: true 
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Log in to Discord with the client token
client.login(config.token);

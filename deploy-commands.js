const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
// Grab all command files from the commands directory
const loadCommands = (dir) => {
  const commandFolders = fs.readdirSync(dir);
  
  for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`${dir}/${folder}`).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`${dir}/${folder}/${file}`);
      // Push to the commands array
      if ('data' in command) {
        commands.push(command.data.toJSON());
      } else {
        console.log(`[WARNING] The command at ${dir}/${folder}/${file} is missing a required "data" property.`);
      }
    }
  }
};

// Load commands
loadCommands('./src/commands');

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands with the current set
    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // Catch and log any errors!
    console.error(error);
  }
})();

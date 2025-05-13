const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get a link to the support server'),
  
  async execute(interaction) {
    try {
      // Support server invite link
      // Note: Replace this with your actual support server link when setting up the bot
      const supportServerLink = "https://discord.gg/yourserver";
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Gambling Bot Support')
        .setDescription('Need help with the bot? Join our support server!')
        .addFields(
          { name: 'Support Server', value: `[Click here to join the support server](${supportServerLink})`, inline: false },
          { name: 'Available Support', value: 
            '• Bot troubleshooting\n' +
            '• Command assistance\n' +
            '• Bug reporting\n' +
            '• Feature requests\n' +
            '• General questions',
            inline: false
          },
          { name: 'Documentation', value: 'You can also check out our documentation with `/help` for detailed command information.', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Thanks for using Gambling Bot!' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in support command:', error);
      await interaction.reply({
        content: 'There was an error generating the support server link. Please try again later.',
        ephemeral: true
      });
    }
  }
};
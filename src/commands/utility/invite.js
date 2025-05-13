const { SlashCommandBuilder, EmbedBuilder, OAuth2Scopes, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get an invite link to add the bot to your server'),
  
  async execute(interaction) {
    try {
      const client = interaction.client;
      
      // Create an OAuth2 URL for bot invitation
      const inviteUrl = client.generateInviteURL || client.generateInviteUrl;
      
      // Create an invite link with required permissions
      const link = client.generateInviteUrl ? 
        client.generateInviteUrl({
          scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
          permissions: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.UseExternalEmojis,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles
          ]
        }) :
        `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=274878024704&scope=bot%20applications.commands`;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Invite Gambling Bot')
        .setDescription(`Want to add ${client.user.username} to your own server? Click the link below!`)
        .addFields(
          { name: 'Invite Link', value: `[Click here to invite the bot](${link})`, inline: false },
          { name: 'Required Permissions', value: 
            '• Send Messages\n' +
            '• View Channels\n' +
            '• Read Message History\n' +
            '• Use External Emojis\n' +
            '• Add Reactions\n' +
            '• Embed Links\n' +
            '• Attach Files',
            inline: false
          },
          { name: 'Support', value: 'If you need help or have questions, use the `/support` command to join our support server.', inline: false }
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Thanks for your interest in Gambling Bot!' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in invite command:', error);
      await interaction.reply({
        content: 'There was an error generating the invite link. Please try again later.',
        ephemeral: true
      });
    }
  }
};
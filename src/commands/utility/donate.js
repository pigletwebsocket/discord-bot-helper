const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('donate')
    .setDescription('Support the bot development by donating')
    .addStringOption(option =>
      option.setName('platform')
        .setDescription('The donation platform to use')
        .setRequired(false)
        .addChoices(
          { name: 'PayPal', value: 'paypal' },
          { name: 'Patreon', value: 'patreon' },
          { name: 'Ko-fi', value: 'kofi' }
        )),
  
  async execute(interaction) {
    try {
      const platform = interaction.options.getString('platform');
      
      // Donation links - replace these with actual links when setting up the bot
      const donationLinks = {
        paypal: "https://paypal.me/yourname",
        patreon: "https://patreon.com/yourname",
        kofi: "https://ko-fi.com/yourname"
      };
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#F96854') // Patreon-like color
        .setTitle('Support Gambling Bot')
        .setDescription('Thank you for considering supporting the development of Gambling Bot! Your donations help keep the servers running and enable new features.')
        .setTimestamp()
        .setFooter({ text: 'Thanks for your support!' });
      
      // Add specific platform or all platforms
      if (platform) {
        // Display specific platform
        const platformNames = {
          paypal: "PayPal",
          patreon: "Patreon",
          kofi: "Ko-fi"
        };
        
        embed.addFields({
          name: `Donate with ${platformNames[platform]}`,
          value: `[Click here to donate](${donationLinks[platform]})`,
          inline: false
        });
        
        embed.setColor(platform === 'paypal' ? '#003087' : platform === 'patreon' ? '#F96854' : '#29ABE0');
      } else {
        // Display all platforms
        embed.addFields(
          { name: 'Donation Options', value: 
            `[PayPal](${donationLinks.paypal}) - One-time donations\n` +
            `[Patreon](${donationLinks.patreon}) - Monthly support with perks\n` +
            `[Ko-fi](${donationLinks.kofi}) - Buy us a coffee`,
            inline: false
          },
          { name: 'Donor Benefits', value: 
            '• Special role in our support server\n' +
            '• Increased betting limits\n' +
            '• Exclusive cosmetic items\n' +
            '• Early access to new features\n' +
            '• Custom profile backgrounds',
            inline: false
          },
          { name: 'Other Ways to Support', value: 'You can also support us by voting for the bot, inviting it to your servers, and telling your friends about it!', inline: false }
        );
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in donate command:', error);
      await interaction.reply({
        content: 'There was an error generating the donation information. Please try again later.',
        ephemeral: true
      });
    }
  }
};
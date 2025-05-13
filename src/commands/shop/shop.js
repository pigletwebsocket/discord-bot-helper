const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

// Define shop items
const shopItems = {
  boosts: [
    {
      id: 'cash_boost_small',
      name: 'Small Cash Boost',
      description: 'Earn 10% more cash for 1 hour',
      price: 5000,
      duration: 60 * 60 * 1000, // 1 hour in milliseconds
      multiplier: 1.1,
      type: 'cash_boost'
    },
    {
      id: 'cash_boost_medium',
      name: 'Medium Cash Boost',
      description: 'Earn 25% more cash for 3 hours',
      price: 12500,
      duration: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
      multiplier: 1.25,
      type: 'cash_boost'
    },
    {
      id: 'cash_boost_large',
      name: 'Large Cash Boost',
      description: 'Earn 50% more cash for 8 hours',
      price: 25000,
      duration: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
      multiplier: 1.5,
      type: 'cash_boost'
    },
    {
      id: 'xp_boost_small',
      name: 'Small XP Boost',
      description: 'Earn 25% more XP for 2 hours',
      price: 10000,
      duration: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
      multiplier: 1.25,
      type: 'xp_boost'
    },
    {
      id: 'xp_boost_medium',
      name: 'Medium XP Boost',
      description: 'Earn 50% more XP for 5 hours',
      price: 20000,
      duration: 5 * 60 * 60 * 1000, // 5 hours in milliseconds
      multiplier: 1.5,
      type: 'xp_boost'
    }
  ],
  items: [
    {
      id: 'daily_cooldown_reducer',
      name: 'Daily Cooldown Reducer',
      description: 'Reduce your daily command cooldown by 2 hours',
      price: 15000,
      type: 'consumable',
      effect: 'Reduces daily cooldown by 2 hours'
    },
    {
      id: 'lucky_charm',
      name: 'Lucky Charm',
      description: 'Slightly increases your chance of winning in games for 1 hour',
      price: 30000,
      duration: 60 * 60 * 1000, // 1 hour in milliseconds
      type: 'buff',
      effect: 'Increases win chance by 5%'
    },
    {
      id: 'double_down',
      name: 'Double Down Token',
      description: 'Double your next win (one-time use)',
      price: 50000,
      type: 'consumable',
      effect: 'Doubles the next win'
    }
  ],
  cosmetics: [
    {
      id: 'profile_background_gold',
      name: 'Gold Profile Background',
      description: 'Shows your wealth with a gold profile background',
      price: 100000,
      type: 'profile_background',
      effect: 'Changes profile background to gold'
    },
    {
      id: 'profile_border_diamond',
      name: 'Diamond Profile Border',
      description: 'Add a sparkling diamond border to your profile',
      price: 250000,
      type: 'profile_border',
      effect: 'Adds a diamond border to your profile'
    },
    {
      id: 'custom_title',
      name: 'Custom Title',
      description: 'Set a custom title on your profile',
      price: 500000,
      type: 'profile_title',
      effect: 'Allows setting a custom title'
    }
  ]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the shop to spend your cash')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('Shop category to view')
        .setRequired(true)
        .addChoices(
          { name: 'Boosts', value: 'boosts' },
          { name: 'Items', value: 'items' },
          { name: 'Cosmetics', value: 'cosmetics' },
          { name: 'All', value: 'all' }
        )),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get the selected category
      const category = interaction.options.getString('category');
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Create shop embed
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🛒 Gambling Bot Shop')
        .setDescription(`Welcome to the shop! You have ${formatter.formatCash(user.cash)} to spend.\nUse \`/buy\` command to purchase items.`)
        .setTimestamp()
        .setFooter({ text: 'Gamble Bot - Shop' });
      
      // Add items based on category
      if (category === 'all' || category === 'boosts') {
        embed.addFields({
          name: '🚀 Boosts',
          value: shopItems.boosts.map(item => 
            `**${item.name}** - ${formatter.formatCash(item.price)}\n${item.description}`
          ).join('\n\n'),
          inline: false
        });
      }
      
      if (category === 'all' || category === 'items') {
        embed.addFields({
          name: '🎁 Items',
          value: shopItems.items.map(item => 
            `**${item.name}** - ${formatter.formatCash(item.price)}\n${item.description}`
          ).join('\n\n'),
          inline: false
        });
      }
      
      if (category === 'all' || category === 'cosmetics') {
        embed.addFields({
          name: '✨ Cosmetics',
          value: shopItems.cosmetics.map(item => 
            `**${item.name}** - ${formatter.formatCash(item.price)}\n${item.description}`
          ).join('\n\n'),
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in shop command:', error);
      await interaction.editReply({
        content: 'There was an error displaying the shop. Please try again later.'
      });
    }
  }
};
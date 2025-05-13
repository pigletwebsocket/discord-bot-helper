const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View your inventory of items and cosmetics')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to view inventory of (default: yourself)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Category of items to view')
        .setRequired(false)
        .addChoices(
          { name: 'All', value: 'all' },
          { name: 'Boosts', value: 'boosts' },
          { name: 'Items', value: 'items' },
          { name: 'Cosmetics', value: 'cosmetics' }
        )),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get user
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const category = interaction.options.getString('category') || 'all';
      
      // Get user data
      const userData = await db.getUser(targetUser.id, targetUser.username);
      
      // Get inventory items
      const result = await db.db.query(`
        SELECT * FROM inventory WHERE user_id = $1
      `, [targetUser.id]);
      
      const inventoryItems = result.rows;
      
      // Filter items by category if specified
      let filteredItems = inventoryItems;
      
      if (category === 'boosts') {
        filteredItems = inventoryItems.filter(item => item.item_id.includes('_boost_'));
      } else if (category === 'items') {
        filteredItems = inventoryItems.filter(item => 
          !item.item_id.includes('_boost_') && 
          !item.item_id.includes('profile_')
        );
      } else if (category === 'cosmetics') {
        filteredItems = inventoryItems.filter(item => item.item_id.includes('profile_'));
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${targetUser.username}'s Inventory`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: 'Use /shop to buy more items' });
      
      if (filteredItems.length === 0) {
        embed.setDescription(`${targetUser.id === interaction.user.id ? 'You don\'t' : `${targetUser.username} doesn't`} have any ${category !== 'all' ? category : 'items'} in ${targetUser.id === interaction.user.id ? 'your' : 'their'} inventory.`);
      } else {
        // Group items by type
        const boosts = filteredItems.filter(item => item.item_id.includes('_boost_'));
        const cosmetics = filteredItems.filter(item => item.item_id.includes('profile_'));
        const regularItems = filteredItems.filter(item => 
          !item.item_id.includes('_boost_') && 
          !item.item_id.includes('profile_')
        );
        
        // Add boosts section
        if (boosts.length > 0 && (category === 'all' || category === 'boosts')) {
          const boostsText = boosts.map(item => {
            return `**${getItemName(item.item_id)}** (${item.quantity}x)\n` +
                   `Purchased: ${new Date(item.purchased_at).toLocaleDateString()}\n`;
          }).join('\n');
          
          embed.addFields({ name: '🚀 Boosts', value: boostsText, inline: false });
        }
        
        // Add items section
        if (regularItems.length > 0 && (category === 'all' || category === 'items')) {
          const itemsText = regularItems.map(item => {
            return `**${getItemName(item.item_id)}** (${item.quantity}x)\n` +
                   `Purchased: ${new Date(item.purchased_at).toLocaleDateString()}\n` +
                   `${item.active ? '✅ Active' : ''}\n`;
          }).join('\n');
          
          embed.addFields({ name: '🎁 Items', value: itemsText, inline: false });
        }
        
        // Add cosmetics section
        if (cosmetics.length > 0 && (category === 'all' || category === 'cosmetics')) {
          const cosmeticsText = cosmetics.map(item => {
            return `**${getItemName(item.item_id)}**\n` +
                   `Purchased: ${new Date(item.purchased_at).toLocaleDateString()}\n` +
                   `${item.active ? '✅ Active' : '❌ Inactive'}\n`;
          }).join('\n');
          
          embed.addFields({ name: '✨ Cosmetics', value: cosmeticsText, inline: false });
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in inventory command:', error);
      await interaction.editReply({
        content: 'There was an error fetching inventory. Please try again later.'
      });
    }
  }
};

// Helper function to get item name
function getItemName(itemId) {
  const itemNames = {
    // Boosts
    'cash_boost_small': 'Small Cash Boost',
    'cash_boost_medium': 'Medium Cash Boost',
    'cash_boost_large': 'Large Cash Boost',
    'xp_boost_small': 'Small XP Boost',
    'xp_boost_medium': 'Medium XP Boost',
    
    // Regular items
    'daily_cooldown_reducer': 'Daily Cooldown Reducer',
    'lucky_charm': 'Lucky Charm',
    'double_down': 'Double Down Token',
    
    // Cosmetics
    'profile_background_gold': 'Gold Profile Background',
    'profile_border_diamond': 'Diamond Profile Border',
    'custom_title': 'Custom Title'
  };
  
  return itemNames[itemId] || itemId;
}
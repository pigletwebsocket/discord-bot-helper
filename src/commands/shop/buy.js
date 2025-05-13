const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');

// Define shop items (same as in shop.js)
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

// Helper function to find an item by ID
function findItemById(itemId) {
  // Check all categories
  for (const category of Object.keys(shopItems)) {
    const item = shopItems[category].find(item => item.id === itemId);
    if (item) return item;
  }
  return null;
}

// Database table initialization
async function initInventoryDb() {
  try {
    // Check if db.db exists (might be null if database is not initialized)
    if (!db.db) {
      console.error('Database not initialized yet');
      return;
    }
    
    // Create inventory table
    await db.db.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        purchased_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP,
        active BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(user_id, item_id)
      )
    `);
    
    // Create active_boosts table
    await db.db.query(`
      CREATE TABLE IF NOT EXISTS active_boosts (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        boost_id TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        multiplier REAL NOT NULL,
        boost_type TEXT NOT NULL,
        UNIQUE(user_id, boost_type)
      )
    `);
    
    console.log('Inventory database initialized');
  } catch (err) {
    console.error('Error initializing inventory database:', err);
  }
}

// Initialize the database tables
initInventoryDb();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(option => 
      option.setName('item')
        .setDescription('The item to buy')
        .setRequired(true)
        .addChoices(
          // Add boosts
          { name: 'Small Cash Boost', value: 'cash_boost_small' },
          { name: 'Medium Cash Boost', value: 'cash_boost_medium' },
          { name: 'Large Cash Boost', value: 'cash_boost_large' },
          { name: 'Small XP Boost', value: 'xp_boost_small' },
          { name: 'Medium XP Boost', value: 'xp_boost_medium' },
          // Add items
          { name: 'Daily Cooldown Reducer', value: 'daily_cooldown_reducer' },
          { name: 'Lucky Charm', value: 'lucky_charm' },
          { name: 'Double Down Token', value: 'double_down' },
          // Add cosmetics
          { name: 'Gold Profile Background', value: 'profile_background_gold' },
          { name: 'Diamond Profile Border', value: 'profile_border_diamond' },
          { name: 'Custom Title', value: 'custom_title' }
        ))
    .addIntegerOption(option => 
      option.setName('quantity')
        .setDescription('The quantity to buy')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),
  
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get item ID and quantity
      const itemId = interaction.options.getString('item');
      const quantity = interaction.options.getInteger('quantity') || 1;
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Find the item in the shop
      const item = findItemById(itemId);
      
      if (!item) {
        return interaction.editReply({
          content: 'Item not found in the shop.'
        });
      }
      
      // Calculate total cost
      const totalCost = item.price * quantity;
      
      // Check if user has enough cash
      if (user.cash < totalCost) {
        return interaction.editReply({
          content: `You don't have enough cash to buy ${quantity}x ${item.name}. You need ${formatter.formatCash(totalCost)} but only have ${formatter.formatCash(user.cash)}.`
        });
      }
      
      // Process purchase based on item type
      if (item.type === 'cash_boost' || item.type === 'xp_boost') {
        // Handle boost purchase
        await handleBoostPurchase(interaction, user, item, quantity, totalCost);
      } else if (item.type.startsWith('profile_')) {
        // Handle cosmetic purchase
        await handleCosmeticPurchase(interaction, user, item, totalCost);
      } else {
        // Handle regular item purchase
        await handleItemPurchase(interaction, user, item, quantity, totalCost);
      }
      
    } catch (error) {
      console.error('Error in buy command:', error);
      await interaction.editReply({
        content: 'There was an error processing your purchase. Please try again later.'
      });
    }
  }
};

// Handle purchase of boosts
async function handleBoostPurchase(interaction, user, item, quantity, totalCost) {
  try {
    // Remove cash from user
    await db.removeCash(user.id, totalCost);
    
    // Check if user already has this boost in inventory
    const existingBoost = await db.db.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2',
      [user.id, item.id]
    );
    
    if (existingBoost.rows.length > 0) {
      // Update quantity
      await db.db.query(
        'UPDATE inventory SET quantity = quantity + $1 WHERE user_id = $2 AND item_id = $3',
        [quantity, user.id, item.id]
      );
    } else {
      // Add to inventory
      await db.db.query(
        'INSERT INTO inventory (user_id, item_id, quantity) VALUES ($1, $2, $3)',
        [user.id, item.id, quantity]
      );
    }
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Purchase Successful')
      .setDescription(`You bought ${quantity}x ${item.name} for ${formatter.formatCash(totalCost)}!\n\nUse \`/boosts\` to view and activate your boosts.`)
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot - Shop' });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error handling boost purchase:', error);
    throw error;
  }
}

// Handle purchase of regular items
async function handleItemPurchase(interaction, user, item, quantity, totalCost) {
  try {
    // Remove cash from user
    await db.removeCash(user.id, totalCost);
    
    // Check if user already has this item in inventory
    const existingItem = await db.db.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2',
      [user.id, item.id]
    );
    
    if (existingItem.rows.length > 0) {
      // Update quantity
      await db.db.query(
        'UPDATE inventory SET quantity = quantity + $1 WHERE user_id = $2 AND item_id = $3',
        [quantity, user.id, item.id]
      );
    } else {
      // Add to inventory
      await db.db.query(
        'INSERT INTO inventory (user_id, item_id, quantity) VALUES ($1, $2, $3)',
        [user.id, item.id, quantity]
      );
    }
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Purchase Successful')
      .setDescription(`You bought ${quantity}x ${item.name} for ${formatter.formatCash(totalCost)}!\n\nUse \`/inventory\` to view your items.`)
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot - Shop' });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error handling item purchase:', error);
    throw error;
  }
}

// Handle purchase of cosmetics
async function handleCosmeticPurchase(interaction, user, item, totalCost) {
  try {
    // Check if user already has this cosmetic
    const existingCosmetic = await db.db.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2',
      [user.id, item.id]
    );
    
    if (existingCosmetic.rows.length > 0) {
      return interaction.editReply({
        content: `You already own the ${item.name} cosmetic!`
      });
    }
    
    // Remove cash from user
    await db.removeCash(user.id, totalCost);
    
    // Add to inventory
    await db.db.query(
      'INSERT INTO inventory (user_id, item_id, quantity) VALUES ($1, $2, 1)',
      [user.id, item.id]
    );
    
    // If it's a profile background or border, automatically activate it
    if (item.type === 'profile_background' || item.type === 'profile_border') {
      // Deactivate any other item of the same type
      await db.db.query(
        'UPDATE inventory SET active = false WHERE user_id = $1 AND item_id != $2 AND item_id LIKE $3',
        [user.id, item.id, `${item.type}%`]
      );
      
      // Activate this item
      await db.db.query(
        'UPDATE inventory SET active = true WHERE user_id = $1 AND item_id = $2',
        [user.id, item.id]
      );
    }
    
    // Create success embed
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('Purchase Successful')
      .setDescription(`You bought the ${item.name} cosmetic for ${formatter.formatCash(totalCost)}!\n\n${item.type === 'profile_title' ? 'Use `/customtitle` to set your custom title.' : 'The cosmetic has been automatically applied to your profile.'}\n\nUse \`/profile\` to see your profile with the new cosmetic.`)
      .setTimestamp()
      .setFooter({ text: 'Gamble Bot - Shop' });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error handling cosmetic purchase:', error);
    throw error;
  }
}
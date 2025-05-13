// Mining system database operations
const { db } = require('./db');

// Initialize database tables for mining
async function initMiningDb() {
  try {
    // Create mines table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mines (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        prestige INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_dig TIMESTAMP,
        unprocessed_materials INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Create mine_resources table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mine_resources (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, resource_id)
      )
    `);
    
    // Create mine_units table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mine_units (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        unit_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, unit_id)
      )
    `);
    
    // Create mine_crafting table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mine_crafting (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, item_id)
      )
    `);
    
    console.log('Mining database initialized');
  } catch (err) {
    console.error('Error initializing mining database:', err);
  }
}

// Initialize database
initMiningDb();

// Get or create mine
async function getMine(userId, username) {
  try {
    // Try to get mine
    const result = await db.query('SELECT * FROM mines WHERE user_id = $1', [userId]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Mine doesn't exist, create it
    return createMine(userId, username);
  } catch (err) {
    console.error('Error in getMine:', err);
    throw err;
  }
}

// Create a new mine
async function createMine(userId, name) {
  try {
    const result = await db.query(
      'INSERT INTO mines (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );
    
    // Add starter resources
    await addResource(userId, 'coal', 0);
    await addResource(userId, 'iron', 0);
    await addResource(userId, 'gold', 0);
    await addResource(userId, 'diamond', 0);
    await addResource(userId, 'emerald', 0);
    await addResource(userId, 'redstone', 0);
    await addResource(userId, 'lapis', 0);
    
    // Add starter crafting materials
    await addCraftingItem(userId, 'tech_part', 0);
    await addCraftingItem(userId, 'utility_part', 0);
    await addCraftingItem(userId, 'production_part', 0);
    
    // Add starter units
    await addUnit(userId, 'miner', 1);
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in createMine:', err);
    throw err;
  }
}

// Update mine
async function updateMine(userId, updateData) {
  try {
    // Build dynamic SET clause and values array
    const setClause = [];
    const values = [userId];
    let valueIndex = 2;

    for (const [key, value] of Object.entries(updateData)) {
      setClause.push(`${key} = $${valueIndex}`);
      values.push(value);
      valueIndex++;
    }

    if (setClause.length === 0) {
      return null; // No updates to apply
    }

    const query = `UPDATE mines SET ${setClause.join(', ')} WHERE user_id = $1 RETURNING *`;

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error in updateMine:', err);
    throw err;
  }
}

// Get all resources for a user
async function getResources(userId) {
  try {
    const result = await db.query(
      'SELECT resource_id, quantity FROM mine_resources WHERE user_id = $1',
      [userId]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error in getResources:', err);
    throw err;
  }
}

// Get specific resource for a user
async function getResource(userId, resourceId) {
  try {
    const result = await db.query(
      'SELECT resource_id, quantity FROM mine_resources WHERE user_id = $1 AND resource_id = $2',
      [userId, resourceId]
    );
    
    if (result.rows.length === 0) {
      return { resource_id: resourceId, quantity: 0 };
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in getResource:', err);
    throw err;
  }
}

// Add resource to user
async function addResource(userId, resourceId, quantity) {
  try {
    if (quantity === 0) {
      // Just check if resource exists and create if not
      const result = await db.query(
        'SELECT * FROM mine_resources WHERE user_id = $1 AND resource_id = $2',
        [userId, resourceId]
      );
      
      if (result.rows.length === 0) {
        await db.query(
          'INSERT INTO mine_resources (user_id, resource_id, quantity) VALUES ($1, $2, 0)',
          [userId, resourceId]
        );
      }
      
      return { resource_id: resourceId, quantity: result.rows.length > 0 ? result.rows[0].quantity : 0 };
    }
    
    // Try to update existing resource
    const result = await db.query(
      `INSERT INTO mine_resources (user_id, resource_id, quantity) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, resource_id) 
       DO UPDATE SET quantity = mine_resources.quantity + $3
       RETURNING *`,
      [userId, resourceId, quantity]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in addResource:', err);
    throw err;
  }
}

// Remove resource from user
async function removeResource(userId, resourceId, quantity) {
  try {
    // Check if user has enough of the resource
    const currentResource = await getResource(userId, resourceId);
    
    if (currentResource.quantity < quantity) {
      throw new Error(`Not enough ${resourceId}`);
    }
    
    // Update resource
    const result = await db.query(
      'UPDATE mine_resources SET quantity = quantity - $3 WHERE user_id = $1 AND resource_id = $2 RETURNING *',
      [userId, resourceId, quantity]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in removeResource:', err);
    throw err;
  }
}

// Get all units for a user
async function getUnits(userId) {
  try {
    const result = await db.query(
      'SELECT unit_id, quantity, level FROM mine_units WHERE user_id = $1',
      [userId]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error in getUnits:', err);
    throw err;
  }
}

// Get specific unit for a user
async function getUnit(userId, unitId) {
  try {
    const result = await db.query(
      'SELECT unit_id, quantity, level FROM mine_units WHERE user_id = $1 AND unit_id = $2',
      [userId, unitId]
    );
    
    if (result.rows.length === 0) {
      return { unit_id: unitId, quantity: 0, level: 1 };
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in getUnit:', err);
    throw err;
  }
}

// Add unit to user
async function addUnit(userId, unitId, quantity, level = 1) {
  try {
    // Check if unit exists
    const existingUnit = await getUnit(userId, unitId);
    
    if (existingUnit.quantity === 0) {
      // Unit doesn't exist, create it
      const result = await db.query(
        'INSERT INTO mine_units (user_id, unit_id, quantity, level) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, unitId, quantity, level]
      );
      
      return result.rows[0];
    } else {
      // Unit exists, update quantity
      const result = await db.query(
        'UPDATE mine_units SET quantity = quantity + $3 WHERE user_id = $1 AND unit_id = $2 RETURNING *',
        [userId, unitId, quantity]
      );
      
      return result.rows[0];
    }
  } catch (err) {
    console.error('Error in addUnit:', err);
    throw err;
  }
}

// Upgrade unit
async function upgradeUnit(userId, unitId, levels = 1) {
  try {
    // Check if unit exists
    const existingUnit = await getUnit(userId, unitId);
    
    if (existingUnit.quantity === 0) {
      throw new Error(`User doesn't have any ${unitId} units`);
    }
    
    // Upgrade unit
    const result = await db.query(
      'UPDATE mine_units SET level = level + $3 WHERE user_id = $1 AND unit_id = $2 RETURNING *',
      [userId, unitId, levels]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in upgradeUnit:', err);
    throw err;
  }
}

// Get all crafting items for a user
async function getCraftingItems(userId) {
  try {
    const result = await db.query(
      'SELECT item_id, quantity FROM mine_crafting WHERE user_id = $1',
      [userId]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error in getCraftingItems:', err);
    throw err;
  }
}

// Get specific crafting item for a user
async function getCraftingItem(userId, itemId) {
  try {
    const result = await db.query(
      'SELECT item_id, quantity FROM mine_crafting WHERE user_id = $1 AND item_id = $2',
      [userId, itemId]
    );
    
    if (result.rows.length === 0) {
      return { item_id: itemId, quantity: 0 };
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in getCraftingItem:', err);
    throw err;
  }
}

// Add crafting item to user
async function addCraftingItem(userId, itemId, quantity) {
  try {
    if (quantity === 0) {
      // Just check if item exists and create if not
      const result = await db.query(
        'SELECT * FROM mine_crafting WHERE user_id = $1 AND item_id = $2',
        [userId, itemId]
      );
      
      if (result.rows.length === 0) {
        await db.query(
          'INSERT INTO mine_crafting (user_id, item_id, quantity) VALUES ($1, $2, 0)',
          [userId, itemId]
        );
      }
      
      return { item_id: itemId, quantity: result.rows.length > 0 ? result.rows[0].quantity : 0 };
    }
    
    // Try to update existing item
    const result = await db.query(
      `INSERT INTO mine_crafting (user_id, item_id, quantity) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, item_id) 
       DO UPDATE SET quantity = mine_crafting.quantity + $3
       RETURNING *`,
      [userId, itemId, quantity]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in addCraftingItem:', err);
    throw err;
  }
}

// Remove crafting item from user
async function removeCraftingItem(userId, itemId, quantity) {
  try {
    // Check if user has enough of the item
    const currentItem = await getCraftingItem(userId, itemId);
    
    if (currentItem.quantity < quantity) {
      throw new Error(`Not enough ${itemId}`);
    }
    
    // Update item
    const result = await db.query(
      'UPDATE mine_crafting SET quantity = quantity - $3 WHERE user_id = $1 AND item_id = $2 RETURNING *',
      [userId, itemId, quantity]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('Error in removeCraftingItem:', err);
    throw err;
  }
}

// Get top miners by level
async function getTopMiners(limit = 10) {
  try {
    const result = await db.query(
      `SELECT m.*, u.username 
       FROM mines m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.level DESC, m.prestige DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error in getTopMiners:', err);
    throw err;
  }
}

// Export the mining database functions
module.exports = {
  getMine,
  createMine,
  updateMine,
  getResources,
  getResource,
  addResource,
  removeResource,
  getUnits,
  getUnit,
  addUnit,
  upgradeUnit,
  getCraftingItems,
  getCraftingItem,
  addCraftingItem,
  removeCraftingItem,
  getTopMiners
};
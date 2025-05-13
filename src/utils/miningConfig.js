// Configuration for mining system
module.exports = {
  // Basic mine settings
  mine: {
    digCooldown: 60 * 1000, // 1 minute cooldown between digs
    startingUnits: {
      miner: 1 // Start with 1 miner
    },
    maxLevel: 100, // Maximum mine level
    maxPrestige: 10, // Maximum prestige level
    digYield: {
      // Base yield per dig (modified by units and levels)
      coal: { min: 5, max: 15 },
      iron: { min: 1, max: 5 },
      gold: { min: 0, max: 2 },
      unprocessedMaterials: { min: 1, max: 3, chance: 0.5 }
    },
    processYield: {
      // Chance to get each resource from processing unprocessed materials
      diamond: { chance: 0.05, min: 1, max: 1 },
      emerald: { chance: 0.03, min: 1, max: 1 },
      redstone: { chance: 0.1, min: 1, max: 3 },
      lapis: { chance: 0.08, min: 1, max: 2 }
    }
  },
  
  // Units available for purchase
  units: {
    miner: {
      name: 'Miner',
      description: 'Basic mining unit that increases coal production',
      baseCost: {
        cash: 1000
      },
      costMultiplier: 1.5, // Each additional unit costs 1.5x more
      effect: {
        type: 'resource',
        resource: 'coal',
        multiplier: 1.2 // Each miner increases coal production by 20%
      }
    },
    excavator: {
      name: 'Excavator',
      description: 'Specialized unit that increases iron production',
      baseCost: {
        cash: 5000,
        packs: {
          utility_pack: 1
        }
      },
      costMultiplier: 1.6,
      effect: {
        type: 'resource',
        resource: 'iron',
        multiplier: 1.3 // Each excavator increases iron production by 30%
      }
    },
    driller: {
      name: 'Driller',
      description: 'Advanced unit that increases gold production',
      baseCost: {
        cash: 10000,
        packs: {
          tech_pack: 1
        }
      },
      costMultiplier: 1.7,
      effect: {
        type: 'resource',
        resource: 'gold',
        multiplier: 1.4 // Each driller increases gold production by 40%
      }
    },
    processor: {
      name: 'Processor',
      description: 'Processing unit that increases the yield from unprocessed materials',
      baseCost: {
        cash: 25000,
        packs: {
          production_pack: 1
        }
      },
      costMultiplier: 1.8,
      effect: {
        type: 'processing',
        multiplier: 1.2 // Each processor increases processing yield by 20%
      }
    },
    collector: {
      name: 'Collector',
      description: 'Specialized unit that increases the chance of finding unprocessed materials',
      baseCost: {
        cash: 15000,
        packs: {
          utility_pack: 1,
          tech_pack: 1
        }
      },
      costMultiplier: 1.7,
      effect: {
        type: 'umChance',
        multiplier: 1.15 // Each collector increases UM chance by 15%
      }
    }
  },
  
  // Upgrades for units
  upgrades: {
    efficiency: {
      name: 'Efficiency Upgrade',
      description: 'Increases the base output of all units',
      baseCost: {
        cash: 5000,
        resources: {
          coal: 100,
          iron: 50
        }
      },
      costMultiplier: 2,
      effect: {
        type: 'global',
        multiplier: 1.1 // Each level increases all production by 10%
      }
    },
    automation: {
      name: 'Automation Upgrade',
      description: 'Reduces the dig cooldown',
      baseCost: {
        cash: 10000,
        resources: {
          iron: 100,
          gold: 20
        }
      },
      costMultiplier: 2.5,
      effect: {
        type: 'cooldown',
        reduction: 0.05 // Each level reduces cooldown by 5%
      }
    },
    precision: {
      name: 'Precision Upgrade',
      description: 'Increases the chance of finding rare resources when processing',
      baseCost: {
        cash: 20000,
        resources: {
          gold: 50,
          redstone: 20
        }
      },
      costMultiplier: 3,
      effect: {
        type: 'processing',
        multiplier: 1.15 // Each level increases rare resource chances by 15%
      }
    }
  },
  
  // Craftable packs
  crafting: {
    tech_pack: {
      name: 'Tech Pack',
      description: 'Used for advanced mining units',
      components: {
        tech_part: 5,
        iron: 20,
        redstone: 5
      }
    },
    utility_pack: {
      name: 'Utility Pack',
      description: 'Used for utility mining units',
      components: {
        utility_part: 5,
        coal: 30,
        iron: 10
      }
    },
    production_pack: {
      name: 'Production Pack',
      description: 'Used for production-focused units',
      components: {
        production_part: 5,
        gold: 5,
        lapis: 3
      }
    }
  },
  
  // Parts that can be found while mining (used for crafting)
  parts: {
    tech_part: {
      name: 'Tech Part',
      description: 'A technological component used in crafting',
      foundFrom: ['unprocessedMaterials', 'dig'],
      chance: 0.1 // 10% chance to find when digging or processing
    },
    utility_part: {
      name: 'Utility Part',
      description: 'A utility component used in crafting',
      foundFrom: ['unprocessedMaterials', 'dig'],
      chance: 0.15 // 15% chance to find when digging or processing
    },
    production_part: {
      name: 'Production Part',
      description: 'A production component used in crafting',
      foundFrom: ['unprocessedMaterials', 'dig'],
      chance: 0.08 // 8% chance to find when digging or processing
    }
  },
  
  // Prestige requirements and rewards
  prestige: {
    requirements: {
      minLevel: 10, // Minimum level required to prestige
      resources: {
        diamond: 10,
        emerald: 5
      }
    },
    rewards: {
      globalMultiplier: 0.1, // Each prestige level adds 10% to all production
      startingResources: { // Resources you start with after prestiging
        coal: 100,
        iron: 50,
        gold: 10
      },
      startingUnits: { // Units you start with after prestiging
        miner: 2
      }
    }
  }
};
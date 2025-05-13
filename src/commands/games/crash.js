const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

// Add crash game configuration to config if not already present
if (!config.games.crash) {
  config.games.crash = {
    baseMultiplier: 1.0,    // Starting multiplier
    growthRate: 0.05,       // How fast the multiplier grows
    crashChance: 0.08,      // Probability of crashing on each tick (8%)
    updateInterval: 1000,   // Millisecond interval between updates (1 second)
    maxGameLength: 60000,   // Maximum game length in milliseconds (1 minute)
    minCashoutMultiplier: 1.1  // Minimum multiplier to cashout (10% profit)
  };
}

class CrashGame {
  constructor() {
    this.multiplier = config.games.crash.baseMultiplier;
    this.isCrashed = false;
    this.isGameOver = false;
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.gameLength = 0;
    this.interval = null;
  }
  
  start(updateCallback) {
    this.interval = setInterval(() => {
      if (this.isGameOver) {
        clearInterval(this.interval);
        return;
      }
      
      this.gameLength = Date.now() - this.startTime;
      
      // Check if the game should end due to time limit
      if (this.gameLength >= config.games.crash.maxGameLength) {
        this.isGameOver = true;
        updateCallback(this.getGameState());
        clearInterval(this.interval);
        return;
      }
      
      // Calculate time since last update in seconds
      const secondsSinceLastUpdate = (Date.now() - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = Date.now();
      
      // Increase multiplier
      const growthFactor = config.games.crash.growthRate * secondsSinceLastUpdate;
      this.multiplier += this.multiplier * growthFactor;
      
      // Check for crash
      if (Math.random() < config.games.crash.crashChance * secondsSinceLastUpdate) {
        this.isCrashed = true;
        this.isGameOver = true;
      }
      
      // Call the update callback with the new game state
      updateCallback(this.getGameState());
      
      // End the game if crashed
      if (this.isGameOver) {
        clearInterval(this.interval);
      }
    }, config.games.crash.updateInterval);
  }
  
  cashout() {
    if (!this.isCrashed && !this.isGameOver) {
      this.isGameOver = true;
      return {
        success: true,
        multiplier: this.multiplier
      };
    }
    
    return {
      success: false,
      reason: this.isCrashed ? 'Game already crashed!' : 'Game already ended!'
    };
  }
  
  getGameState() {
    return {
      multiplier: this.multiplier,
      isCrashed: this.isCrashed,
      isGameOver: this.isGameOver,
      gameLength: this.gameLength
    };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('Play the Crash game - bet and cash out before it crashes!')
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to process
      await interaction.deferReply();
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'crash');
      
      if (cooldownInfo.onCooldown) {
        return interaction.editReply({
          content: `You need to wait ${cooldownInfo.formattedTime} before playing Crash again.`
        });
      }
      
      // Get bet
      const betInput = interaction.options.getString('bet');
      
      // Get user data
      const user = await db.getUser(interaction.user.id, interaction.user.username);
      
      // Validate the bet
      const betValidation = formatter.validateBet(betInput, user.cash);
      if (!betValidation.valid) {
        return interaction.editReply({
          content: betValidation.message
        });
      }
      
      const betAmount = betValidation.amount;
      
      // Set cooldown
      await cooldowns.setCommandCooldown(user.id, 'crash');
      
      // Create a new crash game
      const game = new CrashGame();
      let currentEmbed = null;
      let messageComponents = null;
      
      // Create the initial game embed
      const createGameEmbed = (gameState) => {
        const { multiplier, isCrashed, isGameOver } = gameState;
        const formattedMultiplier = multiplier.toFixed(2) + 'x';
        
        let color = '#0099ff';
        let title = 'Crash Game';
        let description = `Current Multiplier: **${formattedMultiplier}**\nYour Bet: ${formatter.formatCash(betAmount)}`;
        
        if (isCrashed) {
          color = '#ff0000';
          title = 'CRASHED! 💥';
          description = `Crashed at: **${formattedMultiplier}**\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou lost ${formatter.formatCash(betAmount)}!`;
        } else if (isGameOver && !isCrashed) {
          color = '#00ff00';
          title = 'Game Over - Cashed Out! 💰';
          const winnings = Math.floor(betAmount * multiplier);
          const profit = winnings - betAmount;
          description = `Final Multiplier: **${formattedMultiplier}**\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou won ${formatter.formatCash(profit)}!`;
        }
        
        return new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(description)
          .setTimestamp()
          .setFooter({ text: 'Gamble Bot - Crash Game' });
      };
      
      // Create action row with cashout button
      const createActionRow = (disabled = false) => {
        return new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('cashout')
              .setLabel('CASH OUT')
              .setStyle(ButtonStyle.Success)
              .setDisabled(disabled)
          );
      };
      
      // Handle game updates
      const handleGameUpdate = async (gameState) => {
        try {
          const newEmbed = createGameEmbed(gameState);
          const newComponents = gameState.isGameOver ? [] : [createActionRow()];
          
          // Only update if there's a significant change
          const shouldUpdate = 
            !currentEmbed || 
            gameState.isGameOver !== messageComponents.length === 0 ||
            Math.abs(gameState.multiplier - parseFloat(currentEmbed.data.description.split('**')[1].replace('x', ''))) > 0.1;
          
          if (shouldUpdate) {
            currentEmbed = newEmbed;
            messageComponents = newComponents;
            
            await interaction.editReply({
              embeds: [newEmbed],
              components: newComponents
            });
            
            // Handle end of game
            if (gameState.isGameOver) {
              if (gameState.isCrashed) {
                // Player lost
                await db.removeCash(user.id, betAmount);
                await db.updateStats(user.id, 'crash', 'loss', betAmount, 0);
              } else {
                // Player won by cashing out
                const winnings = Math.floor(betAmount * gameState.multiplier);
                const profit = winnings - betAmount;
                await db.addCash(user.id, profit);
                await db.updateStats(user.id, 'crash', 'win', betAmount, winnings);
              }
            }
          }
        } catch (error) {
          console.error('Error updating game display:', error);
        }
      };
      
      // Start the game
      currentEmbed = createGameEmbed(game.getGameState());
      messageComponents = [createActionRow()];
      
      const response = await interaction.editReply({
        embeds: [currentEmbed],
        components: messageComponents
      });
      
      // Start the game loop
      game.start(handleGameUpdate);
      
      // Create button collector
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: config.games.crash.maxGameLength
      });
      
      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'This is not your game!',
            ephemeral: true
          });
          return;
        }
        
        if (i.customId === 'cashout') {
          const result = game.cashout();
          
          if (!result.success) {
            await i.reply({
              content: result.reason,
              ephemeral: true
            });
            return;
          }
          
          // Handle game update for cashout will be taken care of by the update callback
          await i.update({
            components: []
          });
        }
      });
      
      collector.on('end', () => {
        // Force end the game if it hasn't ended already
        if (!game.isGameOver) {
          game.isGameOver = true;
        }
      });
      
    } catch (error) {
      console.error('Error in crash command:', error);
      await interaction.editReply({ content: 'There was an error playing the Crash game. Please try again later.' });
    }
  }
};
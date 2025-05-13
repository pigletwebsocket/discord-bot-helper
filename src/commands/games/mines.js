const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

// Add mines game configuration to config if not already present
if (!config.games.mines) {
  config.games.mines = {
    gridSize: { width: 5, height: 5 },
    defaultMineCount: 5,
    maxMineCount: 24,
    basePayout: 1.2, // Base payout for first reveal
    payoutIncrease: 0.2, // Increase per reveal after the first
    gameTimeout: 180000 // 3 minutes
  };
}

class MinesGame {
  constructor(mineCount = config.games.mines.defaultMineCount) {
    this.width = config.games.mines.gridSize.width;
    this.height = config.games.mines.gridSize.height;
    this.mineCount = Math.min(mineCount, config.games.mines.maxMineCount);
    this.grid = [];
    this.revealed = [];
    this.gameOver = false;
    this.playerWon = false;
    this.currentMultiplier = config.games.mines.basePayout;
    this.revealCount = 0;
    this.maxReveals = this.width * this.height - this.mineCount;
    
    // Initialize the grid
    this.initializeGrid();
  }
  
  initializeGrid() {
    // Create empty grid
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      this.revealed[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = 0; // 0 = empty, 1 = mine
        this.revealed[y][x] = false;
      }
    }
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < this.mineCount) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (this.grid[y][x] === 0) {
        this.grid[y][x] = 1;
        minesPlaced++;
      }
    }
  }
  
  revealTile(x, y) {
    if (this.gameOver || this.revealed[y][x]) {
      return {
        success: false,
        reason: this.gameOver ? 'Game over' : 'Tile already revealed'
      };
    }
    
    this.revealed[y][x] = true;
    
    // Check if the player hit a mine
    if (this.grid[y][x] === 1) {
      this.gameOver = true;
      return {
        success: false,
        reason: 'Hit a mine',
        revealedGrid: this.getRevealedGrid(),
        multiplier: 0
      };
    }
    
    // Player revealed a safe tile
    this.revealCount++;
    
    // Update multiplier
    if (this.revealCount > 1) {
      this.currentMultiplier += config.games.mines.payoutIncrease;
    }
    
    // Check if all safe tiles have been revealed
    if (this.revealCount >= this.maxReveals) {
      this.gameOver = true;
      this.playerWon = true;
    }
    
    return {
      success: true,
      revealedGrid: this.getRevealedGrid(),
      multiplier: this.currentMultiplier,
      gameOver: this.gameOver,
      playerWon: this.playerWon
    };
  }
  
  getRevealedGrid() {
    const revealedGrid = [];
    
    for (let y = 0; y < this.height; y++) {
      revealedGrid[y] = [];
      for (let x = 0; x < this.width; x++) {
        if (this.revealed[y][x]) {
          revealedGrid[y][x] = this.grid[y][x];
        } else {
          revealedGrid[y][x] = -1; // -1 = not revealed
        }
      }
    }
    
    // If game is over, reveal all mines
    if (this.gameOver) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] === 1) {
            revealedGrid[y][x] = 1;
          }
        }
      }
    }
    
    return revealedGrid;
  }
  
  cashout() {
    if (this.gameOver) {
      return {
        success: false,
        reason: 'Game already over'
      };
    }
    
    this.gameOver = true;
    return {
      success: true,
      multiplier: this.currentMultiplier,
      revealedGrid: this.getRevealedGrid()
    };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Play the Mines game - avoid the mines and cash out for a multiplier!')
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('mines')
        .setDescription('Number of mines to place (5-24)')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(24)),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to process
      await interaction.deferReply();
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'mines');
      
      if (cooldownInfo.onCooldown) {
        return interaction.editReply({
          content: `You need to wait ${cooldownInfo.formattedTime} before playing Mines again.`
        });
      }
      
      // Get bet and mine count
      const betInput = interaction.options.getString('bet');
      const mineCount = interaction.options.getInteger('mines') || config.games.mines.defaultMineCount;
      
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
      await cooldowns.setCommandCooldown(user.id, 'mines');
      
      // Create a new mines game
      const game = new MinesGame(mineCount);
      
      // Create the game embed
      const createGameEmbed = (revealedGrid, multiplier, gameOver = false, playerWon = false) => {
        const { width, height } = config.games.mines.gridSize;
        
        // Format the grid for display
        let gridDisplay = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cellValue = revealedGrid[y][x];
            if (cellValue === -1) {
              gridDisplay += '⬜'; // Unrevealed tile
            } else if (cellValue === 0) {
              gridDisplay += '🟩'; // Safe tile
            } else {
              gridDisplay += '💣'; // Mine
            }
          }
          gridDisplay += '\n';
        }
        
        let color, title, description;
        
        if (gameOver) {
          if (playerWon) {
            color = '#00ff00';
            title = 'Mines Game - You Won! 🎉';
            description = `You revealed all safe tiles!\nYour Bet: ${formatter.formatCash(betAmount)}\nMultiplier: ${multiplier.toFixed(2)}x\n\nYou won ${formatter.formatCash(Math.floor(betAmount * multiplier) - betAmount)}!`;
          } else {
            color = '#ff0000';
            title = 'Mines Game - You Lost! 💥';
            description = `You hit a mine!\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou lost ${formatter.formatCash(betAmount)}!`;
          }
        } else {
          color = '#0099ff';
          title = 'Mines Game';
          description = `Mines: ${mineCount}/${width * height}\nYour Bet: ${formatter.formatCash(betAmount)}\nCurrent Multiplier: ${multiplier.toFixed(2)}x\n\nClick to reveal a tile, or cash out to claim your winnings.`;
        }
        
        return new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(description)
          .addFields(
            { name: 'Game Board', value: gridDisplay }
          )
          .setTimestamp()
          .setFooter({ text: 'Gamble Bot - Mines Game' });
      };
      
      // Create buttons for the grid
      const createButtonRows = (revealedGrid, gameOver = false) => {
        const { width, height } = config.games.mines.gridSize;
        const rows = [];
        
        // Create grid buttons
        for (let y = 0; y < height; y++) {
          const row = new ActionRowBuilder();
          for (let x = 0; x < width; x++) {
            const cellValue = revealedGrid[y][x];
            let style = ButtonStyle.Secondary;
            let emoji = null;
            let disabled = gameOver;
            
            if (cellValue === 0) {
              style = ButtonStyle.Success;
              disabled = true;
            } else if (cellValue === 1) {
              style = ButtonStyle.Danger;
              emoji = '💣';
              disabled = true;
            }
            
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`tile_${x}_${y}`)
                .setStyle(style)
                .setEmoji(emoji)
                .setDisabled(disabled)
            );
          }
          rows.push(row);
        }
        
        // Add cashout button if game is not over
        if (!gameOver) {
          const cashoutRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('cashout')
                .setLabel('CASH OUT')
                .setStyle(ButtonStyle.Primary)
            );
          rows.push(cashoutRow);
        }
        
        return rows;
      };
      
      // Initial game display
      const initialGrid = game.getRevealedGrid();
      const initialEmbed = createGameEmbed(initialGrid, game.currentMultiplier);
      const initialButtons = createButtonRows(initialGrid);
      
      const response = await interaction.editReply({
        embeds: [initialEmbed],
        components: initialButtons
      });
      
      // Create button collector
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: config.games.mines.gameTimeout
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
          
          // Calculate winnings
          const winnings = Math.floor(betAmount * result.multiplier);
          const profit = winnings - betAmount;
          
          // Update user's cash
          await db.addCash(user.id, profit);
          await db.updateStats(user.id, 'mines', 'win', betAmount, winnings);
          
          // Update the game display
          const updatedEmbed = createGameEmbed(result.revealedGrid, result.multiplier, true, true);
          const updatedButtons = createButtonRows(result.revealedGrid, true);
          
          await i.update({
            embeds: [updatedEmbed],
            components: updatedButtons
          });
          
          // End the collector
          collector.stop();
        } else if (i.customId.startsWith('tile_')) {
          // Parse coordinates from button customId
          const [_, xStr, yStr] = i.customId.split('_');
          const x = parseInt(xStr);
          const y = parseInt(yStr);
          
          // Reveal the tile
          const result = game.revealTile(x, y);
          
          if (!result.success) {
            if (result.reason === 'Hit a mine') {
              // Player hit a mine
              await db.removeCash(user.id, betAmount);
              await db.updateStats(user.id, 'mines', 'loss', betAmount, 0);
              
              const updatedEmbed = createGameEmbed(result.revealedGrid, 0, true, false);
              const updatedButtons = createButtonRows(result.revealedGrid, true);
              
              await i.update({
                embeds: [updatedEmbed],
                components: updatedButtons
              });
              
              // End the collector
              collector.stop();
            } else {
              await i.reply({
                content: result.reason,
                ephemeral: true
              });
            }
            return;
          }
          
          // Update the game display
          const updatedEmbed = createGameEmbed(
            result.revealedGrid, 
            result.multiplier, 
            result.gameOver, 
            result.playerWon
          );
          
          const updatedButtons = createButtonRows(result.revealedGrid, result.gameOver);
          
          await i.update({
            embeds: [updatedEmbed],
            components: updatedButtons
          });
          
          // Handle end of game
          if (result.gameOver && result.playerWon) {
            // Player won by revealing all safe tiles
            const winnings = Math.floor(betAmount * result.multiplier);
            const profit = winnings - betAmount;
            
            await db.addCash(user.id, profit);
            await db.updateStats(user.id, 'mines', 'win', betAmount, winnings);
            
            // End the collector
            collector.stop();
          }
        }
      });
      
      collector.on('end', async () => {
        if (!game.gameOver) {
          // Game timed out
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('Mines Game - Timed Out')
            .setDescription(`The game timed out.\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou lost ${formatter.formatCash(betAmount)}!`)
            .setTimestamp()
            .setFooter({ text: 'Gamble Bot - Mines Game' });
          
          // Reveal all mines
          game.gameOver = true;
          const finalGrid = game.getRevealedGrid();
          const finalButtons = createButtonRows(finalGrid, true);
          
          // Update user's cash
          await db.removeCash(user.id, betAmount);
          await db.updateStats(user.id, 'mines', 'loss', betAmount, 0);
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: finalButtons
          });
        }
      });
      
    } catch (error) {
      console.error('Error in mines command:', error);
      await interaction.editReply({ content: 'There was an error playing the Mines game. Please try again later.' });
    }
  }
};
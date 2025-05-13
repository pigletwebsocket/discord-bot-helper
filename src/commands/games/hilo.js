const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

// Add hilo game configuration to config if not already present
if (!config.games.hilo) {
  config.games.hilo = {
    minNumber: 1,
    maxNumber: 100,
    maxRounds: 10,
    baseMultiplier: 1.2,
    lowMultiplier: 1.5, // Lower numbers are less likely when current number is low
    highMultiplier: 1.5, // Higher numbers are less likely when current number is high
    gameTimeout: 120000 // 2 minutes
  };
}

class HiLoGame {
  constructor() {
    this.config = config.games.hilo;
    this.currentNumber = this.generateRandomNumber();
    this.roundNumber = 1;
    this.currentMultiplier = this.config.baseMultiplier;
    this.history = [this.currentNumber];
    this.gameOver = false;
    this.lastAction = null;
  }
  
  generateRandomNumber() {
    return Math.floor(Math.random() * (this.config.maxNumber - this.config.minNumber + 1)) + this.config.minNumber;
  }
  
  calculateProbabilities() {
    const { minNumber, maxNumber } = this.config;
    const totalRange = maxNumber - minNumber + 1;
    
    // Calculate probability of higher
    const higherCount = maxNumber - this.currentNumber;
    const higherProb = higherCount / totalRange;
    
    // Calculate probability of lower
    const lowerCount = this.currentNumber - minNumber;
    const lowerProb = lowerCount / totalRange;
    
    return {
      higher: higherProb,
      lower: lowerProb,
      same: 1 / totalRange
    };
  }
  
  calculateMultipliers() {
    const probabilities = this.calculateProbabilities();
    
    // Base multiplier + (1 / probability)
    // Higher probability = lower multiplier
    const higherMultiplier = probabilities.higher > 0 
      ? (1 / probabilities.higher) * 0.95 // 5% house edge
      : 0;
      
    const lowerMultiplier = probabilities.lower > 0 
      ? (1 / probabilities.lower) * 0.95 // 5% house edge
      : 0;
    
    return {
      higher: Math.max(1.1, higherMultiplier.toFixed(2)),
      lower: Math.max(1.1, lowerMultiplier.toFixed(2))
    };
  }
  
  makeGuess(guess) {
    if (this.gameOver) {
      return {
        success: false,
        reason: 'Game already ended'
      };
    }
    
    if (this.roundNumber > this.config.maxRounds) {
      this.gameOver = true;
      return {
        success: false,
        reason: 'Maximum rounds reached',
        multiplier: this.currentMultiplier
      };
    }
    
    // Generate next number
    const nextNumber = this.generateRandomNumber();
    this.history.push(nextNumber);
    
    // Compare with guess
    let correct = false;
    if (guess === 'higher') {
      correct = nextNumber > this.currentNumber;
    } else {
      correct = nextNumber < this.currentNumber;
    }
    
    // Update last action
    this.lastAction = {
      guess,
      previousNumber: this.currentNumber,
      newNumber: nextNumber,
      correct
    };
    
    if (correct) {
      // Player guessed correctly
      const multipliers = this.calculateMultipliers();
      const winMultiplier = guess === 'higher' ? multipliers.higher : multipliers.lower;
      
      // Multiply the current multiplier
      this.currentMultiplier *= winMultiplier;
      
      // Update game state
      this.currentNumber = nextNumber;
      this.roundNumber++;
      
      return {
        success: true,
        correct: true,
        previousNumber: this.lastAction.previousNumber,
        currentNumber: this.currentNumber,
        roundNumber: this.roundNumber,
        multiplier: this.currentMultiplier,
        winMultiplier: winMultiplier,
        gameOver: this.roundNumber > this.config.maxRounds,
        history: this.history
      };
    } else {
      // Player guessed incorrectly
      this.gameOver = true;
      
      return {
        success: true,
        correct: false,
        previousNumber: this.lastAction.previousNumber,
        newNumber: nextNumber,
        multiplier: 0,
        history: this.history,
        gameOver: true
      };
    }
  }
  
  cashout() {
    if (this.gameOver) {
      return {
        success: false,
        reason: 'Game already ended'
      };
    }
    
    this.gameOver = true;
    return {
      success: true,
      multiplier: this.currentMultiplier,
      currentNumber: this.currentNumber,
      roundNumber: this.roundNumber,
      history: this.history
    };
  }
  
  getGameState() {
    return {
      currentNumber: this.currentNumber,
      roundNumber: this.roundNumber,
      currentMultiplier: this.currentMultiplier,
      gameOver: this.gameOver,
      lastAction: this.lastAction,
      history: this.history
    };
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hilo')
    .setDescription('Play the Hi-Lo game - guess if the next number will be higher or lower')
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to process
      await interaction.deferReply();
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'hilo');
      
      if (cooldownInfo.onCooldown) {
        return interaction.editReply({
          content: `You need to wait ${cooldownInfo.formattedTime} before playing Hi-Lo again.`
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
      await cooldowns.setCommandCooldown(user.id, 'hilo');
      
      // Create a new hilo game
      const game = new HiLoGame();
      
      // Create the game embed
      const createGameEmbed = (gameState) => {
        const { currentNumber, roundNumber, currentMultiplier, gameOver, lastAction, history } = gameState;
        const multipliers = game.calculateMultipliers();
        
        // Create history graph
        let historyDisplay = '';
        if (history.length > 1) {
          historyDisplay = 'Number History: ';
          historyDisplay += history.map((num, index) => {
            if (index === history.length - 1 && lastAction && !lastAction.correct) {
              return `~~${num}~~`; // Strike through for losing number
            }
            return num;
          }).join(' → ');
          historyDisplay += '\n\n';
        }
        
        let color, title, description;
        
        if (gameOver) {
          if (lastAction && !lastAction.correct) {
            // Player lost by guessing wrong
            color = '#ff0000';
            title = 'Hi-Lo Game - You Lost!';
            description = `${historyDisplay}You guessed **${lastAction.guess}** but the number was ${lastAction.newNumber} (${lastAction.previousNumber} → ${lastAction.newNumber}).\n\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou lost ${formatter.formatCash(betAmount)}!`;
          } else if (roundNumber > config.games.hilo.maxRounds) {
            // Player reached max rounds
            color = '#00ff00';
            title = 'Hi-Lo Game - Max Rounds Reached!';
            description = `${historyDisplay}You reached the maximum number of rounds!\n\nYour Bet: ${formatter.formatCash(betAmount)}\nMultiplier: ${currentMultiplier.toFixed(2)}x\n\nYou won ${formatter.formatCash(Math.floor(betAmount * currentMultiplier) - betAmount)}!`;
          } else {
            // Player cashed out
            color = '#00ff00';
            title = 'Hi-Lo Game - Cashed Out!';
            description = `${historyDisplay}You cashed out with a ${currentMultiplier.toFixed(2)}x multiplier!\n\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou won ${formatter.formatCash(Math.floor(betAmount * currentMultiplier) - betAmount)}!`;
          }
        } else {
          // Game in progress
          color = '#0099ff';
          title = 'Hi-Lo Game';
          description = `${historyDisplay}Current Number: **${currentNumber}**\nRound: ${roundNumber}/${config.games.hilo.maxRounds}\nCurrent Multiplier: ${currentMultiplier.toFixed(2)}x\n\nYour Bet: ${formatter.formatCash(betAmount)}`;
          
          if (lastAction && lastAction.correct) {
            description += `\n\nLast guess: ${lastAction.guess.toUpperCase()} (${lastAction.previousNumber} → ${lastAction.newNumber})`;
          }
          
          description += `\n\nHigher Multiplier: ${multipliers.higher}x | Lower Multiplier: ${multipliers.lower}x`;
        }
        
        return new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(description)
          .setTimestamp()
          .setFooter({ text: 'Gamble Bot - Hi-Lo Game' });
      };
      
      // Create buttons for the game
      const createButtons = (gameOver = false) => {
        const row = new ActionRowBuilder();
        
        if (!gameOver) {
          // Calculate probabilities for each option
          const probabilities = game.calculateProbabilities();
          
          row.addComponents(
            new ButtonBuilder()
              .setCustomId('higher')
              .setLabel(`HIGHER (${Math.round(probabilities.higher * 100)}%)`)
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('lower')
              .setLabel(`LOWER (${Math.round(probabilities.lower * 100)}%)`)
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('cashout')
              .setLabel('CASH OUT')
              .setStyle(ButtonStyle.Success)
          );
        }
        
        return [row];
      };
      
      // Initial game display
      const initialEmbed = createGameEmbed(game.getGameState());
      const initialButtons = createButtons();
      
      const response = await interaction.editReply({
        embeds: [initialEmbed],
        components: initialButtons
      });
      
      // Create button collector
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: config.games.hilo.gameTimeout
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
          await db.updateStats(user.id, 'hilo', 'win', betAmount, winnings);
          
          // Update the game display
          const updatedEmbed = createGameEmbed({
            ...game.getGameState(),
            gameOver: true
          });
          
          await i.update({
            embeds: [updatedEmbed],
            components: []
          });
          
          // End the collector
          collector.stop();
        } else if (i.customId === 'higher' || i.customId === 'lower') {
          const result = game.makeGuess(i.customId);
          
          if (!result.success) {
            await i.reply({
              content: result.reason,
              ephemeral: true
            });
            return;
          }
          
          if (result.gameOver) {
            if (result.correct) {
              // Player won by reaching max rounds
              const winnings = Math.floor(betAmount * result.multiplier);
              const profit = winnings - betAmount;
              
              await db.addCash(user.id, profit);
              await db.updateStats(user.id, 'hilo', 'win', betAmount, winnings);
            } else {
              // Player lost by guessing wrong
              await db.removeCash(user.id, betAmount);
              await db.updateStats(user.id, 'hilo', 'loss', betAmount, 0);
            }
            
            // Update the game display
            const updatedEmbed = createGameEmbed(game.getGameState());
            
            await i.update({
              embeds: [updatedEmbed],
              components: []
            });
            
            // End the collector
            collector.stop();
          } else {
            // Game continues
            const updatedEmbed = createGameEmbed(game.getGameState());
            const updatedButtons = createButtons();
            
            await i.update({
              embeds: [updatedEmbed],
              components: updatedButtons
            });
          }
        }
      });
      
      collector.on('end', async () => {
        if (!game.gameOver) {
          // Game timed out
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('Hi-Lo Game - Timed Out')
            .setDescription(`The game timed out.\nYour Bet: ${formatter.formatCash(betAmount)}\n\nYou lost ${formatter.formatCash(betAmount)}!`)
            .setTimestamp()
            .setFooter({ text: 'Gamble Bot - Hi-Lo Game' });
          
          // Update user's cash
          await db.removeCash(user.id, betAmount);
          await db.updateStats(user.id, 'hilo', 'loss', betAmount, 0);
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Error in hilo command:', error);
      await interaction.editReply({ content: 'There was an error playing the Hi-Lo game. Please try again later.' });
    }
  }
};
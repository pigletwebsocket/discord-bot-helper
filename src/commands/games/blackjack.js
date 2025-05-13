const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const config = require('../../../config');

// Blackjack game logic
class BlackjackGame {
  constructor() {
    this.deck = this.createDeck();
    this.playerHand = [];
    this.dealerHand = [];
    this.gameOver = false;
    this.result = null;
  }
  
  createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (const suit of suits) {
      for (const value of values) {
        const cardValue = this.getCardValue(value);
        deck.push({ suit, value, cardValue });
      }
    }
    
    return this.shuffleDeck(deck);
  }
  
  shuffleDeck(deck) {
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  
  getCardValue(value) {
    if (['J', 'Q', 'K'].includes(value)) return 10;
    if (value === 'A') return 11;
    return parseInt(value);
  }
  
  dealInitialCards() {
    this.playerHand.push(this.deck.pop());
    this.dealerHand.push(this.deck.pop());
    this.playerHand.push(this.deck.pop());
    this.dealerHand.push(this.deck.pop());
  }
  
  hit() {
    this.playerHand.push(this.deck.pop());
    if (this.getHandValue(this.playerHand) > 21) {
      this.gameOver = true;
      this.result = 'loss';
    }
  }
  
  stand() {
    this.gameOver = true;
    this.dealerPlay();
    
    const playerValue = this.getHandValue(this.playerHand);
    const dealerValue = this.getHandValue(this.dealerHand);
    
    if (dealerValue > 21) {
      this.result = 'win';
    } else if (playerValue > dealerValue) {
      this.result = 'win';
    } else if (playerValue < dealerValue) {
      this.result = 'loss';
    } else {
      this.result = 'tie';
    }
  }
  
  dealerPlay() {
    while (this.getHandValue(this.dealerHand) < 17) {
      this.dealerHand.push(this.deck.pop());
    }
  }
  
  getHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
      value += card.cardValue;
      if (card.value === 'A') aces++;
    }
    
    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10; // Change Ace from 11 to 1
      aces--;
    }
    
    return value;
  }
  
  isBlackjack(hand) {
    return hand.length === 2 && this.getHandValue(hand) === 21;
  }
  
  formatHand(hand, hideSecond = false) {
    if (hideSecond && hand.length > 1) {
      return `${hand[0].value}${hand[0].suit}, ?`;
    }
    
    return hand.map(card => `${card.value}${card.suit}`).join(', ');
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a game of blackjack')
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('mode')
        .setDescription('Game difficulty')
        .setRequired(false)
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Hard', value: 'hard' }
        )),
  
  async execute(interaction, client) {
    // Check cooldown
    const cooldownInfo = cooldowns.checkCommandCooldown(interaction.user.id, 'blackjack');
    
    if (cooldownInfo.onCooldown) {
      return interaction.reply({
        content: `You need to wait ${cooldownInfo.formattedTime} before playing another blackjack game.`,
        ephemeral: true
      });
    }
    
    // Get bet and mode
    const betInput = interaction.options.getString('bet');
    const mode = interaction.options.getString('mode') || 'normal';
    const isHardMode = mode === 'hard';
    
    // Get user data
    const user = db.getUser(interaction.user.id, interaction.user.username);
    
    // Validate the bet
    const betValidation = formatter.validateBet(betInput, user.cash);
    if (!betValidation.valid) {
      return interaction.reply({
        content: betValidation.message,
        ephemeral: true
      });
    }
    
    const betAmount = betValidation.amount;
    
    // Set cooldown
    cooldowns.setCommandCooldown(user.id, 'blackjack');
    
    // Create a new blackjack game
    const game = new BlackjackGame();
    game.dealInitialCards();
    
    // Check for initial blackjack
    const playerHasBlackjack = game.isBlackjack(game.playerHand);
    const dealerHasBlackjack = game.isBlackjack(game.dealerHand);
    
    if (playerHasBlackjack || dealerHasBlackjack) {
      game.gameOver = true;
      
      if (playerHasBlackjack && dealerHasBlackjack) {
        game.result = 'tie';
      } else if (playerHasBlackjack) {
        game.result = 'blackjack';
      } else {
        game.result = 'loss';
      }
    }
    
    // Create the initial game embed
    const createGameEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Blackjack')
        .addFields(
          { name: 'Dealer\'s Hand', value: game.gameOver ? game.formatHand(game.dealerHand) : game.formatHand(game.dealerHand, true), inline: true },
          { name: 'Dealer\'s Value', value: game.gameOver ? game.getHandValue(game.dealerHand).toString() : '?', inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Your Hand', value: game.formatHand(game.playerHand), inline: true },
          { name: 'Your Value', value: game.getHandValue(game.playerHand).toString(), inline: true },
          { name: '\u200B', value: '\u200B', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `${isHardMode ? 'Hard Mode' : 'Normal Mode'} | Bet: ${formatter.formatCash(betAmount)}` });
      
      if (game.gameOver) {
        let resultText;
        let color;
        let winnings = 0;
        
        if (game.result === 'blackjack') {
          // Blackjack pays 3:2 (2.5x) normally
          winnings = Math.floor(betAmount * config.games.blackjack.blackjackMultiplier);
          resultText = `Blackjack! You won ${formatter.formatCash(winnings)}!`;
          color = '#00ff00';
          db.addCash(user.id, winnings - betAmount);
          db.updateStats(user.id, 'blackjack', 'win', betAmount, winnings);
        } else if (game.result === 'win') {
          winnings = betAmount * config.games.blackjack.winMultiplier;
          resultText = `You won ${formatter.formatCash(winnings)}!`;
          color = '#00ff00';
          db.addCash(user.id, winnings - betAmount);
          db.updateStats(user.id, 'blackjack', 'win', betAmount, winnings);
        } else if (game.result === 'loss') {
          resultText = `You lost ${formatter.formatCash(betAmount)}!`;
          color = '#ff0000';
          db.removeCash(user.id, betAmount);
          db.updateStats(user.id, 'blackjack', 'loss', betAmount, 0);
        } else { // Tie
          resultText = 'Push! Your bet has been returned.';
          color = '#ffff00';
        }
        
        embed.setColor(color);
        embed.setDescription(resultText);
        embed.addFields(
          { name: 'New Balance', value: formatter.formatCash(user.cash), inline: true }
        );
      } else {
        embed.setDescription('Hit to draw another card or Stand to end your turn.');
      }
      
      return embed;
    };
    
    // Create the action buttons
    const createActionRow = () => {
      return new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('hit')
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(game.gameOver),
          new ButtonBuilder()
            .setCustomId('stand')
            .setLabel('Stand')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(game.gameOver)
        );
    };
    
    // Send the initial message with buttons
    const response = await interaction.reply({
      embeds: [createGameEmbed()],
      components: game.gameOver ? [] : [createActionRow()],
      fetchReply: true
    });
    
    // If game is already over (due to initial blackjack), no need for the collector
    if (game.gameOver) return;
    
    // Create button collector
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000, // 1 minute timeout
      filter: (i) => i.user.id === interaction.user.id
    });
    
    collector.on('collect', async (i) => {
      if (i.customId === 'hit') {
        game.hit();
      } else if (i.customId === 'stand') {
        game.stand();
      }
      
      if (game.gameOver) {
        collector.stop();
      }
      
      await i.update({
        embeds: [createGameEmbed()],
        components: game.gameOver ? [] : [createActionRow()]
      });
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && !game.gameOver) {
        // Auto-stand if timer expires
        game.stand();
        
        await interaction.editReply({
          embeds: [createGameEmbed()],
          components: []
        });
      }
    });
  }
};

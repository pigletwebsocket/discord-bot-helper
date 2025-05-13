const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const cooldowns = require('../../utils/cooldowns');
const achievements = require('../../utils/achievements');
const config = require('../../../config');

// Add find the lady configuration to config if not already present
if (!config.games.findthelady) {
  config.games.findthelady = {
    easyModeCards: 3,     // Number of cards in easy mode
    hardModeCards: 5,     // Number of cards in hard mode
    easyModeOdds: 3,      // Payout odds for easy mode (1:3)
    hardModeOdds: 5,      // Payout odds for hard mode (1:5)
    cooldown: 30 * 1000,  // 30 seconds cooldown
    maxGameLength: 60000  // 1 minute max game length
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('findthelady')
    .setDescription('Play Find the Lady - find the Queen among the Kings!')
    .addStringOption(option => 
      option.setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('mode')
        .setDescription('Game difficulty mode')
        .setRequired(false)
        .addChoices(
          { name: 'Easy (3 cards)', value: 'easy' },
          { name: 'Hard (5 cards)', value: 'hard' }
        )),
  
  async execute(interaction) {
    try {
      // Defer the reply to give us time to process
      await interaction.deferReply();
      
      // Check cooldown
      const cooldownInfo = await cooldowns.checkCommandCooldown(interaction.user.id, 'findthelady');
      
      if (cooldownInfo.onCooldown) {
        return interaction.editReply({
          content: `You need to wait ${cooldownInfo.formattedTime} before playing Find the Lady again.`
        });
      }
      
      // Get bet and mode
      const betInput = interaction.options.getString('bet');
      const mode = interaction.options.getString('mode') || 'easy';
      const isHardMode = mode === 'hard';
      
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
      await cooldowns.setCommandCooldown(user.id, 'findthelady');
      
      // Setup game
      const numCards = isHardMode ? config.games.findthelady.hardModeCards : config.games.findthelady.easyModeCards;
      const payoutOdds = isHardMode ? config.games.findthelady.hardModeOdds : config.games.findthelady.easyModeOdds;
      
      // Create card array: one Queen (lady) and the rest Kings
      const cards = Array(numCards).fill('K');
      const ladyPosition = Math.floor(Math.random() * numCards);
      cards[ladyPosition] = 'Q';
      
      // Create initial game embed
      const createGameEmbed = (state = 'start', selectedPosition = null) => {
        let color, title, description;
        
        switch (state) {
          case 'start':
            color = '#0099ff';
            title = '🃏 Find the Lady';
            description = `Find the Queen (♥️Q♥️) among the Kings (♠️K♠️)!\n\n` +
                        `Mode: ${isHardMode ? 'Hard' : 'Easy'} (${numCards} cards)\n` +
                        `Your Bet: ${formatter.formatCash(betAmount)}\n` +
                        `Payout: ${payoutOdds}:1\n\n` +
                        `The cards are being shuffled...`;
            break;
          case 'shuffling':
            color = '#0099ff';
            title = '🃏 Find the Lady - Shuffling';
            description = `Find the Queen (♥️Q♥️) among the Kings (♠️K♠️)!\n\n` +
                        `Mode: ${isHardMode ? 'Hard' : 'Easy'} (${numCards} cards)\n` +
                        `Your Bet: ${formatter.formatCash(betAmount)}\n` +
                        `Payout: ${payoutOdds}:1\n\n` +
                        `The cards have been shuffled! Pick a card to reveal.`;
            break;
          case 'win':
            color = '#00ff00';
            title = '🃏 Find the Lady - You Won! 👑';
            description = `You found the Queen (♥️Q♥️)!\n\n` +
                        `Your Bet: ${formatter.formatCash(betAmount)}\n` +
                        `Payout: ${payoutOdds}:1\n\n` +
                        `You won ${formatter.formatCash(betAmount * payoutOdds)}!`;
            break;
          case 'lose':
            color = '#ff0000';
            title = '🃏 Find the Lady - You Lost! 😢';
            description = `You found a King (♠️K♠️) at position ${selectedPosition + 1}. The Queen was at position ${ladyPosition + 1}.\n\n` +
                        `Your Bet: ${formatter.formatCash(betAmount)}\n\n` +
                        `You lost ${formatter.formatCash(betAmount)}!`;
            break;
        }
        
        return new EmbedBuilder()
          .setColor(color)
          .setTitle(title)
          .setDescription(description)
          .setTimestamp()
          .setFooter({ text: 'Gamble Bot - Find the Lady' });
      };
      
      // Create buttons for cards
      const createCardButtons = (state = 'shuffling', revealed = false) => {
        const rows = [];
        const buttonsPerRow = 3; // Maximum 5 buttons per row in Discord
        
        for (let i = 0; i < Math.ceil(numCards / buttonsPerRow); i++) {
          const row = new ActionRowBuilder();
          
          for (let j = 0; j < buttonsPerRow; j++) {
            const index = i * buttonsPerRow + j;
            if (index >= numCards) break;
            
            const card = cards[index];
            let style = ButtonStyle.Secondary;
            let label = `Card ${index + 1}`;
            let disabled = state !== 'shuffling';
            
            if (revealed) {
              if (card === 'Q') {
                style = ButtonStyle.Success;
                label = '♥️ Q ♥️';
              } else {
                style = ButtonStyle.Danger;
                label = '♠️ K ♠️';
              }
              disabled = true;
            }
            
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`card_${index}`)
                .setLabel(label)
                .setStyle(style)
                .setDisabled(disabled)
            );
          }
          
          rows.push(row);
        }
        
        return rows;
      };
      
      // Start the game
      const initialEmbed = createGameEmbed('start');
      const initialRows = createCardButtons('start');
      
      const message = await interaction.editReply({
        embeds: [initialEmbed],
        components: initialRows
      });
      
      // Show shuffling animation for 2 seconds
      setTimeout(async () => {
        const shufflingEmbed = createGameEmbed('shuffling');
        const shufflingRows = createCardButtons('shuffling');
        
        await message.edit({
          embeds: [shufflingEmbed],
          components: shufflingRows
        });
      }, 2000);
      
      // Create button collector
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: config.games.findthelady.maxGameLength
      });
      
      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'This is not your game!',
            ephemeral: true
          });
          return;
        }
        
        // Get selected card position
        const position = parseInt(i.customId.split('_')[1]);
        
        // Check if correct card was selected
        const selectedCard = cards[position];
        const won = selectedCard === 'Q';
        
        // Update game state
        if (won) {
          // Player won
          const winnings = betAmount * payoutOdds;
          await db.addCash(user.id, winnings - betAmount); // Add winnings minus original bet
          await db.updateStats(user.id, 'findthelady', 'win', betAmount, winnings);
          
          const winEmbed = createGameEmbed('win');
          const winRows = createCardButtons('end', true);
          
          await i.update({
            embeds: [winEmbed],
            components: winRows
          });
        } else {
          // Player lost
          await db.removeCash(user.id, betAmount);
          await db.updateStats(user.id, 'findthelady', 'loss', betAmount, 0);
          
          const loseEmbed = createGameEmbed('lose', position);
          const loseRows = createCardButtons('end', true);
          
          await i.update({
            embeds: [loseEmbed],
            components: loseRows
          });
        }
        
        // Check for achievements
        const achievementsCompleted = await achievements.trackGamePlay(user.id, 'findthelady', betAmount, won ? 'win' : 'loss', won ? betAmount * payoutOdds : 0);
        
        // If achievements were completed, send a follow-up message
        if (achievementsCompleted.length > 0) {
          const achievementEmbed = achievements.createAchievementEmbed(achievementsCompleted);
          await interaction.followUp({ embeds: [achievementEmbed] });
        }
        
        // End the collector
        collector.stop();
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          // Game timed out
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🃏 Find the Lady - Game Timed Out')
            .setDescription(`The game timed out.\nYour bet of ${formatter.formatCash(betAmount)} has been returned.`)
            .setTimestamp()
            .setFooter({ text: 'Gamble Bot - Find the Lady' });
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Error in findthelady command:', error);
      await interaction.editReply({ content: 'There was an error playing Find the Lady. Please try again later.' });
    }
  }
};
const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic-Tac-Toe with another user')
    .addUserOption(option => 
      option.setName('opponent')
        .setDescription('User to play against')
        .setRequired(true)),
  
  async execute(interaction) {
    try {
      // Get challenger and opponent
      const challenger = interaction.user;
      const opponent = interaction.options.getUser('opponent');
      
      // Check if opponent is a bot
      if (opponent.bot) {
        return interaction.reply({
          content: 'You cannot play Tic-Tac-Toe with a bot.',
          ephemeral: true
        });
      }
      
      // Check if player is challenging themselves
      if (challenger.id === opponent.id) {
        return interaction.reply({
          content: 'You cannot play Tic-Tac-Toe with yourself.',
          ephemeral: true
        });
      }
      
      // Defer reply
      await interaction.deferReply();
      
      // Send challenge embed
      const challengeEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Tic-Tac-Toe Challenge')
        .setDescription(`${challenger.toString()} has challenged ${opponent.toString()} to a game of Tic-Tac-Toe!`)
        .addFields(
          { name: 'How to Play', value: 'The first player to get 3 in a row wins!\nWill you accept the challenge?' }
        )
        .setTimestamp();
      
      // Create acceptance buttons
      const acceptRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('accept_ttt')
            .setLabel('Accept Challenge')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('decline_ttt')
            .setLabel('Decline Challenge')
            .setStyle(ButtonStyle.Danger)
        );
      
      const response = await interaction.editReply({
        content: `${opponent.toString()}, you've been challenged!`,
        embeds: [challengeEmbed],
        components: [acceptRow]
      });
      
      // Create collector for acceptance response
      const acceptCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 minute to accept or decline
      });
      
      acceptCollector.on('collect', async (i) => {
        // Only allow the challenged player to accept/decline
        if (i.user.id !== opponent.id) {
          await i.reply({
            content: 'This challenge is not for you.',
            ephemeral: true
          });
          return;
        }
        
        if (i.customId === 'accept_ttt') {
          // Start the game
          acceptCollector.stop('accepted');
          await i.update({
            content: `${opponent.toString()} accepted the challenge!`,
            embeds: [challengeEmbed],
            components: []
          });
          
          // Initialize the game
          await startGame(interaction, challenger, opponent);
          
        } else if (i.customId === 'decline_ttt') {
          // Decline the challenge
          acceptCollector.stop('declined');
          await i.update({
            content: `${opponent.toString()} declined the challenge.`,
            embeds: [],
            components: []
          });
        }
      });
      
      acceptCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
          // Challenge timed out
          interaction.editReply({
            content: `${opponent.toString()} did not respond to the challenge.`,
            embeds: [],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Error in tictactoe command:', error);
      await interaction.editReply({
        content: 'There was an error starting the game. Please try again later.'
      });
    }
  }
};

// Start a Tic-Tac-Toe game
async function startGame(interaction, player1, player2) {
  try {
    // Initialize game state
    const gameState = {
      board: Array(9).fill(null),
      currentPlayer: player1.id,
      player1: {
        id: player1.id,
        username: player1.username,
        symbol: '❌'
      },
      player2: {
        id: player2.id,
        username: player2.username,
        symbol: '⭕'
      },
      moveCount: 0,
      gameOver: false,
      winner: null,
      tie: false
    };
    
    // Create the game embed and buttons
    await updateGameMessage(interaction, gameState);
    
  } catch (error) {
    console.error('Error starting game:', error);
    await interaction.editReply({
      content: 'There was an error starting the game. Please try again later.',
      embeds: [],
      components: []
    });
  }
}

// Update the game message with current state
async function updateGameMessage(interaction, gameState) {
  try {
    // Create the game embed
    const gameEmbed = createGameEmbed(gameState);
    
    // Create the game buttons
    const gameButtons = createGameButtons(gameState);
    
    // Update the message
    const message = await interaction.editReply({
      content: null,
      embeds: [gameEmbed],
      components: gameButtons
    });
    
    // If game is not over, create a collector for button presses
    if (!gameState.gameOver) {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes before game times out
      });
      
      collector.on('collect', async (i) => {
        // Verify it's the current player's turn
        if (i.user.id !== gameState.currentPlayer) {
          await i.reply({
            content: `It's not your turn! It's ${gameState.currentPlayer === gameState.player1.id ? gameState.player1.username : gameState.player2.username}'s turn.`,
            ephemeral: true
          });
          return;
        }
        
        // Get the button position
        const position = parseInt(i.customId.split('_')[1]);
        
        // Check if the position is valid
        if (gameState.board[position] !== null) {
          await i.reply({
            content: 'That space is already taken!',
            ephemeral: true
          });
          return;
        }
        
        // Update the game state
        gameState.board[position] = gameState.currentPlayer === gameState.player1.id ? gameState.player1.symbol : gameState.player2.symbol;
        gameState.moveCount++;
        
        // Check for win or tie
        checkGameState(gameState);
        
        // Switch players if game is not over
        if (!gameState.gameOver) {
          gameState.currentPlayer = gameState.currentPlayer === gameState.player1.id ? gameState.player2.id : gameState.player1.id;
        }
        
        // Update the game message
        await i.update({
          embeds: [createGameEmbed(gameState)],
          components: createGameButtons(gameState)
        });
        
        // End the collector if the game is over
        if (gameState.gameOver) {
          collector.stop();
        }
      });
      
      collector.on('end', (collected, reason) => {
        if (reason === 'time' && !gameState.gameOver) {
          // Game timed out
          gameState.gameOver = true;
          gameState.tie = true;
          
          interaction.editReply({
            content: 'The game has timed out due to inactivity.',
            embeds: [createGameEmbed(gameState)],
            components: []
          });
        }
      });
    }
    
  } catch (error) {
    console.error('Error updating game message:', error);
    throw error;
  }
}

// Create the game embed
function createGameEmbed(gameState) {
  const { player1, player2, currentPlayer, gameOver, winner, tie, moveCount } = gameState;
  
  let title, description, color;
  
  if (gameOver) {
    if (tie) {
      title = 'Tic-Tac-Toe - It\'s a Tie!';
      description = 'The game ended in a tie!';
      color = '#ffff00';
    } else {
      const winningPlayer = winner === player1.id ? player1 : player2;
      title = `Tic-Tac-Toe - ${winningPlayer.username} Wins!`;
      description = `${winningPlayer.username} (${winningPlayer.symbol}) has won the game!`;
      color = '#00ff00';
    }
  } else {
    const turnPlayer = currentPlayer === player1.id ? player1 : player2;
    title = 'Tic-Tac-Toe';
    description = `It's ${turnPlayer.username}'s (${turnPlayer.symbol}) turn.\n\n${player1.username}: ${player1.symbol}\n${player2.username}: ${player2.symbol}`;
    color = '#0099ff';
  }
  
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: gameOver ? 'Game Over' : `Moves: ${moveCount}` });
}

// Create the game buttons
function createGameButtons(gameState) {
  const { board, gameOver } = gameState;
  
  const rows = [];
  
  // Create 3 rows of 3 buttons each
  for (let i = 0; i < 3; i++) {
    const row = new ActionRowBuilder();
    
    for (let j = 0; j < 3; j++) {
      const position = i * 3 + j;
      const cell = board[position];
      
      let label = ' ';
      let style = ButtonStyle.Secondary;
      let disabled = gameOver;
      
      if (cell === '❌') {
        label = 'X';
        style = ButtonStyle.Danger;
        disabled = true;
      } else if (cell === '⭕') {
        label = 'O';
        style = ButtonStyle.Success;
        disabled = true;
      }
      
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_${position}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled)
      );
    }
    
    rows.push(row);
  }
  
  // Add play again button if game is over
  if (gameOver) {
    const playAgainRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('play_again')
          .setLabel('Play Again')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('end_game')
          .setLabel('End Game')
          .setStyle(ButtonStyle.Secondary)
      );
    
    rows.push(playAgainRow);
  }
  
  return rows;
}

// Check if the game is over (win or tie)
function checkGameState(gameState) {
  const { board, player1, player2 } = gameState;
  
  // Check rows
  for (let i = 0; i < 9; i += 3) {
    if (board[i] && board[i] === board[i + 1] && board[i] === board[i + 2]) {
      gameState.gameOver = true;
      gameState.winner = board[i] === player1.symbol ? player1.id : player2.id;
      return;
    }
  }
  
  // Check columns
  for (let i = 0; i < 3; i++) {
    if (board[i] && board[i] === board[i + 3] && board[i] === board[i + 6]) {
      gameState.gameOver = true;
      gameState.winner = board[i] === player1.symbol ? player1.id : player2.id;
      return;
    }
  }
  
  // Check diagonals
  if (board[0] && board[0] === board[4] && board[0] === board[8]) {
    gameState.gameOver = true;
    gameState.winner = board[0] === player1.symbol ? player1.id : player2.id;
    return;
  }
  
  if (board[2] && board[2] === board[4] && board[2] === board[6]) {
    gameState.gameOver = true;
    gameState.winner = board[2] === player1.symbol ? player1.id : player2.id;
    return;
  }
  
  // Check for tie
  if (gameState.moveCount === 9) {
    gameState.gameOver = true;
    gameState.tie = true;
  }
}
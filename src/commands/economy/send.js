const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');
const formatter = require('../../utils/formatter');
const config = require('../../../config');

// Add send configuration to config if not already present
if (!config.economy) {
  config.economy = {
    defaultTax: 0.05,  // 5% tax by default
    minSendAmount: 100,
    maxSendPercentage: 0.25, // Maximum 25% of cash can be sent per transaction
    maxReceivePercentage: 0.5, // Maximum 50% of sender's cash can be received
    buttonTimeout: 60000 // 1 minute to confirm transaction
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send cash to another player')
    .addUserOption(option => 
      option.setName('recipient')
        .setDescription('The player who will receive the cash')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('amount')
        .setDescription('Amount to send. Use "m" for maximum amount')
        .setRequired(true)),
  
  async execute(interaction) {
    try {
      // Get sender and recipient
      const sender = interaction.user;
      const recipient = interaction.options.getUser('recipient');
      
      // Check if sender is trying to send to themselves
      if (sender.id === recipient.id) {
        return interaction.reply({
          content: 'You cannot send cash to yourself.',
          ephemeral: true
        });
      }
      
      // Check if recipient is a bot
      if (recipient.bot) {
        return interaction.reply({
          content: 'You cannot send cash to a bot.',
          ephemeral: true
        });
      }
      
      // Get amount
      const amountInput = interaction.options.getString('amount');
      
      // Get sender and recipient data
      const senderData = await db.getUser(sender.id, sender.username);
      const recipientData = await db.getUser(recipient.id, recipient.username);
      
      // Calculate max send amount
      const maxSendAmount = Math.floor(senderData.cash * config.economy.maxSendPercentage);
      const maxReceiveAmount = Math.floor(senderData.cash * config.economy.maxReceivePercentage);
      
      // Parse amount
      let amount;
      
      if (amountInput.toLowerCase() === 'm' || amountInput.toLowerCase() === 'max') {
        // Use the smaller of: max send amount, max receive amount, or sender's cash
        amount = Math.min(maxSendAmount, maxReceiveAmount, senderData.cash);
      } else {
        // Parse the amount
        const parsedAmount = formatter.parseBetAmount(amountInput, senderData.cash);
        
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return interaction.reply({
            content: 'Please enter a valid amount to send.',
            ephemeral: true
          });
        }
        
        amount = parsedAmount;
      }
      
      // Check if amount is below minimum
      if (amount < config.economy.minSendAmount) {
        return interaction.reply({
          content: `You must send at least ${formatter.formatCash(config.economy.minSendAmount)}.`,
          ephemeral: true
        });
      }
      
      // Check if amount is above maximum send limit
      if (amount > maxSendAmount) {
        return interaction.reply({
          content: `You can only send up to ${formatter.formatCash(maxSendAmount)} (${config.economy.maxSendPercentage * 100}% of your cash).`,
          ephemeral: true
        });
      }
      
      // Check if amount is above maximum receive limit
      if (amount > maxReceiveAmount) {
        return interaction.reply({
          content: `${recipient.username} can only receive up to ${formatter.formatCash(maxReceiveAmount)} (${config.economy.maxReceivePercentage * 100}% of your cash).`,
          ephemeral: true
        });
      }
      
      // Check if sender has enough cash
      if (senderData.cash < amount) {
        return interaction.reply({
          content: `You don't have enough cash. You have ${formatter.formatCash(senderData.cash)} but you're trying to send ${formatter.formatCash(amount)}.`,
          ephemeral: true
        });
      }
      
      // Calculate tax
      const taxRate = config.economy.defaultTax;
      const taxAmount = Math.floor(amount * taxRate);
      const amountAfterTax = amount - taxAmount;
      
      // Create confirmation button
      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_send')
            .setLabel('Send Cash')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('cancel_send')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Cash Transfer Confirmation')
        .setDescription(`Are you sure you want to send ${formatter.formatCash(amount)} to ${recipient.username}?`)
        .addFields(
          { name: 'Tax', value: `${taxRate * 100}% (${formatter.formatCash(taxAmount)})`, inline: true },
          { name: 'Recipient will receive', value: formatter.formatCash(amountAfterTax), inline: true },
          { name: 'Your balance after transfer', value: formatter.formatCash(senderData.cash - amount), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Click "Send Cash" to confirm or "Cancel" to abort' });
      
      // Send confirmation message
      const reply = await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        fetchReply: true
      });
      
      // Create button collector
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: config.economy.buttonTimeout
      });
      
      collector.on('collect', async (i) => {
        // Ensure only the original user can click the buttons
        if (i.user.id !== sender.id) {
          return i.reply({
            content: 'Only the sender can confirm this transaction.',
            ephemeral: true
          });
        }
        
        if (i.customId === 'confirm_send') {
          // Process the transaction
          try {
            // Get fresh user data in case it changed during confirmation
            const updatedSenderData = await db.getUser(sender.id, sender.username);
            
            // Check if sender still has enough cash
            if (updatedSenderData.cash < amount) {
              await i.update({
                content: `Transaction failed. You no longer have enough cash. You have ${formatter.formatCash(updatedSenderData.cash)} but you're trying to send ${formatter.formatCash(amount)}.`,
                embeds: [],
                components: []
              });
              return;
            }
            
            // Remove cash from sender
            await db.removeCash(sender.id, amount);
            
            // Add cash to recipient after tax
            await db.addCash(recipient.id, amountAfterTax);
            
            // Create success embed
            const successEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Cash Transfer Successful')
              .setDescription(`You sent ${formatter.formatCash(amount)} to ${recipient.username}!`)
              .addFields(
                { name: 'Tax', value: `${taxRate * 100}% (${formatter.formatCash(taxAmount)})`, inline: true },
                { name: 'Recipient received', value: formatter.formatCash(amountAfterTax), inline: true },
                { name: 'Your new balance', value: formatter.formatCash(updatedSenderData.cash - amount), inline: true }
              )
              .setTimestamp()
              .setFooter({ text: 'Transaction completed' });
            
            await i.update({
              embeds: [successEmbed],
              components: []
            });
            
            // If recipient is in this channel, send them a notification
            try {
              await interaction.channel.send({
                content: `<@${recipient.id}>, you received ${formatter.formatCash(amountAfterTax)} from ${sender.username}!`
              });
            } catch (error) {
              console.error('Error sending recipient notification:', error);
            }
          } catch (error) {
            console.error('Error processing transaction:', error);
            await i.update({
              content: 'There was an error processing the transaction. Please try again later.',
              embeds: [],
              components: []
            });
          }
        } else if (i.customId === 'cancel_send') {
          // Cancel the transaction
          const cancelEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Cash Transfer Cancelled')
            .setDescription('The transaction has been cancelled.')
            .setTimestamp()
            .setFooter({ text: 'No cash was transferred' });
          
          await i.update({
            embeds: [cancelEmbed],
            components: []
          });
        }
        
        // End the collector
        collector.stop();
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          // Transaction timed out
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('Cash Transfer Timed Out')
            .setDescription('The transaction has been cancelled due to timeout.')
            .setTimestamp()
            .setFooter({ text: 'No cash was transferred' });
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Error in send command:', error);
      await interaction.reply({
        content: 'There was an error processing your request. Please try again later.',
        ephemeral: true
      });
    }
  }
};
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete_my_data')
    .setDescription('Delete all your data from the bot (this cannot be undone)'),
  
  async execute(interaction) {
    try {
      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('⚠️ Delete All Your Data')
        .setDescription('Are you sure you want to delete ALL your data from the bot? This action cannot be undone.')
        .addFields(
          { name: 'What will be deleted', value: 
            '• Your profile and user settings\n' +
            '• All cash and virtual items\n' +
            '• Game statistics and achievements\n' +
            '• Mining resources and progress\n' +
            '• Any purchased items or cosmetics',
            inline: false
          },
          { name: 'What happens next', value: 'If you start using the bot again, you will begin from scratch with the default starting cash and no progress.', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Please confirm your choice below' });
      
      // Create confirmation buttons
      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_delete')
            .setLabel('Yes, Delete Everything')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_delete')
            .setLabel('No, Keep My Data')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send the confirmation message
      const response = await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        ephemeral: true // Make this private
      });
      
      // Create a collector for button interactions
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 minute to decide
      });
      
      collector.on('collect', async (i) => {
        // Only allow the original user to use these buttons
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'These buttons are not for you.',
            ephemeral: true
          });
          return;
        }
        
        if (i.customId === 'confirm_delete') {
          // User confirmed deletion
          
          // Begin database transaction
          const client = await db.db.connect();
          
          try {
            await client.query('BEGIN');
            
            const userId = interaction.user.id;
            
            // Delete from all tables
            await client.query('DELETE FROM cooldowns WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM active_boosts WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM inventory WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM user_stats WHERE user_id = $1', [userId]);
            
            // Mining tables
            await client.query('DELETE FROM mine_crafting WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM mine_resources WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM mine_units WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM mines WHERE user_id = $1', [userId]);
            
            // Game stats tables
            await client.query('DELETE FROM game_stats WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM stats WHERE user_id = $1', [userId]);
            
            // Finally delete the user
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
            
            await client.query('COMMIT');
            
            // Show success message
            const successEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Data Deleted')
              .setDescription('All your data has been successfully deleted from the bot.')
              .setTimestamp()
              .setFooter({ text: 'You can start fresh by using the bot again' });
            
            await i.update({
              embeds: [successEmbed],
              components: []
            });
            
          } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting user data:', error);
            
            // Show error message
            const errorEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('Error Deleting Data')
              .setDescription('There was an error deleting your data. Please try again later or contact support.')
              .setTimestamp();
            
            await i.update({
              embeds: [errorEmbed],
              components: []
            });
          } finally {
            client.release();
          }
          
        } else if (i.customId === 'cancel_delete') {
          // User cancelled deletion
          const cancelEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Deletion Cancelled')
            .setDescription('Your data is safe. No changes have been made.')
            .setTimestamp();
          
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
          // Timed out without a response
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('Request Timed Out')
            .setDescription('The data deletion request has been cancelled due to timeout.')
            .setTimestamp();
          
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: []
          });
        }
      });
      
    } catch (error) {
      console.error('Error in delete_my_data command:', error);
      await interaction.reply({
        content: 'There was an error processing your request. Please try again later.',
        ephemeral: true
      });
    }
  }
};
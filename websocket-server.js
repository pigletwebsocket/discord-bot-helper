const WebSocket = require('ws');
const http = require('http');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./src/utils/database');

// WebSocket server configurations
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Serve a simple status page
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Discord Bot Control Panel</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: #2c2f33;
              color: #ffffff;
            }
            h1, h2 {
              color: #7289da;
            }
            .status {
              background-color: #36393f;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .commands, .stats {
              background-color: #36393f;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            pre {
              background-color: #2f3136;
              border-radius: 3px;
              padding: 10px;
              overflow: auto;
            }
            .actions {
              display: flex;
              gap: 10px;
              margin-bottom: 20px;
            }
            button {
              background-color: #7289da;
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 3px;
              cursor: pointer;
            }
            button:hover {
              background-color: #5b6eae;
            }
            #console {
              background-color: #2f3136;
              border-radius: 3px;
              padding: 10px;
              height: 200px;
              overflow-y: auto;
              margin-bottom: 20px;
              font-family: monospace;
            }
            .user-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #40444b;
            }
            #connection-status {
              padding: 5px 10px;
              border-radius: 3px;
              display: inline-block;
              margin-top: 10px;
            }
            .connected {
              background-color: #43b581;
            }
            .disconnected {
              background-color: #f04747;
            }
          </style>
        </head>
        <body>
          <h1>Discord Bot Control Panel</h1>
          
          <div class="status">
            <h2>Connection Status</h2>
            <div id="connection-status" class="disconnected">Disconnected</div>
            <p id="bot-status">Bot Status: Unknown</p>
            <p id="uptime">Uptime: -</p>
          </div>
          
          <div class="actions">
            <button id="refresh-stats">Refresh Stats</button>
            <button id="restart-bot">Restart Bot</button>
          </div>
          
          <div id="console">
            <div>Connecting to WebSocket server...</div>
          </div>
          
          <div class="stats">
            <h2>Bot Statistics</h2>
            <p id="total-users">Total Users: -</p>
            <p id="total-servers">Total Servers: -</p>
            <p id="total-commands">Commands Used: -</p>
            <p id="total-bets">Total Bets: -</p>
          </div>
          
          <div class="commands">
            <h2>Recent Commands</h2>
            <div id="recent-commands">
              <p>No commands recorded yet.</p>
            </div>
          </div>
          
          <div class="stats">
            <h2>Top Users</h2>
            <div id="top-users">
              <p>Loading top users...</p>
            </div>
          </div>
          
          <script>
            // WebSocket Logic
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
            let socket;
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 5;
            const reconnectDelay = 5000;
            
            function connectWebSocket() {
              socket = new WebSocket(wsUrl);
              
              socket.onopen = function(e) {
                logToConsole('Connected to WebSocket server');
                document.getElementById('connection-status').className = 'connected';
                document.getElementById('connection-status').textContent = 'Connected';
                reconnectAttempts = 0;
                requestInitialData();
              };
              
              socket.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleIncomingMessage(data);
              };
              
              socket.onclose = function(event) {
                document.getElementById('connection-status').className = 'disconnected';
                document.getElementById('connection-status').textContent = 'Disconnected';
                logToConsole('Connection closed. Attempting to reconnect...');
                
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  setTimeout(connectWebSocket, reconnectDelay);
                } else {
                  logToConsole('Max reconnect attempts reached. Please refresh the page.');
                }
              };
              
              socket.onerror = function(error) {
                logToConsole('WebSocket error: ' + error.message);
              };
            }
            
            function requestInitialData() {
              sendMessage('getInitialData');
            }
            
            function sendMessage(type, data = {}) {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: type,
                  data: data
                }));
              } else {
                logToConsole('Cannot send message, socket not connected');
              }
            }
            
            function handleIncomingMessage(message) {
              switch(message.type) {
                case 'botStatus':
                  updateBotStatus(message.data);
                  break;
                case 'stats':
                  updateStats(message.data);
                  break;
                case 'recentCommands':
                  updateRecentCommands(message.data);
                  break;
                case 'topUsers':
                  updateTopUsers(message.data);
                  break;
                case 'log':
                  logToConsole(message.data.message);
                  break;
                default:
                  logToConsole('Unknown message type: ' + message.type);
              }
            }
            
            function updateBotStatus(data) {
              document.getElementById('bot-status').textContent = \`Bot Status: \${data.status}\`;
              document.getElementById('uptime').textContent = \`Uptime: \${formatUptime(data.uptime)}\`;
            }
            
            function updateStats(data) {
              document.getElementById('total-users').textContent = \`Total Users: \${data.totalUsers}\`;
              document.getElementById('total-servers').textContent = \`Total Servers: \${data.totalServers}\`;
              document.getElementById('total-commands').textContent = \`Commands Used: \${data.totalCommands}\`;
              document.getElementById('total-bets').textContent = \`Total Bets: \${data.totalBets || 0}\`;
            }
            
            function updateRecentCommands(commands) {
              const container = document.getElementById('recent-commands');
              if (commands.length === 0) {
                container.innerHTML = '<p>No commands recorded yet.</p>';
                return;
              }
              
              let html = '<ul>';
              commands.forEach(cmd => {
                html += \`<li>\${cmd.user} used \${cmd.command} at \${new Date(cmd.timestamp).toLocaleString()}</li>\`;
              });
              html += '</ul>';
              container.innerHTML = html;
            }
            
            function updateTopUsers(users) {
              const container = document.getElementById('top-users');
              if (users.length === 0) {
                container.innerHTML = '<p>No user data available.</p>';
                return;
              }
              
              let html = '';
              users.forEach((user, index) => {
                html += \`
                  <div class="user-row">
                    <span>#\${index + 1} \${user.username}</span>
                    <span>\${user.cash} coins</span>
                  </div>
                \`;
              });
              container.innerHTML = html;
            }
            
            function logToConsole(message) {
              const consoleElem = document.getElementById('console');
              const timestamp = new Date().toLocaleTimeString();
              consoleElem.innerHTML += \`<div>[\${timestamp}] \${message}</div>\`;
              consoleElem.scrollTop = consoleElem.scrollHeight;
            }
            
            function formatUptime(ms) {
              const seconds = Math.floor(ms / 1000);
              const minutes = Math.floor(seconds / 60);
              const hours = Math.floor(minutes / 60);
              const days = Math.floor(hours / 24);
              
              return \`\${days}d \${hours % 24}h \${minutes % 60}m \${seconds % 60}s\`;
            }
            
            // Event Listeners
            document.getElementById('refresh-stats').addEventListener('click', function() {
              sendMessage('getStats');
              sendMessage('getRecentCommands');
              sendMessage('getTopUsers');
              logToConsole('Refreshing stats...');
            });
            
            document.getElementById('restart-bot').addEventListener('click', function() {
              if (confirm('Are you sure you want to restart the bot?')) {
                sendMessage('restartBot');
                logToConsole('Restarting bot...');
              }
            });
            
            // Connect when page loads
            connectWebSocket();
          </script>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// Bot variables
let botStartTime = Date.now();
let isReady = false;
let commandHistory = [];
let activeConnections = new Set();

// Initialize Discord commands collection
client.commands = new Collection();
const foldersPath = path.join(__dirname, 'src/commands');
const commandFolders = fs.readdirSync(foldersPath);

// Load commands
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
      broadcastLog(`Loaded command: ${command.data.name}`);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing required "data" or "execute" property.`);
    }
  }
}

// WebSocket server events
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  activeConnections.add(ws);
  
  // Send initial bot status
  sendBotStatus(ws);
  
  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message);
      
      switch(parsed.type) {
        case 'getInitialData':
          sendBotStatus(ws);
          sendStats(ws);
          sendRecentCommands(ws);
          sendTopUsers(ws);
          break;
          
        case 'getStats':
          sendStats(ws);
          break;
          
        case 'getRecentCommands':
          sendRecentCommands(ws);
          break;
          
        case 'getTopUsers':
          sendTopUsers(ws);
          break;
          
        case 'restartBot':
          broadcastLog('Restarting bot...');
          restartBot();
          break;
          
        default:
          console.log('Unknown message type:', parsed.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    activeConnections.delete(ws);
  });
});

// Discord client events
client.once(Events.ClientReady, (c) => {
  isReady = true;
  console.log(`Ready! Logged in as ${c.user.tag}`);
  broadcastLog(`Bot logged in as ${c.user.tag}`);
  
  // Log database connection
  db.getUser('test', 'test')
    .then(() => {
      console.log(`Database connected, current time: ${new Date().toISOString()}`);
      broadcastLog('Database connected successfully');
    })
    .catch(err => {
      console.error('Database connection error:', err);
      broadcastLog('Database connection error');
    });
  
  // Broadcast bot status to all connected clients
  broadcastBotStatus();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = interaction.client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  
  try {
    // Record command usage
    const commandUsage = {
      user: interaction.user.username,
      userId: interaction.user.id,
      command: interaction.commandName,
      options: interaction.options.data,
      timestamp: Date.now()
    };
    
    commandHistory.unshift(commandUsage);
    if (commandHistory.length > 50) {
      commandHistory.pop(); // Keep only last 50 commands
    }
    
    // Broadcast command usage
    broadcastLog(`${interaction.user.username} used /${interaction.commandName}`);
    
    // Execute command
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}`);
    console.error(error);
    
    broadcastLog(`Error executing /${interaction.commandName}: ${error.message}`);
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

// WebSocket helper functions
function sendBotStatus(ws) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'botStatus',
      data: {
        status: isReady ? 'Online' : 'Starting',
        uptime: Date.now() - botStartTime
      }
    }));
  }
}

function broadcastBotStatus() {
  const statusData = {
    type: 'botStatus',
    data: {
      status: isReady ? 'Online' : 'Starting',
      uptime: Date.now() - botStartTime
    }
  };
  
  broadcast(statusData);
}

async function sendStats(ws) {
  try {
    // Get total users from database
    const totalUsers = await getTotalUsers();
    
    // Stats data
    const statsData = {
      type: 'stats',
      data: {
        totalUsers: totalUsers,
        totalServers: client.guilds.cache.size,
        totalCommands: commandHistory.length,
        totalBets: await getTotalBets()
      }
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(statsData));
    }
  } catch (error) {
    console.error('Error sending stats:', error);
  }
}

function sendRecentCommands(ws) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'recentCommands',
      data: commandHistory.slice(0, 10).map(cmd => ({
        user: cmd.user,
        command: cmd.command,
        timestamp: cmd.timestamp
      }))
    }));
  }
}

async function sendTopUsers(ws) {
  try {
    const topUsers = await getTopUsers();
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'topUsers',
        data: topUsers
      }));
    }
  } catch (error) {
    console.error('Error sending top users:', error);
  }
}

function broadcastLog(message) {
  const logData = {
    type: 'log',
    data: {
      message: message,
      timestamp: Date.now()
    }
  };
  
  broadcast(logData);
}

function broadcast(data) {
  activeConnections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

async function restartBot() {
  try {
    // Destroy current client
    isReady = false;
    await client.destroy();
    
    // Broadcast status
    broadcastLog('Bot disconnected. Reconnecting...');
    broadcastBotStatus();
    
    // Reset start time
    botStartTime = Date.now();
    
    // Login again
    await client.login(process.env.DISCORD_TOKEN);
    
    broadcastLog('Bot restarted successfully');
  } catch (error) {
    console.error('Error restarting bot:', error);
    broadcastLog(`Error restarting bot: ${error.message}`);
  }
}

// Database helper functions
async function getTotalUsers() {
  try {
    // Execute a count query on the users table
    const result = await db.db.query('SELECT COUNT(*) as count FROM users');
    return Number(result.rows[0].count);
  } catch (error) {
    console.error('Error getting total users:', error);
    return 0;
  }
}

async function getTotalBets() {
  try {
    // Sum all bets from game_stats
    const result = await db.db.query('SELECT SUM(games_played) as total FROM stats');
    return Number(result.rows[0].total) || 0;
  } catch (error) {
    console.error('Error getting total bets:', error);
    return 0;
  }
}

async function getTopUsers() {
  try {
    // Get top 10 users by cash
    const result = await db.db.query('SELECT username, cash FROM users ORDER BY cash DESC LIMIT 10');
    return result.rows;
  } catch (error) {
    console.error('Error getting top users:', error);
    return [];
  }
}

// Start the server and bot
server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
  
  // Log in to Discord
  client.login(process.env.DISCORD_TOKEN);
  console.log('Starting Discord Gambling Bot...');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  
  // Close all WebSocket connections
  wss.clients.forEach(client => {
    client.close();
  });
  
  // Destroy Discord client
  if (client) {
    await client.destroy();
  }
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
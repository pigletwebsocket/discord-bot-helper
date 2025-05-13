#!/bin/bash

# Deploy slash commands
echo "Deploying slash commands..."
node deploy-commands.js

# Start the bot
echo "Starting Discord Gambling Bot..."
node index.js
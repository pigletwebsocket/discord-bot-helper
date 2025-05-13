#!/bin/bash

# Check if we should deploy commands first
if [ "$1" == "--deploy" ]; then
  echo "Deploying slash commands..."
  node deploy-commands.js
fi

# Check if we want to start the WebSocket control panel
if [ "$1" == "--control" ] || [ "$2" == "--control" ]; then
  echo "Starting WebSocket control panel..."
  node websocket-server.js
else
  # Start regular Discord bot
  echo "Starting Discord Gambling Bot..."
  node index.js
fi
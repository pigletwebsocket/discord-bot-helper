# Discord Gambling Bot

A Discord bot with slash commands, user profiles, and simple betting games. This bot allows users to play various gambling games like blackjack, slots, coinflip, diceroll, and roulette.

## Features

- Player profiles with cash balances and statistics
- Multiple gambling games with different mechanics and odds
- Cooldown system to prevent spam
- Daily rewards
- PostgreSQL database for persistent storage
- Configurable settings for game payouts and cooldowns

## Games Included

1. **Blackjack** - Classic card game where players try to get as close to 21 as possible without going over.
2. **Slots** - Simple slot machine game with various symbols and payouts.
3. **Coinflip** - Bet on heads or tails.
4. **Diceroll** - Bet on a dice roll outcome.
5. **Roulette** - Bet on various outcomes on a roulette wheel.

## Setup Instructions

1. Clone this repository
2. Install dependencies with `npm install`
3. Set up environment variables:
   - `DISCORD_TOKEN` - Your Discord bot token
   - `CLIENT_ID` - Your Discord application client ID
   - Database connection details (if using PostgreSQL)
4. Register slash commands using `node deploy-commands.js`
5. Start the bot with `node index.js`

## Database Structure

The bot uses PostgreSQL for data storage with the following tables:

1. **users** - Stores user information (ID, username, cash, level)
2. **stats** - Stores global user statistics (games played, won, lost, etc.)
3. **game_stats** - Stores statistics for each game
4. **cooldowns** - Stores command cooldowns for each user

## Commands

- `/balance` - Check your current balance
- `/profile` - View your gambling profile and statistics
- `/daily` - Claim your daily reward
- `/blackjack` - Play a game of blackjack
- `/coinflip` - Flip a coin and bet on the outcome
- `/diceroll` - Roll a dice and bet on the outcome
- `/slots` - Play the slot machine
- `/roulette` - Play roulette
- `/cooldowns` - Check your command cooldowns
- `/help` - Get help with commands

## Configuration

Game settings, cooldowns, and economy values can be configured in the `config.js` file.

## License

[MIT](LICENSE)
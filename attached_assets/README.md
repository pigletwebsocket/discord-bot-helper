# Guide: Gamble Bot

Interacting with the bot  
The bot uses slash commands (e.g. ) and pinging with @Gamble Bot.

Each slash command shows the options you can pass to them, with some being required and some being optional.

How to play  
To play with the bot, use any of the game commands (see the COMMANDS tab for the list)

Players start with 1,000 cash and level 0.

The bot uses a global economy so you can play in any server using the same profile.

Most (soon to be all) games support betting your hard earned cash, with an allin option to bet all your cash in the hopes to win big!

There's no level cap so you can play endlessly and nobody can be at the top of any leaderboard 'forever' (provided you don't hit the database cap... heh)

Play games, win cash, get to the top of the leaderboards!

Server and player perks can be purchased by donating to give you and/or your server an edge against the competition!

Every command in the bot has a help page. Call  <name of command> (e.g.  blackjack) to see the page, it will show any aliases that you can use when pinging with @Gamble Bot and some examples of how to use the command. You can also @Gamble Bot help blackjack

Note: the help is currently tailored for the @Gamble Bot ping variation as opposed to slash commands but there's no difference between either option so choose which you prefer. If you see any mentions of $someCommand just calling @Gamble Bot someCommand instead will work (e.g. @Gamble Bot replaced the old prefix of $ which is no longer supported)

Getting Started
# View your profile

# Flip a coin

# Play some blackjack

# Get free money

# Get more free money and credit by voting

# Get _even more_ money and perks for making money faster

# Show the shop
 credit
 item

# Buy stuff
 boost
 item

# Show or activate your boosts
 show
 use

Getting started: Crypto Mine  
The mine is a side-game added to keep you entertained in between game cooldowns or just to compete with friends.

# Start your crypto mine

# Dig in the mine every minute

# Craft some packs to buy units

# View the mine shop
 mine

# Buy units to expand your mine
 unit

# Upgrade your miners
 miner

Understanding the command help  
To view all the available commands, you can call 

The help is linked to the COMMANDS tab on this website which is searchable and easier to use than 

Commands look like this in the help:

@Gamble Bot commandName <bet> [hard]
@Gamble Bot commandName <bet> [<optionalBet>]
Arguments wrapped in [] are optional. Anything not wrapped in these must be passed in for the command to work.

Arguments wrapped in <> are where you can pass a value in, e.g. <bet> would be where you put 1000

In the case where you have [hard | h] this indicates an optional hard mode for the game with slightly increased difficulty in exchange for better odds.

Slash commands assist in this and tell you whether the argument is optional and, if it has a fixed number of choices, will present you with those choices (e.g. you will be able to choose Easy or Hard mode for the hard argument)

For example:

@Gamble Bot blackjack <bet> [hard | h]
You could call:

 100
 100 hard
 100 h

In some cases, arguments are required as strings:

 <heads|tails> <bet>
In this case, you can use:

 heads 100
 tails 100

Every command help page has examples that show the various different ways to use the command.

Alternatives to slash commands  
@Gamble Bot blackjack <bet> [hard | h]  
@Gamble Bot bj <bet> [hard | h]  

Examples  
@Gamble Bot bj 1000  
@Gamble Bot bj 1k h  

Alternatives to slash commands  
@Gamble Bot coinFlip <heads|tails> <bet>  
@Gamble Bot cf <heads|tails> <bet>  

Examples  
@Gamble Bot coinFlip heads 1k  
@Gamble Bot cf t 1k  
@Gamble Bot cf h 1k  

Alternatives to slash commands  
@Gamble Bot connectFour  
@Gamble Bot c4  
@Gamble Bot connect4  

Alternatives to slash commands  
@Gamble Bot crash <bet> [hard | h]  
@Gamble Bot cr <bet> [hard | h]  

Examples  
@Gamble Bot crash 1k  
@Gamble Bot crash 1k hard  
@Gamble Bot cr 5k  
@Gamble Bot cr 5k h  

Alternatives to slash commands  
@Gamble Bot findTheLady <bet> [hard | h]  
@Gamble Bot ftl <bet> [hard | h]  

Examples  
@Gamble Bot findTheLady 1k  
@Gamble Bot ftl 1k  
@Gamble Bot findTheLady 1k hard  
@Gamble Bot ftl 1k h  

Alternatives to slash commands  
@Gamble Bot gamble <bet> [hard | h]  
@Gamble Bot g <bet> [hard | h]  
@Gamble Bot play <bet> [hard | h]  

Examples  
@Gamble Bot gamble 100  
@Gamble Bot gamble 100 hard  
@Gamble Bot g 100  
@Gamble Bot g 100 h  

Alternatives to slash commands  
@Gamble Bot higherOrLower  
@Gamble Bot hol  

Alternatives to slash commands  
@Gamble Bot poker <ante> [<bonus>]  
@Gamble Bot pkr <ante> [<bonus>]  

Examples  
@Gamble Bot pkr 100  
@Gamble Bot poker 100 100  
@Gamble Bot poker max  
@Gamble Bot poker max max  
@Gamble Bot poker allIn  

Alternatives to slash commands  
@Gamble Bot race <type> <1-12> <bet>  
@Gamble Bot r <type> <1-12> <bet>  

Examples  
@Gamble Bot race turtle 3 100  
@Gamble Bot race dog 5 100  
@Gamble Bot race horse 8 100  
@Gamble Bot race dinosaur 12 100  
@Gamble Bot r t 3 1k  
@Gamble Bot r di 12 1k  

Alternatives to slash commands  
@Gamble Bot rollDice <diceType> <prediction> <bet>  
@Gamble Bot roll <diceType> <prediction> <bet>  
@Gamble Bot ro <diceType> <prediction> <bet>  
@Gamble Bot rd <diceType> <prediction> <bet>  
@Gamble Bot dr <diceType> <prediction> <bet>  
@Gamble Bot diceRoll <diceType> <prediction> <bet>  
@Gamble Bot dice <diceType> <prediction> <bet>  

Examples  
@Gamble Bot rollDice d4 3 1k  
@Gamble Bot roll d20 20 1k  

Alternatives to slash commands  
@Gamble Bot roulette <prediction> <bet>  
@Gamble Bot rou <prediction> <bet>  

Examples  
@Gamble Bot roulette red 1k  
@Gamble Bot rou 0 1k  
@Gamble Bot rou 00 1k  
@Gamble Bot rou 1 1k  
@Gamble Bot rou 1,3,5 1k  
@Gamble Bot rou 1-10 1k  

Alternatives to slash commands  
@Gamble Bot rockPaperScissors <type> <bet>  
@Gamble Bot rps <type> <bet>  

Examples  
@Gamble Bot rockPaperScissors rock 1k  
@Gamble Bot rps r 1k  
@Gamble Bot rps s 1k  

Alternatives to slash commands  
@Gamble Bot sevens <prediction> <bet>  
@Gamble Bot sv <prediction> <bet>  

Examples  
@Gamble Bot sevens low 1k  
@Gamble Bot sv low 1k  
@Gamble Bot sv l 1k  
@Gamble Bot sv high 1k  
@Gamble Bot sv h 1k  
@Gamble Bot sv 7 1k  

Alternatives to slash commands  
@Gamble Bot slots <bet>  
@Gamble Bot sl <bet>  
@Gamble Bot slot <bet>  

Examples  
@Gamble Bot sl 1k  
@Gamble Bot slots 1k  

Alternatives to slash commands  
@Gamble Bot tictactoe  
@Gamble Bot ttt  
@Gamble Bot tictactoe  

Alternatives to slash commands  
@Gamble Bot cooldowns [detailed | d]
@Gamble Bot cd [detailed | d]
@Gamble Bot c [detailed | d]

Examples  
@Gamble Bot cooldowns  
@Gamble Bot cooldowns detailed  
@Gamble Bot cd  
@Gamble Bot cd d  

Alternatives to slash commands  
@Gamble Bot daily  

Alternatives to slash commands  
@Gamble Bot gift [idOrMention]
@Gamble Bot gifts [idOrMention]

Examples  
@Gamble Bot gifts  
@Gamble Bot gift @mention  
@Gamble Bot gift 123123123123123  

Alternatives to slash commands  
@Gamble Bot goals  
@Gamble Bot tasks  
@Gamble Bot t  

Examples  
@Gamble Bot goals  

Alternatives to slash commands  
@Gamble Bot lookup <idOrMention> [score | stats | mine | inventory]
@Gamble Bot find <idOrMention> [score | stats | mine | inventory]

Examples  
@Gamble Bot lookup @Gamble  
@Gamble Bot lookup 800383254389194754  
@Gamble Bot lookup @Gamble score  
@Gamble Bot lookup @Gamble stats  
@Gamble Bot lookup @Gamble mine  
@Gamble Bot lookup @Gamble inventory  
@Gamble Bot lookup @Gamble achievements  
@Gamble Bot lookup @Gamble achievements items  

Alternatives to slash commands  
@Gamble Bot lotto [<numTicketsToBuy>]
@Gamble Bot lottery [<numTicketsToBuy>]
@Gamble Bot ticket [<numTicketsToBuy>]
@Gamble Bot tickets [<numTicketsToBuy>]

Examples  
@Gamble Bot lotto  
@Gamble Bot lotto 10  

Alternatives to slash commands  
@Gamble Bot monthly  
@Gamble Bot patron  

Alternatives to slash commands  
@Gamble Bot overtime  
@Gamble Bot ot  

Alternatives to slash commands  
@Gamble Bot prestige  

Alternatives to slash commands  
@Gamble Bot me [score | stats | mine]
@Gamble Bot bal [score | stats | mine]
@Gamble Bot balance [score | stats | mine]
@Gamble Bot profile [score | stats | mine]
@Gamble Bot my [score | stats | mine]

Examples  
@Gamble Bot me  
@Gamble Bot my score  
@Gamble Bot my stats  
@Gamble Bot my mine  
@Gamble Bot my achievements  
@Gamble Bot my achievements items  

Alternatives to slash commands  
@Gamble Bot sell <id> <amount>
@Gamble Bot s <id> <amount>

Examples  
@Gamble Bot sell 1 yoyo  
@Gamble Bot sell yoyo 1  

Alternatives to slash commands  
@Gamble Bot send [idOrMention <amount>]
@Gamble Bot transfer [idOrMention <amount>]
@Gamble Bot give [idOrMention <amount>]

Examples  
@Gamble Bot send  
@Gamble Bot send @mention 10000  
@Gamble Bot send 123123123123123 10000  

Alternatives to slash commands  
@Gamble Bot shop [<mine | items | credits>] <page>
@Gamble Bot s [<mine | items | credits>] <page>

Examples  
@Gamble Bot shop  
@Gamble Bot shop mine  

Alternatives to slash commands  
@Gamble Bot spin  
@Gamble Bot randomItem  

Alternatives to slash commands  
@Gamble Bot vote [detailed | d]
@Gamble Bot v [detailed | d]

Examples  
@Gamble Bot vote  
@Gamble Bot vote detailed  
@Gamble Bot v  
@Gamble Bot v d  

Alternatives to slash commands  
@Gamble Bot weekly  
@Gamble Bot supporter  

Alternatives to slash commands  
@Gamble Bot work  
@Gamble Bot wk  
@Gamble Bot w  

Alternatives to slash commands  
@Gamble Bot yearly  
@Gamble Bot godlike  

Alternatives to slash commands  
@Gamble Bot craft [<amount> <itemId>]
@Gamble Bot cft [<amount> <itemId>]

Examples  
@Gamble Bot craft
@Gamble Bot craft 1 tech
@Gamble Bot craft 1 tp
@Gamble Bot craft 1 utility pack

Alternatives to slash commands  
@Gamble Bot dig 
@Gamble Bot d 

Alternatives to slash commands  
@Gamble Bot inventory 
@Gamble Bot inv 
@Gamble Bot i 

Examples  
@Gamble Bot inventory
@Gamble Bot inv
@Gamble Bot i

Alternatives to slash commands  
@Gamble Bot mine 
@Gamble Bot m 

Examples  
@Gamble Bot mine
@Gamble Bot m

Alternatives to slash commands  
@Gamble Bot process 
@Gamble Bot p 
@Gamble Bot pr 

Alternatives to slash commands  
@Gamble Bot startMine 
@Gamble Bot start 

Help Text
Shows the latest updates for the bot, changed every time the bot is updated

Alternatives to slash commands
@Gamble Bot updates 
@Gamble Bot announcements 
@Gamble Bot announce

Bets and number arguments  
All of the games in the bot support the same values for bets, as well as the shop and any other command that expects a number as an argument (like ).

You can bet using max (or m) to bet your Betting Maximum indicated by  You can also buy the maximum number of an item that you can afford, or sell the number of an item that you have using max or m as the count.

If you have less than your betting allowance, it will use all your current cash.

When betting, you can add the following letters after your bet as a shortcut for large numbers.

E.g. 1k = 1,000  
y  = 1,000,000,000,000,000,000,000,000  
z  = 1,000,000,000,000,000,000,000  
e  = 1,000,000,000,000,000,000  
p  = 1,000,000,000,000,000  
t  = 1,000,000,000,000  
g  = 1,000,000,000  
m  = 1,000,000  
k  = 1,000  

All games and commands expect numbers as whole, positive numbers.

Fractional numbers will be rounded down.

Earning money  
Cash Commands  
The simplest way to earn money in the bot is via the various cash commands.

You can call  to get some cash every 10 minutes, and  every day (resets at midnight regardless of when you called it)

Donators can get access to  as well as ,  and 

You can see the commands you have access to as well as when they are ready on  (/c)

Voting  
If you don't mind watching a few ads, you can vote for the bot to get 100,000 x your player level.

Voting consecutively without a gap of more than 48 hours between votes will increase the multiplier.

Each 21st vote will be a 3x multipler, which stacks with your streak multipler.

Assuming you are level 1, the following cash reward table shows what you could receive by chaining votes:

Vote Number	Multipler	Reward
1-20	1x	100,000
21	3x	300,000
22 - 41	2x	200,000
42	6x	600,000
43 - 62	3x	300,000
63	9x	900,000
64 - 83	4x	400,000
84	12x	1,200,000

If you vote on all 3 links every 12 hours, you can get 21 votes every 3.5 days. Voting on all three links once per day will take a week.

At level one voting every 12h, you could earn 23,000,000, level 2 would be 46,000,000 and so on!

top.gg also offers double votes on weekends for bot votes (Friday - Sunday). As they offer double votes, the bot offers double rewards.

This means that if you voted for the bot using top.gg on the weekend for your 84th vote, you could get a 24x multiplier!

Time your top.gg bot votes on weekends and you can make a large amount of money reasonably quickly!

Lotto  
A weekly lottery runs in the bot and is drawn at 11:00 Saturdays (London Time).

The starting value is 1,000,000 which is set immediately after the draw.

Every player can buy 1,000 tickets (each costing 1,000). Every ticket purchased increases the prize pot by 50,000

Buy tickets with  lotto X - As with all buy commands you can use max or a number to select the amount to buy.

When the draw is complete, the winner is posted in #lottery on the support server and sent a DM to tell them the winnings (you need the 'Allow direct messages from server members' enabled for this to work)

Earning XP  
XP can be earned two ways:

Winning gambles  
Earning Achievements  
Each gamble win provides your winning cash, as well as an amount of XP. This differs for each game, although most currently give 100 per win.

You can see your current XP and player level with 

Achievements also exist to bolster your XP and are the fastest way to get it. There are achievements for gambling, earning cash and buying/finding items.

You can see your achievements with  achievements and item achievements with  achievements items

Each achievement has a current well as a progress bar indicating your percentage to the target.

Every achievement earned grants 100xp. Generally these come in one at a time but when placing large bets with allIn it's common to get several achievements at once (e.g for cash earned).

Leaderboards  
Gamble Bot has a leaderboard for everything. Gambling, items, mining, you name it there's a leaderboard.

See all the available leaderboards with 

Show a leaderboard for your server with  <id> (e.g  blackjack). Use this to compete among friends in your server for the top spot!

Show a global leaderboard with  <id> g (e.g.  blackjack g). Global rankings is based on every player using the bot - compete for the coveted top spots!

Gambling  
Now that you have some cash, what do you do with it?!

GAMBLE!!!

You can see the full list of gambles available in the bot with  games.

The list shows the commands you can call to play the games, as well as aliases for the command.

Type the command and gamble away!

Game Guides  
I promise I'll actually write these at some point 😬

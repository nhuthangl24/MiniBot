# MiniBot

A Discord bot built with TypeScript and [discord.js](https://discord.js.org/).

## Features

- `/ping` – Replies with Pong! and shows the bot latency
- `/help` – Lists all available commands
- `/info` – Displays bot information (uptime, memory, ping, versions)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord application and bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/nhuthangl24/MiniBot.git
   cd MiniBot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   | Variable        | Description                                          |
   |-----------------|------------------------------------------------------|
   | `DISCORD_TOKEN` | Your bot token from the Discord Developer Portal     |
   | `CLIENT_ID`     | Your application's Client ID                         |
   | `GUILD_ID`      | *(Optional)* Guild ID for guild-scoped command deploy|

4. **Deploy slash commands**

   ```bash
   npm run deploy-commands
   ```

5. **Run the bot**

   ```bash
   # Development (ts-node, no build step)
   npm run dev

   # Production (compile first, then run)
   npm run build
   npm start
   ```

## Project Structure

```
MiniBot/
├── src/
│   ├── commands/          # Slash command modules
│   │   ├── ping.ts
│   │   ├── help.ts
│   │   └── info.ts
│   ├── events/            # Discord event handlers
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── handlers/          # Command & event loader utilities
│   │   ├── commandHandler.ts
│   │   └── eventHandler.ts
│   ├── deploy-commands.ts # Script to register slash commands
│   └── index.ts           # Bot entry point
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Adding New Commands

1. Create a new file in `src/commands/`, e.g. `src/commands/greet.ts`
2. Export a `data` (SlashCommandBuilder) and an `execute` function:

   ```ts
   import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

   module.exports = {
     data: new SlashCommandBuilder()
       .setName('greet')
       .setDescription('Say hello!'),

     async execute(interaction: ChatInputCommandInteraction) {
       await interaction.reply('Hello there! 👋');
     },
   };
   ```

3. Run `npm run deploy-commands` to register the new command with Discord.

## License

ISC

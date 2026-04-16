import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

export interface Command {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: import('discord.js').ChatInputCommandInteraction) => Promise<void>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
}) as ExtendedClient;

client.commands = new Collection<string, Command>();

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Error: DISCORD_TOKEN is not set in environment variables.');
  process.exit(1);
}

async function main() {
  await loadCommands(client);
  loadEvents(client);
  await client.login(token);
}

main().catch(console.error);

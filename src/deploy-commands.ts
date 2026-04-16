import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { REST, Routes } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('Error: DISCORD_TOKEN and CLIENT_ID must be set in environment variables.');
  process.exit(1);
}

const commands: unknown[] = [];
const commandsPath = path.join(__dirname, 'commands');

if (!fs.existsSync(commandsPath)) {
  console.error('Commands directory not found.');
  process.exit(1);
}

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`Skipping ${file}: missing "data" or "execute" property.`);
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Deploying ${commands.length} application (/) command(s)...`);

    let data: unknown;
    if (guildId) {
      data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`Successfully deployed commands to guild ${guildId}.`);
    } else {
      data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log('Successfully deployed global commands.');
    }

    const deployed = Array.isArray(data) ? data.length : 0;
    console.log(`Deployed ${deployed} command(s).`);
  } catch (error) {
    console.error('Failed to deploy commands:', error);
    process.exit(1);
  }
})();

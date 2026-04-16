import path from 'path';
import fs from 'fs';
import { ExtendedClient, Command } from '../index';

export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsPath = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(commandsPath)) {
    console.warn('Commands directory not found, skipping command loading.');
    return;
  }

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command: Command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`Command at ${filePath} is missing required "data" or "execute" properties.`);
    }
  }
}

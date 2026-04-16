import path from 'path';
import fs from 'fs';
import { ExtendedClient } from '../index';

export function loadEvents(client: ExtendedClient): void {
  const eventsPath = path.join(__dirname, '..', 'events');

  if (!fs.existsSync(eventsPath)) {
    console.warn('Events directory not found, skipping event loading.');
    return;
  }

  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args, client));
    }

    console.log(`Loaded event: ${event.name}`);
  }
}

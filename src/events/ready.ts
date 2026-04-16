import { Events, Client } from 'discord.js';

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    if (client.user) {
      console.log(`MiniBot is online! Logged in as ${client.user.tag}`);
    }
  },
};

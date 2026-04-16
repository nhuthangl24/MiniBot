import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { version } from 'discord.js';
import os from 'os';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Displays information about MiniBot.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptime = `${hours}h ${minutes}m ${seconds}s`;

    const memoryUsage = process.memoryUsage();
    const memoryMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle('🤖 MiniBot Info')
      .setColor(0x5865f2)
      .setThumbnail(interaction.client.user?.displayAvatarURL() ?? null)
      .addFields(
        { name: '📦 discord.js', value: `v${version}`, inline: true },
        { name: '🟢 Node.js', value: process.version, inline: true },
        { name: '💻 Platform', value: os.platform(), inline: true },
        { name: '⏱ Uptime', value: uptime, inline: true },
        { name: '🧠 Memory', value: `${memoryMB} MB`, inline: true },
        { name: '📡 Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'MiniBot v1.0.0' });

    await interaction.reply({ embeds: [embed] });
  },
};

import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { ExtendedClient } from '../index';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows a list of all available commands.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as ExtendedClient;

    const embed = new EmbedBuilder()
      .setTitle('📋 MiniBot Commands')
      .setColor(0x5865f2)
      .setDescription('Here is a list of all available commands:')
      .setTimestamp()
      .setFooter({ text: 'MiniBot', iconURL: client.user?.displayAvatarURL() });

    client.commands.forEach((command) => {
      const commandJson = command.data.toJSON() as { name: string; description?: string };
      embed.addFields({
        name: `/${commandJson.name}`,
        value: commandJson.description ?? 'No description',
        inline: false,
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};


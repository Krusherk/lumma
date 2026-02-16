import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Guild,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !guildId) {
  throw new Error("Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID before running the bot.");
}

const requiredChannels = [
  "start-here",
  "announcements",
  "status",
  "general",
  "yield-quests",
  "vault-talk",
  "support",
  "alpha-leaks",
  "memes",
];

const requiredRoles = [
  "team",
  "mod",
  "verified",
  "bronze",
  "silver",
  "gold",
  "diamond",
  "partner",
];

async function ensureRoles(guild: Guild) {
  for (const roleName of requiredRoles) {
    const existing = guild.roles.cache.find((role) => role.name === roleName);
    if (!existing) {
      await guild.roles.create({
        name: roleName,
        reason: "Lumma initial server bootstrap",
      });
    }
  }
}

async function ensureChannels(guild: Guild) {
  for (const channelName of requiredChannels) {
    const existing = guild.channels.cache.find((channel) => channel.name === channelName);
    if (!existing) {
      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        reason: "Lumma initial server bootstrap",
      });
    }
  }
}

async function postRules(guild: Guild) {
  const startHere = guild.channels.cache.find(
    (channel) => channel.name === "start-here" && channel.type === ChannelType.GuildText,
  ) as TextChannel | undefined;
  if (!startHere) {
    return;
  }
  const botMessages = await startHere.messages.fetch({ limit: 10 });
  const alreadyPosted = botMessages.some((message) =>
    message.author.id === startHere.client.user?.id &&
    message.content.includes("Lumma server rules"),
  );
  if (alreadyPosted) {
    return;
  }
  await startHere.send([
    "**Lumma server rules**",
    "1. No scams, phishing, or impersonation.",
    "2. No unsolicited DMs to members.",
    "3. No hate, harassment, or doxxing.",
    "4. Keep support requests in #support.",
    "5. Enforcement path: warn -> timeout -> ban.",
    "",
    "Type `!verify` in this channel to receive `@verified` role.",
  ].join("\n"));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
  const guild = await client.guilds.fetch(guildId);
  await guild.members.fetch({ withPresences: false });
  await ensureRoles(guild);
  await ensureChannels(guild);
  await postRules(guild);
  console.log(`Lumma bot ready in guild: ${guild.name}`);
});

client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.channels.cache.find(
    (item) => item.name === "start-here" && item.type === ChannelType.GuildText,
  ) as TextChannel | undefined;
  if (!channel) {
    return;
  }
  await channel.send(
    `Welcome ${member}. Read the rules and type \`!verify\` to unlock community channels.`,
  );
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content.trim().toLowerCase() !== "!verify") {
    return;
  }
  const guild = message.guild;
  if (!guild || !message.member) {
    return;
  }
  const channelName = message.channel.type === ChannelType.GuildText ? message.channel.name : "";
  if (channelName !== "start-here") {
    return;
  }
  const role = guild.roles.cache.find((item) => item.name === "verified");
  if (!role) {
    return;
  }
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await message.reply("Bot is missing Manage Roles permission.");
    return;
  }
  await message.member.roles.add(role);
  await message.reply("You're verified. Welcome to Lumma.");
});

client.login(token).catch((error) => {
  console.error("Discord bot login failed:", error);
  process.exit(1);
});

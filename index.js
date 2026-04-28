const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

const TOKEN = (process.env.DISCORD_TOKEN || "").trim();

if (!TOKEN) {
  console.error(
    "Missing DISCORD_TOKEN environment variable. Set it in Replit Secrets and restart.",
  );
  process.exit(1);
}

const PREFIX = "s!";
const BOT_NAME = "Snuggles Scripting";
const BOT_VERSION = "1.7.0";
const BOT_OWNER = "Snuggles";
const BRAND_COLOR = 0xff8fb1;
const SUCCESS_COLOR = 0x57f287;
const WARN_COLOR = 0xfee75c;
const ERROR_COLOR = 0xed4245;
const NOTE_COLOR = 0x9b59b6;

const SERVER_RULES = [
  "1. Be respectful to all members. No harassment, hate speech, or personal attacks.",
  "2. No spam, advertising, or self-promotion without permission.",
  "3. Keep content safe for work. No NSFW or graphic material.",
  "4. Use the correct channels for the correct topics.",
  "5. No scams, phishing links, or sharing malicious files.",
  "6. Listen to staff. Their decisions are final.",
  "7. Follow Discord's Terms of Service and Community Guidelines.",
];

const PAYMENT_INFO = {
  title: "Payment Methods & Prices",
  description: "Here are the accepted payment methods.",
  methods: [
    { name: "USD", value: "PayPal (Friends & Family) or CashApp." },
    { name: "Robux", value: "Group payouts only. 30% tax covered by buyer." },
    {
      name: "Giftcards",
      value: "Amazon, Roblox, Visa, or Mastercard giftcards accepted.",
    },
  ],
  note: "All sales are final. NO REFUNDS under any circumstances.",
};

const SERVICES = [
  {
    name: "Roblox Scripts",
    value:
      "Custom Lua scripts for your game — gameplay systems, tools, weapons, vehicles, and more.",
  },
  {
    name: "Commissions",
    value:
      "Full commissioned work, from small features to complete game systems. Open `s!ticket` to discuss.",
  },
  {
    name: "Custom Systems",
    value:
      "Inventory, shop, datastore, leaderboard, party, matchmaking, anti-exploit, and admin systems.",
  },
  {
    name: "Scripting Help",
    value:
      "Stuck on a bug or design question? Use `s!debug` to format your issue and we'll take a look.",
  },
  {
    name: "Code Reviews",
    value:
      "Get feedback on existing scripts — performance, structure, and best practices.",
  },
];

const SCRIPT_EXAMPLES = {
  ui: {
    title: "Basic ScreenGui (UI)",
    code:
      'local Players = game:GetService("Players")\n' +
      "local player = Players.LocalPlayer\n\n" +
      'local gui = Instance.new("ScreenGui")\n' +
      'gui.Name = "ExampleGui"\n' +
      'gui.Parent = player:WaitForChild("PlayerGui")\n\n' +
      'local frame = Instance.new("Frame")\n' +
      "frame.Size = UDim2.fromOffset(240, 120)\n" +
      "frame.Position = UDim2.fromScale(0.5, 0.5)\n" +
      "frame.AnchorPoint = Vector2.new(0.5, 0.5)\n" +
      "frame.BackgroundColor3 = Color3.fromRGB(30, 30, 35)\n" +
      "frame.Parent = gui\n\n" +
      'local label = Instance.new("TextLabel")\n' +
      "label.Size = UDim2.fromScale(1, 1)\n" +
      "label.BackgroundTransparency = 1\n" +
      'label.Text = "Hello, " .. player.Name\n' +
      "label.TextColor3 = Color3.new(1, 1, 1)\n" +
      "label.Font = Enum.Font.GothamMedium\n" +
      "label.TextSize = 18\n" +
      "label.Parent = frame",
  },
  admin: {
    title: "Tiny Admin Command System",
    code:
      'local Players = game:GetService("Players")\n' +
      'local ADMINS = { ["YourUsername"] = true }\n' +
      'local PREFIX = "/"\n\n' +
      "local commands = {}\n" +
      "commands.kick = function(speaker, target)\n" +
      "    local p = Players:FindFirstChild(target)\n" +
      '    if p then p:Kick("Kicked by " .. speaker.Name) end\n' +
      "end\n" +
      "commands.speed = function(_, target, value)\n" +
      "    local p = Players:FindFirstChild(target)\n" +
      "    if p and p.Character then\n" +
      '        p.Character:FindFirstChildOfClass("Humanoid").WalkSpeed = tonumber(value) or 16\n' +
      "    end\n" +
      "end\n\n" +
      "Players.PlayerAdded:Connect(function(player)\n" +
      "    player.Chatted:Connect(function(msg)\n" +
      "        if not ADMINS[player.Name] then return end\n" +
      "        if msg:sub(1, 1) ~= PREFIX then return end\n" +
      "        local args = {}\n" +
      '        for w in msg:sub(2):gmatch("%S+") do table.insert(args, w) end\n' +
      "        local cmd = table.remove(args, 1)\n" +
      "        if commands[cmd] then commands[cmd](player, table.unpack(args)) end\n" +
      "    end)\n" +
      "end)",
  },
  movement: {
    title: "Movement Tweaks (WalkSpeed + JumpPower)",
    code:
      'local Players = game:GetService("Players")\n\n' +
      "local function applyMovement(character)\n" +
      '    local humanoid = character:WaitForChild("Humanoid")\n' +
      "    humanoid.WalkSpeed = 24\n" +
      "    humanoid.JumpPower = 60\n" +
      "    humanoid.UseJumpPower = true\n" +
      "end\n\n" +
      "Players.PlayerAdded:Connect(function(player)\n" +
      "    player.CharacterAdded:Connect(applyMovement)\n" +
      "    if player.Character then applyMovement(player.Character) end\n" +
      "end)",
  },
  remote: {
    title: "RemoteEvent Server/Client Pattern",
    code:
      "-- ServerScriptService/MyHandler.server.lua\n" +
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\n' +
      'local event = Instance.new("RemoteEvent")\n' +
      'event.Name = "GiveCoins"\n' +
      "event.Parent = ReplicatedStorage\n\n" +
      "event.OnServerEvent:Connect(function(player, amount)\n" +
      "    amount = math.clamp(tonumber(amount) or 0, 0, 100)\n" +
      '    print(player.Name, "requested", amount, "coins")\n' +
      "end)\n\n" +
      "-- StarterPlayerScripts/MyClient.client.lua\n" +
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\n' +
      'local event = ReplicatedStorage:WaitForChild("GiveCoins")\n' +
      "event:FireServer(50)",
  },
  datastore: {
    title: "Safe DataStore Save/Load",
    code:
      'local DataStoreService = game:GetService("DataStoreService")\n' +
      'local Players = game:GetService("Players")\n' +
      'local store = DataStoreService:GetDataStore("PlayerData_v1")\n\n' +
      "local function load(player)\n" +
      "    local ok, data = pcall(store.GetAsync, store, player.UserId)\n" +
      "    return ok and data or { coins = 0 }\n" +
      "end\n\n" +
      "local function save(player, data)\n" +
      "    pcall(store.SetAsync, store, player.UserId, data)\n" +
      "end\n\n" +
      "Players.PlayerAdded:Connect(function(player)\n" +
      "    local data = load(player)\n" +
      '    print(player.Name, "loaded", data.coins, "coins")\n' +
      "    player.AncestryChanged:Connect(function()\n" +
      "        if not player.Parent then save(player, data) end\n" +
      "    end)\n" +
      "end)",
  },
};

const SNIPPETS = [
  {
    title: "Wait for a child safely",
    code:
      'local part = workspace:WaitForChild("MyPart", 5)\n' +
      'if not part then warn("MyPart never appeared") end',
  },
  {
    title: "Tween a part's position",
    code:
      'local TweenService = game:GetService("TweenService")\n' +
      "local info = TweenInfo.new(1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)\n" +
      "local tween = TweenService:Create(part, info, { Position = part.Position + Vector3.new(0, 5, 0) })\n" +
      "tween:Play()",
  },
  {
    title: "Loop through all players",
    code:
      "for _, player in ipairs(game.Players:GetPlayers()) do\n" +
      "    print(player.Name, player.UserId)\n" +
      "end",
  },
  {
    title: "pcall for safe API calls",
    code:
      "local ok, result = pcall(function()\n" +
      '    return HttpService:GetAsync("https://example.com/api")\n' +
      "end)\n" +
      'if not ok then warn("Request failed:", result) end',
  },
  {
    title: "Debounce a touch event",
    code:
      "local debounce = false\n" +
      "part.Touched:Connect(function(hit)\n" +
      "    if debounce then return end\n" +
      "    debounce = true\n" +
      '    print(hit.Name, "touched")\n' +
      "    task.wait(1)\n" +
      "    debounce = false\n" +
      "end)",
  },
];

const DOCS = [
  {
    name: "Roblox Creator Documentation",
    value: "https://create.roblox.com/docs",
  },
  {
    name: "Roblox API Reference",
    value: "https://create.roblox.com/docs/reference/engine",
  },
  { name: "Luau Language Reference", value: "https://luau-lang.org/" },
  {
    name: "DevForum (Scripting Support)",
    value:
      "https://devforum.roblox.com/c/help-and-feedback/scripting-support/55",
  },
  {
    name: "Roblox Style Guide",
    value: "https://roblox.github.io/lua-style-guide/",
  },
];

const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    nextOrderId: 1,
    nextWarnId: 1,
    nextWorkId: 1,
    nextReviewId: 1,
    orders: [],
    blacklist: [],
    warns: {},
    modLogChannels: {},
    portfolio: [],
    reviews: [],
    dailyClaims: {}, // userId -> last claim ms
    settings: {}, // guildId -> { reviewsChannelId, transcriptsChannelId, staffRoleId }
    stats: { ticketsOpened: 0, ticketsClosed: 0, ordersCreated: 0, ordersCompleted: 0, reviewsSubmitted: 0 },
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultData();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const base = defaultData();
    return {
      nextOrderId: parsed.nextOrderId || base.nextOrderId,
      nextWarnId: parsed.nextWarnId || base.nextWarnId,
      nextWorkId: parsed.nextWorkId || base.nextWorkId,
      nextReviewId: parsed.nextReviewId || base.nextReviewId,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      blacklist: Array.isArray(parsed.blacklist) ? parsed.blacklist : [],
      warns: parsed.warns && typeof parsed.warns === "object" ? parsed.warns : {},
      modLogChannels:
        parsed.modLogChannels && typeof parsed.modLogChannels === "object"
          ? parsed.modLogChannels
          : {},
      portfolio: Array.isArray(parsed.portfolio) ? parsed.portfolio : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      dailyClaims:
        parsed.dailyClaims && typeof parsed.dailyClaims === "object"
          ? parsed.dailyClaims
          : {},
      settings:
        parsed.settings && typeof parsed.settings === "object"
          ? parsed.settings
          : {},
      stats:
        parsed.stats && typeof parsed.stats === "object"
          ? { ...base.stats, ...parsed.stats }
          : base.stats,
    };
  } catch (err) {
    console.error("Failed to load data.json, starting fresh:", err);
    return defaultData();
  }
}

function getGuildSettings(guildId) {
  if (!data.settings[guildId]) data.settings[guildId] = {};
  return data.settings[guildId];
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save data.json:", err);
  }
}

const data = loadData();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel],
});

client.once("clientReady", () => {
  console.log(`${BOT_NAME} v${BOT_VERSION} ready.`);
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s).`);
  console.log(
    `Process PID: ${process.pid} • host: ${process.env.REPL_SLUG || process.env.HOSTNAME || "unknown"} • started: ${new Date().toISOString()}`,
  );
  console.log(
    `(If Discord shows duplicate replies, more than one bot process is logged in with this token. Stop the other host(s).)`,
  );
});

function isAdmin(member) {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

function hasPerm(member, flag) {
  if (!member) return false;
  return member.permissions.has(flag);
}

function parseUserId(token) {
  if (!token) return null;
  const match = token.match(/^(?:<@!?)?(\d{17,20})>?$/);
  return match ? match[1] : null;
}

function findOrder(id) {
  const numId = Number(id);
  if (!Number.isFinite(numId)) return null;
  return data.orders.find((o) => o.id === numId) || null;
}

function statusBadge(status) {
  switch (status) {
    case "pending":
      return "🟡 Pending";
    case "in_progress":
      return "🔵 In Progress";
    case "completed":
      return "🟢 Completed";
    case "cancelled":
      return "⚪ Cancelled";
    default:
      return status;
  }
}

const TIME_UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseDuration(str) {
  if (!str) return null;
  const match = String(str)
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(s|m|h|d)?$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2] || "m";
  const ms = value * TIME_UNITS[unit];
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms;
}

function formatDuration(ms) {
  const days = Math.floor(ms / TIME_UNITS.d);
  const hours = Math.floor((ms % TIME_UNITS.d) / TIME_UNITS.h);
  const minutes = Math.floor((ms % TIME_UNITS.h) / TIME_UNITS.m);
  const seconds = Math.floor((ms % TIME_UNITS.m) / TIME_UNITS.s);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && !days && !hours) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

async function logMod(guild, embed) {
  if (!guild) return;
  const channelId = data.modLogChannels[guild.id];
  if (!channelId) return;
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Failed to send mod log:", err);
  }
}

// --- single-send guard ---------------------------------------------------
// Every command handler should reply through `respond(message, ...)` instead
// of calling `message.channel.send` directly. This guarantees that a single
// command invocation produces at most one bot reply, even if a code path
// accidentally tries to send twice.
const RESPONDED = new WeakSet();

async function respond(message, payload) {
  if (RESPONDED.has(message)) {
    console.warn(
      `[respond] Suppressed duplicate reply for message ${message.id} (command: ${message.content?.slice(0, 40)})`,
    );
    return null;
  }
  RESPONDED.add(message);
  try {
    return await message.channel.send(payload);
  } catch (err) {
    console.error("[respond] send failed:", err);
    return null;
  }
}

// --- cooldown system -----------------------------------------------------
// Per-user, per-command soft rate limit. Staff (Manage Messages) bypass.
const COOLDOWN_BUCKETS = new Map(); // key: `${command}:${userId}` -> next-allowed ms

const COOLDOWNS_MS = {
  vouch: 60_000,
  review: 60_000,
  meme: 5_000,
  "8ball": 3_000,
  rate: 5_000,
  quote: 5_000,
  tip: 5_000,
  daily: 24 * 60 * 60 * 1000,
  pay: 10_000,
  stats: 5_000,
};

function checkCooldown(commandName, userId) {
  const ms = COOLDOWNS_MS[commandName];
  if (!ms) return 0;
  const key = `${commandName}:${userId}`;
  const now = Date.now();
  const next = COOLDOWN_BUCKETS.get(key) || 0;
  if (now < next) return Math.ceil((next - now) / 1000);
  COOLDOWN_BUCKETS.set(key, now + ms);
  return 0;
}

// --- per-process dedup ---------------------------------------------------
// If the gateway ever delivers the same MESSAGE_CREATE event twice (rare
// reconnection edge case), this guard makes sure we only handle it once.
const HANDLED_MESSAGES = new Map();
const HANDLED_TTL_MS = 60_000;

function alreadyHandled(messageId) {
  const now = Date.now();
  for (const [id, ts] of HANDLED_MESSAGES) {
    if (now - ts > HANDLED_TTL_MS) HANDLED_MESSAGES.delete(id);
  }
  if (HANDLED_MESSAGES.has(messageId)) return true;
  HANDLED_MESSAGES.set(messageId, now);
  return false;
}

const COMMAND_LIST = [
  {
    category: "General",
    items: [
      { name: "s!help", desc: "Show this command list." },
      { name: "s!info", desc: "Show bot info (name, version, owner)." },
      {
        name: "s!status",
        desc: "Show whether the bot and services are online.",
      },
      { name: "s!ping", desc: "Replies with pong 🧸." },
      { name: "s!rules", desc: "Posts the server rules." },
      { name: "s!prices", desc: "Posts payment methods and pricing notes." },
      { name: "s!ticket", desc: "Open a private support ticket channel." },
    ],
  },
  {
    category: "Commission / Business",
    items: [
      { name: "s!services", desc: "List what Snuggles Scripting offers." },
      { name: "s!queue", desc: "Show active and pending commissions." },
      {
        name: "s!statusorder <id>",
        desc: "Check the status of a specific order.",
      },
    ],
  },
  {
    category: "Scripting Utility",
    items: [
      {
        name: "s!script <type>",
        desc: "Example scripts (ui, admin, movement, remote, datastore).",
      },
      { name: "s!snippet", desc: "Useful Lua / Roblox code snippets." },
      { name: "s!docs", desc: "Scripting documentation and resources." },
      {
        name: "s!debug",
        desc: "Format template for getting help with errors.",
      },
    ],
  },
  {
    category: "Moderation",
    items: [
      { name: "s!ban <user> <reason>", desc: "Ban a user and log the reason." },
      { name: "s!kick <user> <reason>", desc: "Kick a user from the server." },
      {
        name: "s!mute <user> <time> <reason>",
        desc: "Timeout a user (e.g. 10m, 1h, 1d).",
      },
      {
        name: "s!warn <user> <reason>",
        desc: "Warn a user. Stored for later review.",
      },
      { name: "s!warns <user>", desc: "View a user's warning history." },
      { name: "s!unwarn <id>", desc: "Remove a specific warning by ID." },
      { name: "s!purge <count>", desc: "Bulk delete the last <count> messages (1-100)." },
    ],
  },
  {
    category: "Info",
    items: [
      { name: "s!userinfo [user]", desc: "Show info about a user." },
      { name: "s!serverinfo", desc: "Show info about this server." },
      { name: "s!avatar [user]", desc: "Show a user's avatar." },
      { name: "s!uptime", desc: "Show how long the bot has been running." },
    ],
  },
  {
    category: "Portfolio",
    items: [
      {
        name: "s!work [page]",
        desc: "Browse Snuggles McBear's previous work (one per page). Alias: s!portfolio.",
      },
      {
        name: "s!addwork <url> [title]",
        desc: "Add an image or video to the gallery (URL or attach the file). Staff only.",
      },
      {
        name: "s!removework <id>",
        desc: "Remove an entry by ID. Staff only.",
      },
    ],
  },
  {
    category: "Logging",
    items: [
      {
        name: "s!setlog [channel]",
        desc: "Set the mod log channel. Omit to disable.",
      },
    ],
  },
  {
    category: "Partnership",
    items: [
      {
        name: "s!partner <invite> <info>",
        desc: "Post a partnership announcement with @here.",
      },
    ],
  },
  {
    category: "Tickets",
    items: [
      {
        name: "s!ticketpanel",
        desc: "Post the ticket creation panel in this channel.",
      },
      { name: "s!close", desc: "Close the current ticket channel." },
      {
        name: "s!addnote <text>",
        desc: "Add an internal staff note to the ticket.",
      },
    ],
  },
  {
    category: "Commission Admin",
    items: [
      {
        name: "s!addorder <user> <details>",
        desc: "Add a new commission to the queue.",
      },
      { name: "s!complete <id>", desc: "Mark a commission as completed." },
      {
        name: "s!announce <message>",
        desc: "Send a styled server announcement.",
      },
      { name: "s!blacklist <user>", desc: "Toggle a user's bot access." },
    ],
  },
  {
    category: "Reviews & Payment",
    items: [
      {
        name: "s!review <1-5> <type> | <message>",
        desc: "Submit a public review (posts in reviews channel if set).",
      },
      { name: "s!vouch <text>", desc: "Quick positive vouch." },
      { name: "s!pay", desc: "Show CashApp & PayPal payment methods." },
      {
        name: "s!setreviews [#channel]",
        desc: "Set the reviews channel. Omit to clear. (Manage Server)",
      },
      {
        name: "s!settranscripts [#channel]",
        desc: "Set the ticket transcripts channel. Omit to clear. (Manage Server)",
      },
    ],
  },
  {
    category: "Fun",
    items: [
      { name: "s!quote", desc: "Random motivational quote." },
      { name: "s!tip", desc: "Random scripting / UI tip." },
      { name: "s!meme", desc: "Random wholesome meme." },
      { name: "s!8ball <question>", desc: "Magic 8-ball answers." },
      { name: "s!rate <thing>", desc: "I rate it 0–10." },
      { name: "s!daily", desc: "Claim your daily reward (once per 24h)." },
      { name: "s!stats", desc: "Show bot activity stats." },
    ],
  },
];

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setTitle(`${BOT_NAME} — Commands`)
    .setDescription(`Here's everything I can do. Prefix is \`${PREFIX}\`.`)
    .setColor(BRAND_COLOR)
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` });

  for (const group of COMMAND_LIST) {
    embed.addFields({
      name: group.category,
      value: group.items.map((c) => `\`${c.name}\` — ${c.desc}`).join("\n"),
    });
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleInfo(message) {
  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;

  const embed = new EmbedBuilder()
    .setTitle(`${BOT_NAME}`)
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "Bot", value: client.user?.tag || "Unknown", inline: true },
      { name: "Version", value: BOT_VERSION, inline: true },
      { name: "Owner", value: BOT_OWNER, inline: true },
      { name: "Library", value: "discord.js v14", inline: true },
      { name: "Runtime", value: `Node.js ${process.version}`, inline: true },
      { name: "Servers", value: `${client.guilds.cache.size}`, inline: true },
      {
        name: "Uptime",
        value: `${hours}h ${minutes}m ${seconds}s`,
        inline: true,
      },
    )
    .setFooter({ text: "Built with discord.js" });

  await message.channel.send({ embeds: [embed] });
}

async function handleStatus(message) {
  const wsPing = Math.max(0, Math.round(client.ws.ping));
  const sent = await message.channel.send("Checking status...");
  const apiLatency = sent.createdTimestamp - message.createdTimestamp;

  const embed = new EmbedBuilder()
    .setTitle("System Status")
    .setColor(SUCCESS_COLOR)
    .addFields(
      { name: "Bot", value: "🟢 Online", inline: true },
      { name: "Gateway", value: `${wsPing} ms`, inline: true },
      { name: "API Latency", value: `${apiLatency} ms`, inline: true },
      {
        name: "Commission System",
        value: `🟢 Operational (${data.orders.length} order${data.orders.length === 1 ? "" : "s"} tracked)`,
      },
      { name: "Ticket System", value: "🟢 Operational" },
      { name: "Moderation", value: "🟢 Operational" },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` });

  await sent.edit({ content: "", embeds: [embed] });
}

async function handlePing(message) {
  await message.channel.send("pong 🧸");
}

async function handleRules(message) {
  const embed = new EmbedBuilder()
    .setTitle("Server Rules")
    .setDescription(SERVER_RULES.join("\n"))
    .setColor(BRAND_COLOR)
    .setFooter({
      text: "Please follow the rules to keep this community safe.",
    });

  await message.channel.send({ embeds: [embed] });
}

async function handlePrices(message) {
  const embed = new EmbedBuilder()
    .setTitle(PAYMENT_INFO.title)
    .setDescription(PAYMENT_INFO.description)
    .setColor(SUCCESS_COLOR)
    .addFields(
      PAYMENT_INFO.methods.map((m) => ({
        name: m.name,
        value: m.value,
        inline: false,
      })),
    )
    .addFields({ name: "Refund Policy", value: PAYMENT_INFO.note })
    .setFooter({
      text: `Open a ticket with ${PREFIX}ticket to start a purchase.`,
    });

  await message.channel.send({ embeds: [embed] });
}

async function handleServices(message) {
  const embed = new EmbedBuilder()
    .setTitle(`${BOT_NAME} — Services`)
    .setDescription("Here's what we offer.")
    .setColor(BRAND_COLOR)
    .addFields(SERVICES)
    .setFooter({ text: `Use ${PREFIX}ticket to start a commission.` });

  await message.channel.send({ embeds: [embed] });
}

async function handleQueue(message) {
  const active = data.orders.filter(
    (o) => o.status === "pending" || o.status === "in_progress",
  );

  const embed = new EmbedBuilder()
    .setTitle("Commission Queue")
    .setColor(BRAND_COLOR)
    .setFooter({
      text: `${active.length} active order${active.length === 1 ? "" : "s"}`,
    });

  if (active.length === 0) {
    embed.setDescription(
      `The queue is empty. Use \`${PREFIX}ticket\` to request a commission.`,
    );
  } else {
    embed.setDescription(
      active
        .map(
          (o) =>
            `**#${o.id}** — ${statusBadge(o.status)}\n<@${o.userId}> — ${o.details}`,
        )
        .join("\n\n"),
    );
  }

  await message.channel.send({ embeds: [embed] });
}

async function handleStatusOrder(message, args) {
  const id = args[0];
  if (!id) {
    await message.channel.send(
      `Usage: \`${PREFIX}statusorder <id>\` — example: \`${PREFIX}statusorder 3\``,
    );
    return;
  }

  const order = findOrder(id);
  if (!order) {
    await message.channel.send(`No order found with ID \`${id}\`.`);
    return;
  }

  const created = new Date(order.createdAt);
  const updated = new Date(order.updatedAt);

  const embed = new EmbedBuilder()
    .setTitle(`Order #${order.id}`)
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "Status", value: statusBadge(order.status), inline: true },
      { name: "Customer", value: `<@${order.userId}>`, inline: true },
      { name: "Details", value: order.details },
      {
        name: "Created",
        value: `<t:${Math.floor(created.getTime() / 1000)}:f>`,
        inline: true,
      },
      {
        name: "Updated",
        value: `<t:${Math.floor(updated.getTime() / 1000)}:R>`,
        inline: true,
      },
    );

  await message.channel.send({ embeds: [embed] });
}

async function handleScript(message, args) {
  const type = (args[0] || "").toLowerCase();
  const available = Object.keys(SCRIPT_EXAMPLES).join(", ");

  if (!type) {
    await message.channel.send(
      `Usage: \`${PREFIX}script <type>\` — available types: \`${available}\``,
    );
    return;
  }

  const example = SCRIPT_EXAMPLES[type];
  if (!example) {
    await message.channel.send(
      `No example for \`${type}\`. Available types: \`${available}\``,
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(example.title)
    .setColor(BRAND_COLOR)
    .setDescription("```lua\n" + example.code + "\n```")
    .setFooter({ text: `Category: ${type}` });

  await message.channel.send({ embeds: [embed] });
}

async function handleSnippet(message) {
  const snippet = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
  const embed = new EmbedBuilder()
    .setTitle(`Snippet — ${snippet.title}`)
    .setColor(BRAND_COLOR)
    .setDescription("```lua\n" + snippet.code + "\n```")
    .setFooter({ text: `Use ${PREFIX}snippet again for another one.` });

  await message.channel.send({ embeds: [embed] });
}

async function handleDocs(message) {
  const embed = new EmbedBuilder()
    .setTitle("Scripting Resources")
    .setDescription("Helpful references for Roblox / Luau development.")
    .setColor(BRAND_COLOR)
    .addFields(DOCS.map((d) => ({ name: d.name, value: d.value })))
    .setFooter({ text: "Bookmark these — they'll save you hours." });

  await message.channel.send({ embeds: [embed] });
}

async function handleDebug(message) {
  const template =
    "```\n" +
    "What you're trying to do:\n" +
    "<describe the goal>\n\n" +
    "What's happening instead:\n" +
    "<describe the actual behavior>\n\n" +
    "Error message (if any):\n" +
    "<paste the full error from the Output window>\n\n" +
    "Relevant code:\n" +
    "<paste only the section that breaks — keep it short>\n\n" +
    "What you've tried:\n" +
    "<list any fixes you already attempted>\n" +
    "```";

  const embed = new EmbedBuilder()
    .setTitle("Need Help With an Error?")
    .setDescription(
      "Copy the template below, fill it out, and post it in the help channel or your ticket. The more specific you are, the faster we can help.\n\n" +
        template,
    )
    .setColor(WARN_COLOR);

  await respond(message, { embeds: [embed] });
}

async function handleAddOrder(message, args) {
  if (!isAdmin(message.member)) {
    await message.channel.send("This command is admin only.");
    return;
  }

  if (args.length < 2) {
    await message.channel.send(`Usage: \`${PREFIX}addorder <@user> <details>\``);
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.channel.send("First argument must be a user mention or user ID.");
    return;
  }

  const details = args.slice(1).join(" ").trim();
  if (!details) {
    await message.channel.send("Please include order details after the user.");
    return;
  }

  const now = new Date().toISOString();
  const order = {
    id: data.nextOrderId++,
    userId,
    details,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    createdBy: message.author.id,
  };
  data.orders.push(order);
  data.stats.ordersCreated = (data.stats.ordersCreated || 0) + 1;
  saveData();
  console.log(
    `[order] Created #${order.id} for user ${order.userId} by ${message.author.tag}`,
  );

  const embed = new EmbedBuilder()
    .setTitle(`Order #${order.id} created`)
    .setColor(SUCCESS_COLOR)
    .addFields(
      { name: "Customer", value: `<@${order.userId}>`, inline: true },
      { name: "Status", value: statusBadge(order.status), inline: true },
      { name: "Details", value: order.details },
    )
    .setFooter({ text: `Added by ${message.author.tag}` });

  await message.channel.send({ embeds: [embed] });
}

async function handleComplete(message, args) {
  if (!isAdmin(message.member)) {
    await message.channel.send("This command is admin only.");
    return;
  }

  const id = args[0];
  if (!id) {
    await message.channel.send(`Usage: \`${PREFIX}complete <id>\``);
    return;
  }

  const order = findOrder(id);
  if (!order) {
    await message.channel.send(`No order found with ID \`${id}\`.`);
    return;
  }

  if (order.status === "completed") {
    await message.channel.send(`Order #${order.id} is already completed.`);
    return;
  }

  order.status = "completed";
  order.updatedAt = new Date().toISOString();
  data.stats.ordersCompleted = (data.stats.ordersCompleted || 0) + 1;
  saveData();
  console.log(
    `[order] Completed #${order.id} by ${message.author.tag}`,
  );

  const embed = new EmbedBuilder()
    .setTitle(`Order #${order.id} completed`)
    .setColor(SUCCESS_COLOR)
    .addFields(
      { name: "Customer", value: `<@${order.userId}>`, inline: true },
      { name: "Status", value: statusBadge(order.status), inline: true },
      { name: "Details", value: order.details },
    )
    .setFooter({ text: `Marked complete by ${message.author.tag}` });

  await message.channel.send({ embeds: [embed] });
}

async function handleAnnounce(message, args) {
  if (!isAdmin(message.member)) {
    await message.channel.send("This command is admin only.");
    return;
  }

  const text = args.join(" ").trim();
  if (!text) {
    await message.channel.send(`Usage: \`${PREFIX}announce <message>\``);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("📣 Announcement")
    .setDescription(text)
    .setColor(BRAND_COLOR)
    .setFooter({
      text: `Posted by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp(new Date());

  await message.channel.send({
    content: "@everyone",
    embeds: [embed],
    allowedMentions: { parse: ["everyone"] },
  });
}

async function handleBlacklist(message, args) {
  if (!isAdmin(message.member)) {
    await message.channel.send("This command is admin only.");
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.channel.send(`Usage: \`${PREFIX}blacklist <@user>\``);
    return;
  }

  const idx = data.blacklist.indexOf(userId);
  let action;
  if (idx === -1) {
    data.blacklist.push(userId);
    action = "added to";
  } else {
    data.blacklist.splice(idx, 1);
    action = "removed from";
  }
  saveData();

  const embed = new EmbedBuilder()
    .setTitle("Blacklist Updated")
    .setDescription(`<@${userId}> has been **${action}** the blacklist.`)
    .setColor(idx === -1 ? ERROR_COLOR : SUCCESS_COLOR)
    .setFooter({ text: `By ${message.author.tag}` })
    .setTimestamp(new Date());

  await message.channel.send({ embeds: [embed] });
  await logMod(message.guild, embed);
}

// --- Moderation: ban / kick / mute (rebuilt 1.6.0) -----------------------
// Each handler uses respond() exactly. Every code path returns immediately
// after the single response, so no path can ever produce two replies for one
// command invocation.

async function handleBan(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.BanMembers)) {
    return respond(message, "You need the **Ban Members** permission to use this.");
  }
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
    return respond(message, "I'm missing the **Ban Members** permission.");
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return respond(message, `Usage: \`${PREFIX}ban <@user> <reason>\``);
  }
  if (userId === message.author.id) {
    return respond(message, "You can't ban yourself.");
  }
  if (userId === client.user.id) {
    return respond(message, "I can't ban myself.");
  }

  const reason = args.slice(1).join(" ").trim() || "No reason provided";

  try {
    await message.guild.bans.create(userId, {
      reason: `By ${message.author.tag}: ${reason}`,
    });
  } catch (err) {
    console.error("Ban failed:", err);
    return respond(message, "Failed to ban that user. Check my role hierarchy and permissions.");
  }

  const embed = new EmbedBuilder()
    .setTitle("User Banned")
    .setColor(ERROR_COLOR)
    .addFields(
      { name: "User", value: `<@${userId}> (${userId})` },
      { name: "Reason", value: reason },
      { name: "Moderator", value: message.author.tag },
    )
    .setTimestamp(new Date());

  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleKick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.KickMembers)) {
    return respond(message, "You need the **Kick Members** permission to use this.");
  }
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
    return respond(message, "I'm missing the **Kick Members** permission.");
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    return respond(message, `Usage: \`${PREFIX}kick <@user> [reason]\``);
  }
  if (userId === message.author.id) {
    return respond(message, "You can't kick yourself.");
  }
  if (userId === client.user.id) {
    return respond(message, "I can't kick myself.");
  }

  const reason = args.slice(1).join(" ").trim() || "No reason provided";

  let target;
  try {
    target = await message.guild.members.fetch(userId);
  } catch {
    return respond(message, "That user isn't in this server.");
  }
  if (!target.kickable) {
    return respond(message, "I can't kick that user (role hierarchy issue).");
  }

  try {
    await target.kick(`By ${message.author.tag}: ${reason}`);
  } catch (err) {
    console.error("Kick failed:", err);
    return respond(message, "Failed to kick that user.");
  }

  const embed = new EmbedBuilder()
    .setTitle("User Kicked")
    .setColor(WARN_COLOR)
    .addFields(
      { name: "User", value: `<@${userId}> (${userId})` },
      { name: "Reason", value: reason },
      { name: "Moderator", value: message.author.tag },
    )
    .setTimestamp(new Date());

  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleMute(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) {
    return respond(message, "You need the **Timeout Members** permission to use this.");
  }
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return respond(message, "I'm missing the **Timeout Members** permission.");
  }

  const userId = parseUserId(args[0]);
  if (!userId || !args[1]) {
    return respond(
      message,
      `Usage: \`${PREFIX}mute <@user> <time> [reason]\` — e.g. \`${PREFIX}mute @user 10m spamming\``,
    );
  }
  if (userId === message.author.id) {
    return respond(message, "You can't mute yourself.");
  }
  if (userId === client.user.id) {
    return respond(message, "I can't mute myself.");
  }

  const ms = parseDuration(args[1]);
  if (!ms) {
    return respond(message, "Invalid duration. Use formats like `30s`, `10m`, `2h`, `1d`.");
  }
  const MAX_MS = 28 * TIME_UNITS.d;
  if (ms > MAX_MS) {
    return respond(message, "Maximum mute duration is 28 days.");
  }

  const reason = args.slice(2).join(" ").trim() || "No reason provided";

  let target;
  try {
    target = await message.guild.members.fetch(userId);
  } catch {
    return respond(message, "That user isn't in this server.");
  }
  if (!target.moderatable) {
    return respond(message, "I can't mute that user (role hierarchy issue).");
  }

  try {
    await target.timeout(ms, `By ${message.author.tag}: ${reason}`);
  } catch (err) {
    console.error("Mute failed:", err);
    return respond(message, "Failed to mute that user.");
  }

  const embed = new EmbedBuilder()
    .setTitle("User Muted")
    .setColor(WARN_COLOR)
    .addFields(
      { name: "User", value: `<@${userId}> (${userId})` },
      { name: "Duration", value: formatDuration(ms), inline: true },
      { name: "Reason", value: reason, inline: true },
      { name: "Moderator", value: message.author.tag },
    )
    .setTimestamp(new Date());

  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleWarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) {
    await message.channel.send(
      "You need the **Timeout Members** permission to issue warnings.",
    );
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.channel.send(`Usage: \`${PREFIX}warn <@user> <reason>\``);
    return;
  }
  const reason = args.slice(1).join(" ").trim();
  if (!reason) {
    await message.channel.send("Please include a reason for the warning.");
    return;
  }

  const warn = {
    id: data.nextWarnId++,
    reason,
    moderatorId: message.author.id,
    at: new Date().toISOString(),
  };

  if (!data.warns[userId]) data.warns[userId] = [];
  data.warns[userId].push(warn);
  saveData();

  const total = data.warns[userId].length;

  const embed = new EmbedBuilder()
    .setTitle("User Warned")
    .setColor(WARN_COLOR)
    .addFields(
      { name: "User", value: `<@${userId}>`, inline: true },
      { name: "Warning ID", value: `#${warn.id}`, inline: true },
      { name: "Total Warnings", value: `${total}`, inline: true },
      { name: "Reason", value: reason },
      { name: "Moderator", value: `${message.author.tag}` },
    )
    .setTimestamp(new Date());

  await message.channel.send({ embeds: [embed] });
  await logMod(message.guild, embed);

  try {
    const target = await client.users.fetch(userId);
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`You were warned in ${message.guild.name}`)
          .setColor(WARN_COLOR)
          .addFields(
            { name: "Reason", value: reason },
            { name: "Total Warnings", value: `${total}` },
          )
          .setTimestamp(new Date()),
      ],
    });
  } catch {
    // user has DMs closed, ignore
  }
}

async function handlePartner(message, args) {
  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageGuild)
  ) {
    await message.channel.send(
      "You need the **Manage Server** permission to post partnerships.",
    );
    return;
  }

  if (args.length < 2) {
    await message.channel.send(
      `Usage: \`${PREFIX}partner <invite> <info about the server>\``,
    );
    return;
  }

  const invite = args[0];
  const info = args.slice(1).join(" ").trim();

  if (
    !/^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\//i.test(invite)
  ) {
    await message.channel.send(
      "Please provide a valid Discord invite link (e.g. https://discord.gg/abcd).",
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🤝 New Partnership")
    .setColor(BRAND_COLOR)
    .setDescription(
      `**About the partner**\n${info}\n\n` +
        `**Invite**\n${invite}\n\n` +
        `_Brought to you in partnership with **${BOT_NAME}** — your home for Roblox commissions, custom systems, and scripting help._`,
    )
    .setFooter({
      text: `Posted by ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp(new Date());

  await message.channel.send({
    content: "@here",
    embeds: [embed],
    allowedMentions: { parse: ["everyone"] },
  });
}

async function handleTicket(message) {
  await openTicketForUser(message.channel, message.member, null);
}

async function handleTicketPanel(message) {
  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageChannels)
  ) {
    await message.channel.send(
      "You need the **Manage Channels** permission to post the panel.",
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${BOT_NAME} — Open a Ticket`)
    .setDescription(
      "Need a commission, scripting help, or want to talk to staff?\n\n" +
        "Click **Open Ticket** below to fill out a quick form. A private channel will be created where only you and staff can see the conversation.",
    )
    .setColor(BRAND_COLOR)
    .setFooter({ text: `${BOT_NAME} • Tickets` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open")
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🧸"),
  );

  await message.channel.send({ embeds: [embed], components: [row] });
}

async function buildTranscript(channel) {
  const all = [];
  let lastId;
  // Fetch up to ~1000 messages in 100-batch pages.
  for (let i = 0; i < 10; i++) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (!batch.size) break;
    all.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }
  all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = [
    `Transcript of #${channel.name}`,
    `Channel ID: ${channel.id}`,
    `Generated: ${new Date().toISOString()}`,
    `Message count: ${all.length}`,
    "",
    "----------------------------------------",
    "",
  ];
  for (const m of all) {
    const ts = new Date(m.createdTimestamp).toISOString();
    const author = `${m.author.tag} (${m.author.id})`;
    let body = m.content || "";
    if (m.embeds?.length) {
      for (const e of m.embeds) {
        const t = e.title ? `[Embed] ${e.title}` : "[Embed]";
        const d = e.description ? ` — ${e.description.replace(/\n/g, " ")}` : "";
        body += `\n  ${t}${d}`;
      }
    }
    if (m.attachments?.size) {
      for (const a of m.attachments.values()) body += `\n  [Attachment] ${a.url}`;
    }
    lines.push(`[${ts}] ${author}: ${body || "(no content)"}\n`);
  }
  return lines.join("\n");
}

async function handleClose(message) {
  const channel = message.channel;
  if (!channel.name || !channel.name.startsWith("ticket-")) {
    await message.channel.send("This command only works inside a ticket channel.");
    return;
  }

  await message.channel.send("Generating transcript...");

  let transcript = "";
  try {
    transcript = await buildTranscript(channel);
  } catch (err) {
    console.error("Transcript build failed:", err);
    transcript = `Transcript generation failed: ${err.message}\nClosed by ${message.author.tag} at ${new Date().toISOString()}`;
  }

  // Send transcript to the configured transcripts channel (falls back to mod log).
  const settings = getGuildSettings(message.guild.id);
  const targetChannelId =
    settings.transcriptsChannelId || data.modLogChannels[message.guild.id];

  if (targetChannelId) {
    try {
      const target = await message.guild.channels.fetch(targetChannelId);
      if (target?.isTextBased()) {
        const buffer = Buffer.from(transcript, "utf8");
        const embed = new EmbedBuilder()
          .setTitle("🎟️ Ticket Closed")
          .setColor(BRAND_COLOR)
          .addFields(
            { name: "Channel", value: `#${channel.name}` },
            { name: "Closed by", value: message.author.tag },
          )
          .setTimestamp(new Date());
        await target.send({
          embeds: [embed],
          files: [{ attachment: buffer, name: `${channel.name}-transcript.txt` }],
        });
      }
    } catch (err) {
      console.error("Failed to send transcript:", err);
    }
  } else {
    console.warn(
      `[close] No transcripts channel set for guild ${message.guild.id}. Use s!settranscripts #channel.`,
    );
  }

  data.stats.ticketsClosed = (data.stats.ticketsClosed || 0) + 1;
  saveData();
  console.log(
    `[ticket] Closed #${channel.name} by ${message.author.tag} (transcript: ${transcript.length} chars)`,
  );

  await message.channel.send("Closing this ticket in 5 seconds...");
  setTimeout(() => {
    channel.delete(`Ticket closed by ${message.author.tag}`).catch((err) => {
      console.error("Failed to delete ticket channel:", err);
    });
  }, 5000);
}

// =========================================================================
// New v1.7.0 commands: review, vouch, pay, fun, daily, stats, settings
// =========================================================================

const QUOTES = [
  "Code is poetry — write it like someone you respect will read it.",
  "Small details make big experiences. Sweat them.",
  "The best script is the one you can read six months from now.",
  "Don't optimize early. Don't optimize late. Optimize when it matters.",
  "Every bug is a lesson disguised as frustration.",
  "Clean code beats clever code. Always.",
  "If it's hard to explain, it's probably hard to maintain.",
  "Ship something today. Polish it tomorrow.",
  "Reading code is a superpower. Practice it.",
  "Comment the WHY, not the WHAT.",
  "Your future self is your most demanding user.",
  "Ten lines that work beat a hundred lines that don't.",
  "Refactor like a chef cleans as they cook.",
  "Naming is half the design.",
  "If you can't test it, you don't understand it.",
];

const TIPS = [
  "Use `task.wait()` instead of `wait()` — it's faster and more accurate.",
  "Cache `:GetService()` calls at the top of your script. They're free after the first call but the lookup adds up.",
  "Always parent UI to `PlayerGui` AFTER setting properties — Discord, ahem, Roblox does fewer redraws.",
  "RemoteEvents are fire-and-forget. RemoteFunctions block — only use them when you need a return value.",
  "DataStore writes are rate-limited. Batch them and use `:UpdateAsync` over `:SetAsync` to avoid race conditions.",
  "Use `Vector3.zero` and `Vector3.one` instead of `Vector3.new(0,0,0)` — fewer allocations.",
  "Anchor parts you don't want physics on. The engine will thank you.",
  "Validate everything from the client on the server. Never trust the client.",
  "`UDim2.fromScale` and `UDim2.fromOffset` make UI math 10x clearer than `UDim2.new(...)`.",
  "Use `:Destroy()` on instances you're done with so connections clean up.",
  "Stream large maps in with `StreamingEnabled` for big worlds — your low-end players will love you.",
  "Profile before you optimize. The MicroProfiler is your friend.",
];

const EIGHT_BALL = [
  "It is certain.",
  "Without a doubt.",
  "Yes — definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

const DAILY_REWARDS = [
  "🎁 You got a free **code review tip** — comment your trickiest function and tag a staff member!",
  "🎁 You got a **5% off** voucher on your next commission — DM staff with code `SNUGSAVE5`.",
  "🎁 You got a **scripting snippet** — try `s!snippet` for inspiration.",
  "🎁 You got **priority queue** — your next ticket gets a faster first response.",
  "🎁 You got a **shoutout** — drop a screenshot in chat, we'll vibe with it.",
  "🎁 You got **double XP** on community engagement today (good vibes only).",
];

async function handleReview(message, args) {
  const cd = checkCooldown("review", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}review\` again in ${cd}s.`);

  const raw = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) {
    return respond(
      message,
      `Usage: \`${PREFIX}review <rating 1-5> <commission type> | <your message>\`\n` +
        `Example: \`${PREFIX}review 5 UI scripting | Snuggles delivered fast and clean code.\``,
    );
  }
  const left = raw.slice(0, pipe).trim().split(/\s+/);
  const reviewMessage = raw.slice(pipe + 1).trim();
  const rating = parseInt(left[0], 10);
  const commissionType = left.slice(1).join(" ").trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return respond(message, "Rating must be a number between 1 and 5.");
  }
  if (!commissionType) return respond(message, "Please include a commission type.");
  if (!reviewMessage) return respond(message, "Please include a review message after the `|`.");

  const review = {
    id: data.nextReviewId++,
    userId: message.author.id,
    username: message.author.tag,
    commissionType,
    rating,
    message: reviewMessage,
    at: new Date().toISOString(),
  };
  data.reviews.push(review);
  data.stats.reviewsSubmitted = (data.stats.reviewsSubmitted || 0) + 1;
  saveData();
  console.log(`[review] #${review.id} from ${review.username} — ${rating}/5 — ${commissionType}`);

  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
  const embed = new EmbedBuilder()
    .setTitle("⭐ New Review")
    .setColor(BRAND_COLOR)
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: "From", value: `${message.author} (${message.author.tag})`, inline: true },
      { name: "Commission", value: commissionType, inline: true },
      { name: "Rating", value: `${stars} (${rating}/5)`, inline: false },
      { name: "Review", value: reviewMessage },
    )
    .setFooter({ text: `Review #${review.id} • ${BOT_NAME}` })
    .setTimestamp(new Date());

  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    try {
      const target = await message.guild.channels.fetch(settings.reviewsChannelId);
      if (target?.isTextBased()) {
        await target.send({ embeds: [embed] });
        return respond(message, `Thanks for the review! Posted in <#${settings.reviewsChannelId}>.`);
      }
    } catch (err) {
      console.error("Failed to post review to reviews channel:", err);
    }
  }
  return respond(message, { embeds: [embed] });
}

async function handleVouch(message, args) {
  const cd = checkCooldown("vouch", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}vouch\` again in ${cd}s.`);

  const text = args.join(" ").trim();
  if (!text) {
    return respond(
      message,
      `Usage: \`${PREFIX}vouch <quick positive note>\` — e.g. \`${PREFIX}vouch fast delivery, clean script!\``,
    );
  }
  const embed = new EmbedBuilder()
    .setTitle("✅ Vouch")
    .setDescription(text)
    .setColor(SUCCESS_COLOR)
    .setThumbnail(message.author.displayAvatarURL())
    .setFooter({ text: `Vouched by ${message.author.tag}` })
    .setTimestamp(new Date());

  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    try {
      const target = await message.guild.channels.fetch(settings.reviewsChannelId);
      if (target?.isTextBased()) {
        await target.send({ embeds: [embed] });
        return respond(message, `Thanks! Vouch posted in <#${settings.reviewsChannelId}>.`);
      }
    } catch (err) {
      console.error("Failed to post vouch:", err);
    }
  }
  return respond(message, { embeds: [embed] });
}

async function handlePay(message) {
  const cd = checkCooldown("pay", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}pay\` again in ${cd}s.`);

  const embed = new EmbedBuilder()
    .setTitle("💸 Payment Methods")
    .setDescription("Send payment using one of the methods below, then post a screenshot in your ticket.")
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "💵 CashApp", value: "[$siahhispaid](https://cash.app/$siahhispaid)", inline: true },
      { name: "🅿️ PayPal", value: "[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)", inline: true },
      { name: "⚠️ Important", value: "**Friends & Family only.** Goods & Services payments will be refunded and your order canceled." },
    )
    .setFooter({ text: `${BOT_NAME} • All sales final` });
  return respond(message, { embeds: [embed] });
}

async function handleQuote(message) {
  const cd = checkCooldown("quote", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}quote\` again in ${cd}s.`);
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const embed = new EmbedBuilder()
    .setTitle("💭 Motivation")
    .setDescription(`*${q}*`)
    .setColor(BRAND_COLOR);
  return respond(message, { embeds: [embed] });
}

async function handleTip(message) {
  const cd = checkCooldown("tip", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}tip\` again in ${cd}s.`);
  const t = TIPS[Math.floor(Math.random() * TIPS.length)];
  const embed = new EmbedBuilder()
    .setTitle("💡 Scripting Tip")
    .setDescription(t)
    .setColor(BRAND_COLOR)
    .setFooter({ text: `Use ${PREFIX}tip again for another one.` });
  return respond(message, { embeds: [embed] });
}

async function handleMeme(message) {
  const cd = checkCooldown("meme", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}meme\` again in ${cd}s.`);

  try {
    const res = await fetch("https://meme-api.com/gimme/wholesomememes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();
    if (m.nsfw || m.spoiler) throw new Error("filtered");
    const embed = new EmbedBuilder()
      .setTitle(m.title || "Meme")
      .setURL(m.postLink)
      .setImage(m.url)
      .setColor(BRAND_COLOR)
      .setFooter({ text: `r/${m.subreddit} • 👍 ${m.ups || 0}` });
    return respond(message, { embeds: [embed] });
  } catch (err) {
    console.error("Meme fetch failed:", err);
    return respond(message, "Couldn't grab a meme right now. Try again in a sec.");
  }
}

async function handle8Ball(message, args) {
  const cd = checkCooldown("8ball", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}8ball\` again in ${cd}s.`);

  const question = args.join(" ").trim();
  if (!question) return respond(message, `Usage: \`${PREFIX}8ball <your question>\``);
  const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
  const embed = new EmbedBuilder()
    .setTitle("🎱 Magic 8-Ball")
    .addFields(
      { name: "Question", value: question.slice(0, 1000) },
      { name: "Answer", value: answer },
    )
    .setColor(BRAND_COLOR);
  return respond(message, { embeds: [embed] });
}

async function handleRate(message, args) {
  const cd = checkCooldown("rate", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}rate\` again in ${cd}s.`);

  const thing = args.join(" ").trim();
  if (!thing) return respond(message, `Usage: \`${PREFIX}rate <thing to rate>\``);
  const score = Math.floor(Math.random() * 11); // 0-10
  const bar = "█".repeat(score) + "░".repeat(10 - score);
  const embed = new EmbedBuilder()
    .setTitle("📊 Rating")
    .setDescription(`I rate **${thing}** a **${score}/10**\n\`${bar}\``)
    .setColor(BRAND_COLOR);
  return respond(message, { embeds: [embed] });
}

async function handleDaily(message) {
  const userId = message.author.id;
  const last = data.dailyClaims[userId] || 0;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const elapsed = now - last;
  if (elapsed < DAY_MS) {
    const remaining = DAY_MS - elapsed;
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return respond(message, `You already claimed today's reward. Come back in **${h}h ${m}m**.`);
  }
  data.dailyClaims[userId] = now;
  saveData();
  const reward = DAILY_REWARDS[Math.floor(Math.random() * DAILY_REWARDS.length)];
  const embed = new EmbedBuilder()
    .setTitle("🎁 Daily Reward")
    .setDescription(reward)
    .setColor(SUCCESS_COLOR)
    .setFooter({ text: `Come back tomorrow for another!` });
  return respond(message, { embeds: [embed] });
}

async function handleStats(message) {
  const cd = checkCooldown("stats", message.author.id);
  if (cd > 0) return respond(message, `Slow down — try \`${PREFIX}stats\` again in ${cd}s.`);

  const stats = data.stats || {};
  const activeOrders = data.orders.filter((o) => o.status !== "completed").length;
  const completedOrders = data.orders.filter((o) => o.status === "completed").length;
  const totalReviews = data.reviews.length;
  const avgRating = totalReviews
    ? (data.reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(2)
    : "—";
  const totalWarns = Object.values(data.warns).reduce((s, l) => s + l.length, 0);

  const uptime = process.uptime();
  const uH = Math.floor(uptime / 3600);
  const uM = Math.floor((uptime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setTitle(`📈 ${BOT_NAME} — Stats`)
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "Orders (active / done)", value: `${activeOrders} / ${completedOrders}`, inline: true },
      { name: "Tickets (opened / closed)", value: `${stats.ticketsOpened || 0} / ${stats.ticketsClosed || 0}`, inline: true },
      { name: "Reviews", value: `${totalReviews} (avg ${avgRating}⭐)`, inline: true },
      { name: "Warnings on file", value: `${totalWarns}`, inline: true },
      { name: "Portfolio entries", value: `${data.portfolio.length}`, inline: true },
      { name: "Uptime", value: `${uH}h ${uM}m`, inline: true },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` })
    .setTimestamp(new Date());
  return respond(message, { embeds: [embed] });
}

function parseChannelId(arg) {
  if (!arg) return null;
  const m = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{15,21})$/);
  return m ? m[1] : null;
}

async function handleSetReviews(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) {
    return respond(message, "You need **Manage Server** to set the reviews channel.");
  }
  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) {
    delete settings.reviewsChannelId;
    saveData();
    return respond(message, "Reviews channel cleared.");
  }
  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, `Usage: \`${PREFIX}setreviews #channel\` (or omit to clear).`);
  settings.reviewsChannelId = channelId;
  saveData();
  return respond(message, `Reviews channel set to <#${channelId}>.`);
}

async function handleSetTranscripts(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) {
    return respond(message, "You need **Manage Server** to set the transcripts channel.");
  }
  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) {
    delete settings.transcriptsChannelId;
    saveData();
    return respond(message, "Transcripts channel cleared.");
  }
  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, `Usage: \`${PREFIX}settranscripts #channel\` (or omit to clear).`);
  settings.transcriptsChannelId = channelId;
  saveData();
  return respond(message, `Transcripts channel set to <#${channelId}>.`);
}

async function handleAddNote(message, args) {
  const channel = message.channel;
  if (!channel.name || !channel.name.startsWith("ticket-")) {
    await message.channel.send("This command only works inside a ticket channel.");
    return;
  }

  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageMessages)
  ) {
    await message.channel.send(
      "You need to be staff (Manage Messages) to add internal notes.",
    );
    return;
  }

  const text = args.join(" ").trim();
  if (!text) {
    await message.channel.send(`Usage: \`${PREFIX}addnote <text>\``);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("📝 Internal Staff Note")
    .setDescription(text)
    .setColor(NOTE_COLOR)
    .setFooter({
      text: `Note by ${message.author.tag} • Visible to staff only`,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp(new Date());

  await message.channel.send({ embeds: [embed] });
}

async function openTicketForUser(channel, member, formAnswers) {
  const guild = channel.guild;
  if (!guild || !member) {
    return { ok: false, error: "Tickets can only be created inside a server." };
  }

  const safeName =
    member.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "user";
  const channelName = `ticket-${safeName}`;

  const existing = guild.channels.cache.find(
    (c) => c.name === channelName && c.type === ChannelType.GuildText,
  );
  if (existing) {
    return {
      ok: false,
      error: `You already have an open ticket: <#${existing.id}>`,
      channel: existing,
    };
  }

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  if (client.user) {
    overwrites.push({
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  // Grant any role with ManageMessages permission (treated as staff) view access
  guild.roles.cache.forEach((role) => {
    if (
      role.permissions.has(PermissionFlagsBits.ManageMessages) &&
      !role.managed
    ) {
      overwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    }
  });

  let created;
  try {
    created = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `Support ticket for ${member.user.tag}`,
      permissionOverwrites: overwrites,
      reason: `Ticket opened by ${member.user.tag}`,
    });
  } catch (err) {
    console.error("Failed to create ticket channel:", err);
    return {
      ok: false,
      error:
        "I couldn't create your ticket. Make sure I have the **Manage Channels** permission.",
    };
  }

  data.stats.ticketsOpened = (data.stats.ticketsOpened || 0) + 1;
  saveData();
  console.log(
    `[ticket] Opened #${created.name} for ${member.user.tag} (${member.id})`,
  );

  if (formAnswers) {
    const detailsEmbed = new EmbedBuilder()
      .setTitle("🎫 New Ticket Submission")
      .setColor(BRAND_COLOR)
      .addFields(
        { name: "Username", value: formAnswers.username || "—" },
        { name: "Service Needed", value: formAnswers.service || "—" },
        { name: "Job Description", value: formAnswers.description || "—" },
        { name: "Budget", value: formAnswers.budget || "—", inline: true },
        {
          name: "Payment Method",
          value: formAnswers.payment || "—",
          inline: true,
        },
      )
      .setFooter({
        text: `Submitted by ${member.user.tag}`,
        iconURL: member.user.displayAvatarURL(),
      })
      .setTimestamp(new Date());

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),
    );

    await created.send({
      content: `<@${member.id}> — a staff member will be with you shortly.`,
      embeds: [detailsEmbed],
      components: [closeRow],
    });
  } else {
    const welcome = new EmbedBuilder()
      .setTitle("Ticket Opened")
      .setDescription(
        `Hi <@${member.id}>, a staff member will be with you shortly. Please describe your issue or what you'd like to purchase.\n\nUse \`${PREFIX}close\` to close this ticket.`,
      )
      .setColor(WARN_COLOR);

    await created.send({ content: `<@${member.id}>`, embeds: [welcome] });
  }

  return { ok: true, channel: created };
}

async function handleWarns(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) {
    await message.channel.send(
      "You need the **Timeout Members** permission to use this.",
    );
    return;
  }
  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.channel.send(`Usage: \`${PREFIX}warns <@user>\``);
    return;
  }
  const list = data.warns[userId] || [];
  const embed = new EmbedBuilder()
    .setTitle(`Warnings — ${list.length} total`)
    .setDescription(`<@${userId}>`)
    .setColor(list.length ? WARN_COLOR : SUCCESS_COLOR);
  if (!list.length) {
    embed.addFields({ name: "Clean", value: "This user has no warnings." });
  } else {
    list.slice(-10).forEach((w) => {
      const when = w.timestamp
        ? `<t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>`
        : "—";
      embed.addFields({
        name: `#${w.id} • ${when}`,
        value: `**Reason:** ${w.reason || "—"}\n**By:** ${w.moderator || "—"}`,
      });
    });
    if (list.length > 10) {
      embed.setFooter({ text: `Showing the most recent 10 of ${list.length}.` });
    }
  }
  await message.channel.send({ embeds: [embed] });
}

async function handleUnwarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) {
    await message.channel.send(
      "You need the **Timeout Members** permission to use this.",
    );
    return;
  }
  const id = Number(args[0]);
  if (!Number.isFinite(id)) {
    await message.channel.send(`Usage: \`${PREFIX}unwarn <warning_id>\``);
    return;
  }
  let removed = null;
  let removedFrom = null;
  for (const [uid, list] of Object.entries(data.warns)) {
    const idx = list.findIndex((w) => w.id === id);
    if (idx !== -1) {
      removed = list[idx];
      removedFrom = uid;
      list.splice(idx, 1);
      if (!list.length) delete data.warns[uid];
      break;
    }
  }
  if (!removed) {
    await message.channel.send(`No warning with ID **#${id}** found.`);
    return;
  }
  saveData();
  const embed = new EmbedBuilder()
    .setTitle("Warning Removed")
    .setColor(SUCCESS_COLOR)
    .addFields(
      { name: "Warning ID", value: `#${id}`, inline: true },
      { name: "User", value: `<@${removedFrom}>`, inline: true },
      { name: "Original Reason", value: removed.reason || "—" },
      { name: "Removed By", value: message.author.tag },
    )
    .setTimestamp(new Date());
  await message.channel.send({ embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handlePurge(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageMessages)) {
    await message.channel.send(
      "You need the **Manage Messages** permission to use this.",
    );
    return;
  }
  if (
    !message.guild.members.me
      .permissionsIn(message.channel)
      .has(PermissionFlagsBits.ManageMessages)
  ) {
    await message.channel.send(
      "I'm missing the **Manage Messages** permission in this channel.",
    );
    return;
  }
  const count = parseInt(args[0], 10);
  if (!Number.isFinite(count) || count < 1 || count > 100) {
    await message.channel.send(`Usage: \`${PREFIX}purge <1-100>\``);
    return;
  }
  try {
    const deleted = await message.channel.bulkDelete(count, true);
    const notice = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🧹 Channel Purged")
          .setDescription(
            `Deleted **${deleted.size}** message${deleted.size === 1 ? "" : "s"}.`,
          )
          .setColor(SUCCESS_COLOR)
          .setFooter({ text: `By ${message.author.tag}` }),
      ],
    });
    setTimeout(() => notice.delete().catch(() => {}), 5000);
    const logEmbed = new EmbedBuilder()
      .setTitle("🧹 Messages Purged")
      .setColor(WARN_COLOR)
      .addFields(
        { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
        { name: "Count", value: `${deleted.size}`, inline: true },
        { name: "Moderator", value: message.author.tag },
      )
      .setTimestamp(new Date());
    await logMod(message.guild, logEmbed);
  } catch (err) {
    console.error("Purge failed:", err);
    await message.channel.send(
      "Failed to purge. Messages older than 14 days can't be bulk deleted.",
    );
  }
}

async function handleUserInfo(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let member = null;
  let user = null;
  try {
    member = await message.guild.members.fetch(userId);
    user = member.user;
  } catch {
    try {
      user = await client.users.fetch(userId);
    } catch {
      await message.channel.send("Couldn't find that user.");
      return;
    }
  }
  const embed = new EmbedBuilder()
    .setTitle(`👤 ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "ID", value: user.id, inline: true },
      { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
      {
        name: "Account Created",
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
      },
    );
  if (member) {
    if (member.joinedTimestamp) {
      embed.addFields({
        name: "Joined Server",
        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
      });
    }
    const roles = member.roles.cache
      .filter((r) => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => `<@&${r.id}>`)
      .slice(0, 15);
    if (roles.length) {
      embed.addFields({ name: `Roles (${roles.length})`, value: roles.join(" ") });
    }
    const warnCount = (data.warns[user.id] || []).length;
    embed.addFields({ name: "Warnings", value: `${warnCount}`, inline: true });
    embed.addFields({
      name: "Blacklisted",
      value: data.blacklist.includes(user.id) ? "Yes" : "No",
      inline: true,
    });
  }
  await message.channel.send({ embeds: [embed] });
}

async function handleServerInfo(message) {
  const guild = message.guild;
  if (!guild) return;
  const owner = await guild.fetchOwner().catch(() => null);
  const channels = guild.channels.cache;
  const text = channels.filter((c) => c.type === ChannelType.GuildText).size;
  const voice = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
  const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;
  const embed = new EmbedBuilder()
    .setTitle(`🏠 ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) || null)
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "ID", value: guild.id, inline: true },
      { name: "Owner", value: owner ? owner.user.tag : "—", inline: true },
      {
        name: "Created",
        value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
      },
      { name: "Members", value: `${guild.memberCount}`, inline: true },
      { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
      { name: "Emojis", value: `${guild.emojis.cache.size}`, inline: true },
      { name: "Text Channels", value: `${text}`, inline: true },
      { name: "Voice Channels", value: `${voice}`, inline: true },
      { name: "Categories", value: `${categories}`, inline: true },
      {
        name: "Boost Tier",
        value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`,
      },
    );
  await message.channel.send({ embeds: [embed] });
}

async function handleUptime(message) {
  const ms = client.uptime || 0;
  const embed = new EmbedBuilder()
    .setTitle("⏱️ Uptime")
    .setDescription(`${BOT_NAME} has been online for **${formatDuration(ms)}**.`)
    .setColor(BRAND_COLOR)
    .setFooter({ text: `Version ${BOT_VERSION}` });
  await message.channel.send({ embeds: [embed] });
}

async function handleSay(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) {
    await message.channel.send("You need staff permissions to use this.");
    return;
  }
  const text = args.join(" ").trim();
  if (!text) {
    await message.channel.send(`Usage: \`${PREFIX}say <message>\``);
    return;
  }
  await message.channel.send({
    content: text,
    allowedMentions: { parse: ["users"] },
  });
}

async function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try {
    user = await client.users.fetch(userId);
  } catch {
    await message.channel.send("Couldn't find that user.");
    return;
  }
  const url = user.displayAvatarURL({ size: 1024, extension: "png" });
  const embed = new EmbedBuilder()
    .setTitle(`${user.tag}'s Avatar`)
    .setURL(url)
    .setImage(url)
    .setColor(BRAND_COLOR);
  await message.channel.send({ embeds: [embed] });
}

async function handleSetLog(message, args) {
  if (!isAdmin(message.member)) {
    await message.channel.send("Only administrators can change the mod log channel.");
    return;
  }
  if (!args[0]) {
    if (data.modLogChannels[message.guild.id]) {
      delete data.modLogChannels[message.guild.id];
      saveData();
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📓 Mod Log Disabled")
            .setDescription("Logging has been turned off for this server.")
            .setColor(WARN_COLOR),
        ],
      });
    } else {
      await message.channel.send(
        `Usage: \`${PREFIX}setlog #channel\` — or omit the channel to disable.`,
      );
    }
    return;
  }
  const match = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d{17,20})$/);
  if (!match) {
    await message.channel.send(`Usage: \`${PREFIX}setlog #channel\``);
    return;
  }
  const channelId = match[1];
  const channel = await message.guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    await message.channel.send("That channel doesn't exist or isn't a text channel.");
    return;
  }
  const me = message.guild.members.me;
  if (!me.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)) {
    await message.channel.send(
      `I can't send messages in <#${channelId}>. Please give me the **Send Messages** permission there.`,
    );
    return;
  }
  data.modLogChannels[message.guild.id] = channelId;
  saveData();
  const embed = new EmbedBuilder()
    .setTitle("📓 Mod Log Set")
    .setDescription(
      `All moderation actions, ticket events, member joins/leaves, and message edits/deletes will now be logged in <#${channelId}>.`,
    )
    .setColor(SUCCESS_COLOR)
    .setFooter({ text: `By ${message.author.tag}` });
  await message.channel.send({ embeds: [embed] });
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("✅ Mod Log Connected")
        .setDescription(`This channel is now receiving logs from ${BOT_NAME}.`)
        .setColor(SUCCESS_COLOR),
    ],
  });
}

async function handlePortfolio(message, args) {
  if (!data.portfolio.length) {
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📁 Snuggles McBear's Work")
          .setDescription(
            `No work has been added yet. Staff can use \`${PREFIX}addwork <url> [title]\` to start the gallery.`,
          )
          .setColor(BRAND_COLOR),
      ],
    });
    return;
  }

  const total = data.portfolio.length;
  let page = parseInt(args[0], 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > total) page = total;

  // Most-recent first
  const ordered = [...data.portfolio].reverse();
  const work = ordered[page - 1];

  const when = work.timestamp
    ? `<t:${Math.floor(new Date(work.timestamp).getTime() / 1000)}:F>`
    : "—";

  const isVideo = isVideoUrl(work.url);

  const embed = new EmbedBuilder()
    .setTitle(`🎨 Snuggles McBear's Work — ${work.title || `#${work.id}`}`)
    .setURL(work.url)
    .setColor(BRAND_COLOR)
    .addFields(
      { name: "ID", value: `#${work.id}`, inline: true },
      { name: "Type", value: isVideo ? "🎥 Video" : "🖼️ Image", inline: true },
      { name: "Added", value: when, inline: true },
    )
    .setFooter({
      text: `Snuggles McBear's Work • ${page} of ${total} • use ${PREFIX}work <page> to browse`,
    });

  if (!isVideo) {
    embed.setImage(work.url);
    await message.channel.send({ embeds: [embed] });
  } else {
    // Discord won't render videos inside an embed — send the URL as content
    // so Discord auto-embeds the native video player alongside our embed.
    embed.setDescription(`[▶️ Open video](${work.url})`);
    await message.channel.send({ content: work.url, embeds: [embed] });
  }
}

async function handleAddWork(message, args) {
  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageGuild)
  ) {
    await message.channel.send(
      "You need staff permissions (Manage Server) to add portfolio entries.",
    );
    return;
  }

  // Prefer URL from args; fall back to first image attachment
  let url = null;
  let title = "";
  if (args[0] && GENERIC_URL_RE.test(args[0])) {
    url = args[0];
    title = args.slice(1).join(" ").trim();
  } else {
    const attach = message.attachments.find(
      (a) => a.contentType?.startsWith("image/") || looksLikeImageUrl(a.url),
    );
    if (attach) {
      url = attach.url;
      title = args.join(" ").trim();
    }
  }

  if (!url) {
    await message.channel.send(
      `Usage: \`${PREFIX}addwork <url> [title]\` — or attach an image/video to your command.`,
    );
    return;
  }

  if (!looksLikeMediaUrl(url)) {
    await message.channel.send(
      "That doesn't look like a direct media link. Use a URL ending in `.png`, `.jpg`, `.gif`, `.webp`, `.mp4`, `.mov`, or a Discord/Imgur/Tenor/YouTube link.",
    );
    return;
  }

  const work = {
    id: data.nextWorkId++,
    url,
    title: title || null,
    addedBy: message.author.tag,
    addedById: message.author.id,
    timestamp: new Date().toISOString(),
  };
  data.portfolio.push(work);
  saveData();

  const embed = new EmbedBuilder()
    .setTitle(`✅ Added to Snuggles McBear's Work — #${work.id}`)
    .setDescription(
      work.title
        ? `**${work.title}**`
        : `Use \`${PREFIX}work\` to view the gallery.`,
    )
    .setColor(SUCCESS_COLOR)
    .setFooter({
      text: `Added by ${message.author.tag} • Total entries: ${data.portfolio.length}`,
    })
    .setTimestamp(new Date());

  if (!isVideoUrl(work.url)) embed.setImage(work.url);

  await message.channel.send({ embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleRemoveWork(message, args) {
  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageGuild)
  ) {
    await message.channel.send(
      "You need staff permissions (Manage Server) to remove portfolio entries.",
    );
    return;
  }
  const id = Number(args[0]);
  if (!Number.isFinite(id)) {
    await message.channel.send(`Usage: \`${PREFIX}removework <id>\``);
    return;
  }
  const idx = data.portfolio.findIndex((w) => w.id === id);
  if (idx === -1) {
    await message.channel.send(`No portfolio entry with ID **#${id}** found.`);
    return;
  }
  const removed = data.portfolio[idx];
  data.portfolio.splice(idx, 1);
  saveData();

  const embed = new EmbedBuilder()
    .setTitle(`🗑️ Removed Portfolio Entry — #${removed.id}`)
    .setDescription(removed.title || "(no title)")
    .setColor(ERROR_COLOR)
    .setFooter({ text: `Removed by ${message.author.tag}` })
    .setTimestamp(new Date());
  await message.channel.send({ embeds: [embed] });
  await logMod(message.guild, embed);
}

const commands = {
  help: handleHelp,
  info: handleInfo,
  status: handleStatus,
  ping: handlePing,
  rules: handleRules,
  prices: handlePrices,
  services: handleServices,
  queue: handleQueue,
  statusorder: handleStatusOrder,
  script: handleScript,
  snippet: handleSnippet,
  docs: handleDocs,
  debug: handleDebug,
  ticket: handleTicket,
  ticketpanel: handleTicketPanel,
  close: handleClose,
  addnote: handleAddNote,
  addorder: handleAddOrder,
  complete: handleComplete,
  announce: handleAnnounce,
  blacklist: handleBlacklist,
  ban: handleBan,
  kick: handleKick,
  mute: handleMute,
  warn: handleWarn,
  warns: handleWarns,
  unwarn: handleUnwarn,
  purge: handlePurge,
  userinfo: handleUserInfo,
  serverinfo: handleServerInfo,
  uptime: handleUptime,
  say: handleSay,
  avatar: handleAvatar,
  setlog: handleSetLog,
  portfolio: handlePortfolio,
  work: handlePortfolio,
  works: handlePortfolio,
  addwork: handleAddWork,
  removework: handleRemoveWork,
  partner: handlePartner,
  // v1.7.0 — review, payment, fun, daily, stats, settings
  review: handleReview,
  vouch: handleVouch,
  pay: handlePay,
  payment: handlePay,
  quote: handleQuote,
  tip: handleTip,
  meme: handleMeme,
  "8ball": handle8Ball,
  rate: handleRate,
  daily: handleDaily,
  stats: handleStats,
  setreviews: handleSetReviews,
  settranscripts: handleSetTranscripts,
};

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp)(?:\?|$)/i;
const VIDEO_EXT_RE = /\.(mov|mp4|webm|m4v|mkv)(?:\?|$)/i;
const GENERIC_URL_RE = /^https?:\/\/\S+$/i;
const MEDIA_HOSTS = [
  "cdn.discordapp.com",
  "media.discordapp.net",
  "i.imgur.com",
  "imgur.com",
  "media.tenor.com",
  "tenor.com",
  "youtube.com",
  "youtu.be",
];

function looksLikeMediaUrl(url) {
  if (!url) return false;
  if (IMAGE_EXT_RE.test(url) || VIDEO_EXT_RE.test(url)) return true;
  try {
    const u = new URL(url);
    return MEDIA_HOSTS.some((h) => u.hostname.endsWith(h));
  } catch {
    return false;
  }
}

function isVideoUrl(url) {
  return VIDEO_EXT_RE.test(url || "");
}

const ADMIN_BYPASS = new Set(["blacklist"]);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (alreadyHandled(message.id)) {
    console.warn(`[messageCreate] Duplicate event suppressed for message ${message.id}`);
    return;
  }

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const handler = commands[commandName];
  if (!handler) return;

  if (data.blacklist.includes(message.author.id)) {
    if (!(ADMIN_BYPASS.has(commandName) && isAdmin(message.member))) {
      try {
        await message.channel.send("You are blacklisted from using this bot.");
      } catch {}
      return;
    }
  }

  // Soft cooldown for fun/spammy commands. Staff (Manage Messages) bypass.
  if (
    !hasPerm(message.member, PermissionFlagsBits.ManageMessages) &&
    !isAdmin(message.member)
  ) {
    const wait = checkCooldown(commandName, message.author.id);
    if (wait > 0) {
      try {
        await message.channel.send(
          `⏱️ Slow down — try \`${PREFIX}${commandName}\` again in **${wait}s**.`,
        );
      } catch {}
      return;
    }
  }

  try {
    await handler(message, args);
  } catch (err) {
    console.error(`Error handling ${PREFIX}${commandName}:`, err);
    try {
      await message.channel.send("Something went wrong while running that command.");
    } catch {}
  }
});

client.on("messageDelete", async (message) => {
  try {
    if (!message.guild || message.author?.bot || message.partial) return;
    if (!message.content) return;
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Message Deleted")
      .setColor(ERROR_COLOR)
      .addFields(
        {
          name: "Author",
          value: `<@${message.author.id}> (${message.author.tag})`,
          inline: true,
        },
        { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
        {
          name: "Content",
          value: message.content.slice(0, 1024),
        },
      )
      .setTimestamp(new Date());
    await logMod(message.guild, embed);
  } catch (err) {
    console.error("messageDelete log failed:", err);
  }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
      .setTitle("✏️ Message Edited")
      .setColor(WARN_COLOR)
      .addFields(
        {
          name: "Author",
          value: `<@${newMessage.author.id}> (${newMessage.author.tag})`,
          inline: true,
        },
        { name: "Channel", value: `<#${newMessage.channel.id}>`, inline: true },
        { name: "Before", value: (oldMessage.content || "—").slice(0, 1024) },
        { name: "After", value: (newMessage.content || "—").slice(0, 1024) },
        {
          name: "Jump",
          value: `[Go to message](${newMessage.url})`,
        },
      )
      .setTimestamp(new Date());
    await logMod(newMessage.guild, embed);
  } catch (err) {
    console.error("messageUpdate log failed:", err);
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const embed = new EmbedBuilder()
      .setTitle("📥 Member Joined")
      .setColor(SUCCESS_COLOR)
      .addFields(
        { name: "User", value: `<@${member.id}> (${member.user.tag})` },
        {
          name: "Account Created",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
        },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp(new Date());
    await logMod(member.guild, embed);
  } catch (err) {
    console.error("guildMemberAdd log failed:", err);
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    const embed = new EmbedBuilder()
      .setTitle("📤 Member Left")
      .setColor(ERROR_COLOR)
      .addFields(
        { name: "User", value: `<@${member.id}> (${member.user.tag})` },
        ...(member.joinedTimestamp
          ? [
              {
                name: "Joined",
                value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
              },
            ]
          : []),
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp(new Date());
    await logMod(member.guild, embed);
  } catch (err) {
    console.error("guildMemberRemove log failed:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (data.blacklist.includes(interaction.user.id)) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: "You are blacklisted from using this bot.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === "ticket_open") {
        const modal = new ModalBuilder()
          .setCustomId("ticket_form")
          .setTitle("Open a Ticket");

        const usernameInput = new TextInputBuilder()
          .setCustomId("username")
          .setLabel("Username")
          .setPlaceholder("Your Roblox or preferred username")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);

        const serviceInput = new TextInputBuilder()
          .setCustomId("service")
          .setLabel("Service needed")
          .setPlaceholder("e.g. Custom script, full system, code review")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(200)
          .setRequired(true);

        const descInput = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description of the job")
          .setPlaceholder(
            "Describe what you need built — be as specific as you can.",
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true);

        const budgetInput = new TextInputBuilder()
          .setCustomId("budget")
          .setLabel("How much are you paying?")
          .setPlaceholder("e.g. $25 USD, 5000 Robux, $50 giftcard")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);

        const paymentInput = new TextInputBuilder()
          .setCustomId("payment")
          .setLabel("Payment method")
          .setPlaceholder("Robux, USD (PayPal/CashApp), Giftcards, etc.")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(usernameInput),
          new ActionRowBuilder().addComponents(serviceInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(budgetInput),
          new ActionRowBuilder().addComponents(paymentInput),
        );

        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === "ticket_close") {
        const channel = interaction.channel;
        if (!channel?.name?.startsWith("ticket-")) {
          await interaction.reply({
            content: "This button only works inside a ticket channel.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        const isStaff =
          isAdmin(interaction.member) ||
          hasPerm(interaction.member, PermissionFlagsBits.ManageChannels);
        const isOwner =
          channel.name ===
          `ticket-${interaction.user.username
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 20)}`;
        if (!isStaff && !isOwner) {
          await interaction.reply({
            content: "Only the ticket owner or staff can close this ticket.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await interaction.reply({
          content: "Closing this ticket in 5 seconds...",
        });
        setTimeout(() => {
          channel
            .delete(`Ticket closed by ${interaction.user.tag}`)
            .catch((err) => {
              console.error("Failed to delete ticket channel:", err);
            });
        }, 5000);
        return;
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === "ticket_form") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const formAnswers = {
        username: interaction.fields.getTextInputValue("username"),
        service: interaction.fields.getTextInputValue("service"),
        description: interaction.fields.getTextInputValue("description"),
        budget: interaction.fields.getTextInputValue("budget"),
        payment: interaction.fields.getTextInputValue("payment"),
      };

      const member =
        interaction.member ??
        (await interaction.guild?.members
          .fetch(interaction.user.id)
          .catch(() => null));

      const result = await openTicketForUser(
        interaction.channel,
        member,
        formAnswers,
      );
      if (!result.ok) {
        await interaction.editReply({ content: result.error });
        return;
      }

      await interaction.editReply({
        content: `Your ticket has been created: <#${result.channel.id}>`,
      });
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      try {
        await interaction.reply({
          content: "Something went wrong handling that.",
          flags: MessageFlags.Ephemeral,
        });
      } catch {}
    }
  }
});

client.on("error", (err) => {
  console.error("Client error:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

client.login(TOKEN);

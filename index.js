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

// ─────────────────────────────────────────────
//  Environment
// ─────────────────────────────────────────────
const TOKEN = (process.env.DISCORD_TOKEN || "").trim();
if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN environment variable. Set it in Replit Secrets and restart.");
  process.exit(1);
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const PREFIX       = "s!";
const BOT_NAME     = "Snuggles Scripting";
const BOT_VERSION  = "1.7.0";
const BOT_OWNER    = "Snuggles";
const BRAND_COLOR  = 0xff8fb1;
const SUCCESS_COLOR = 0x57f287;
const WARN_COLOR   = 0xfee75c;
const ERROR_COLOR  = 0xed4245;
const NOTE_COLOR   = 0x9b59b6;

// ─────────────────────────────────────────────
//  Static content
// ─────────────────────────────────────────────
const SERVER_RULES = [
  "**1.** Be respectful to all members. No harassment, hate speech, or personal attacks.",
  "**2.** No spam, advertising, or self-promotion without permission.",
  "**3.** Keep content safe for work. No NSFW or graphic material.",
  "**4.** Use the correct channels for the correct topics.",
  "**5.** No scams, phishing links, or sharing malicious files.",
  "**6.** Listen to staff. Their decisions are final.",
  "**7.** Follow Discord's Terms of Service and Community Guidelines.",
];

const PAYMENT_INFO = {
  title: "💳 Payment Methods & Pricing",
  description: "All accepted payment methods are listed below. Please read the refund policy before purchasing.",
  methods: [
    { name: "💵 USD",       value: "PayPal (Friends & Family) or CashApp." },
    { name: "🎮 Robux",     value: "Group payouts only. 30% tax covered by the buyer." },
    { name: "🎁 Giftcards", value: "Amazon, Roblox, Visa, or Mastercard giftcards accepted." },
  ],
  note: "⚠️ All sales are **final**. NO REFUNDS under any circumstances.",
};

const SERVICES = [
  { name: "🛠️ Roblox Scripts",   value: "Custom Lua scripts — gameplay systems, tools, weapons, vehicles, and more." },
  { name: "📋 Commissions",       value: "Full commissioned work, from small features to complete game systems. Open a ticket to discuss." },
  { name: "⚙️ Custom Systems",    value: "Inventory, shop, datastore, leaderboard, party, matchmaking, anti-exploit, and admin systems." },
  { name: "🐛 Scripting Help",    value: "Stuck on a bug or design question? Use `s!debug` to format your issue." },
  { name: "🔍 Code Reviews",      value: "Feedback on existing scripts — performance, structure, and best practices." },
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
  { title: "Wait for a child safely",       code: 'local part = workspace:WaitForChild("MyPart", 5)\nif not part then warn("MyPart never appeared") end' },
  { title: "Tween a part's position",       code: 'local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)\nlocal tween = TweenService:Create(part, info, { Position = part.Position + Vector3.new(0, 5, 0) })\ntween:Play()' },
  { title: "Loop through all players",      code: "for _, player in ipairs(game.Players:GetPlayers()) do\n    print(player.Name, player.UserId)\nend" },
  { title: "pcall for safe API calls",      code: 'local ok, result = pcall(function()\n    return HttpService:GetAsync("https://example.com/api")\nend)\nif not ok then warn("Request failed:", result) end' },
  { title: "Debounce a touch event",        code: 'local debounce = false\npart.Touched:Connect(function(hit)\n    if debounce then return end\n    debounce = true\n    print(hit.Name, "touched")\n    task.wait(1)\n    debounce = false\nend)' },
];

const DOCS = [
  { name: "📖 Roblox Creator Documentation",   value: "https://create.roblox.com/docs" },
  { name: "📚 Roblox API Reference",            value: "https://create.roblox.com/docs/reference/engine" },
  { name: "🌙 Luau Language Reference",         value: "https://luau-lang.org/" },
  { name: "💬 DevForum (Scripting Support)",    value: "https://devforum.roblox.com/c/help-and-feedback/scripting-support/55" },
  { name: "✏️ Roblox Style Guide",              value: "https://roblox.github.io/lua-style-guide/" },
];

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
  "Cache `:GetService()` calls at the top of your script — the lookup adds up in hot loops.",
  "Always parent UI to `PlayerGui` AFTER setting properties — fewer redraws.",
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
  "It is certain.", "Without a doubt.", "Yes — definitely.", "You may rely on it.",
  "As I see it, yes.", "Most likely.", "Outlook good.", "Signs point to yes.",
  "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.",
  "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.",
  "Outlook not so good.", "Very doubtful.",
];

const DAILY_REWARDS = [
  "🎁 You got a free **code review tip** — comment your trickiest function and tag a staff member!",
  "🎁 You got a **5% off** voucher on your next commission — DM staff with code `SNUGSAVE5`.",
  "🎁 You got a **scripting snippet** — try `s!snippet` for some inspiration.",
  "🎁 You got **priority queue** — your next ticket gets a faster first response.",
  "🎁 You got a **shoutout** — drop a screenshot in chat, we'll vibe with it.",
  "🎁 You got **double XP** on community engagement today (good vibes only).",
];

// ─────────────────────────────────────────────
//  Data persistence
// ─────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    nextOrderId: 1, nextWarnId: 1, nextWorkId: 1, nextReviewId: 1,
    orders: [], blacklist: [], warns: {}, modLogChannels: {},
    portfolio: [], reviews: [], dailyClaims: {}, settings: {},
    stats: { ticketsOpened: 0, ticketsClosed: 0, ordersCreated: 0, ordersCompleted: 0, reviewsSubmitted: 0 },
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultData();
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const base = defaultData();
    return {
      nextOrderId:    parsed.nextOrderId   || base.nextOrderId,
      nextWarnId:     parsed.nextWarnId    || base.nextWarnId,
      nextWorkId:     parsed.nextWorkId    || base.nextWorkId,
      nextReviewId:   parsed.nextReviewId  || base.nextReviewId,
      orders:         Array.isArray(parsed.orders)    ? parsed.orders    : [],
      blacklist:      Array.isArray(parsed.blacklist) ? parsed.blacklist : [],
      warns:          (parsed.warns     && typeof parsed.warns     === "object") ? parsed.warns     : {},
      modLogChannels: (parsed.modLogChannels && typeof parsed.modLogChannels === "object") ? parsed.modLogChannels : {},
      portfolio:      Array.isArray(parsed.portfolio) ? parsed.portfolio : [],
      reviews:        Array.isArray(parsed.reviews)   ? parsed.reviews   : [],
      dailyClaims:    (parsed.dailyClaims && typeof parsed.dailyClaims === "object") ? parsed.dailyClaims : {},
      settings:       (parsed.settings   && typeof parsed.settings   === "object") ? parsed.settings   : {},
      stats:          (parsed.stats      && typeof parsed.stats      === "object") ? { ...base.stats, ...parsed.stats } : base.stats,
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
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
  catch (err) { console.error("Failed to save data.json:", err); }
}

const data = loadData();

// ─────────────────────────────────────────────
//  Discord client
// ─────────────────────────────────────────────
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
});

// ─────────────────────────────────────────────
//  Utility helpers
// ─────────────────────────────────────────────
function isAdmin(member) {
  return !!(member?.permissions.has(PermissionFlagsBits.Administrator));
}
function hasPerm(member, flag) {
  return !!(member?.permissions.has(flag));
}
function parseUserId(token) {
  if (!token) return null;
  const m = token.match(/^(?:<@!?)?(\d{17,20})>?$/);
  return m ? m[1] : null;
}
function parseChannelId(arg) {
  if (!arg) return null;
  const m = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{15,21})$/);
  return m ? m[1] : null;
}
function findOrder(id) {
  const n = Number(id);
  return Number.isFinite(n) ? (data.orders.find(o => o.id === n) || null) : null;
}
function statusBadge(status) {
  return { pending: "🟡 Pending", in_progress: "🔵 In Progress", completed: "🟢 Completed", cancelled: "⚪ Cancelled" }[status] || status;
}

const TIME_UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
function parseDuration(str) {
  if (!str) return null;
  const m = String(str).trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d)?$/);
  if (!m) return null;
  const ms = parseInt(m[1], 10) * (TIME_UNITS[m[2] || "m"]);
  return (Number.isFinite(ms) && ms > 0) ? ms : null;
}
function formatDuration(ms) {
  const d = Math.floor(ms / TIME_UNITS.d);
  const h = Math.floor((ms % TIME_UNITS.d) / TIME_UNITS.h);
  const m = Math.floor((ms % TIME_UNITS.h) / TIME_UNITS.m);
  const s = Math.floor((ms % TIME_UNITS.m) / TIME_UNITS.s);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !d && !h) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

async function logMod(guild, embed) {
  if (!guild) return;
  const channelId = data.modLogChannels[guild.id];
  if (!channelId) return;
  try {
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send({ embeds: [embed] });
  } catch (err) { console.error("Failed to send mod log:", err); }
}

// ─────────────────────────────────────────────
//  Single-send guard
// ─────────────────────────────────────────────
const RESPONDED = new WeakSet();
async function respond(message, payload) {
  if (RESPONDED.has(message)) {
    console.warn(`[respond] Suppressed duplicate reply for message ${message.id}`);
    return null;
  }
  RESPONDED.add(message);
  try { return await message.channel.send(payload); }
  catch (err) { console.error("[respond] send failed:", err); return null; }
}

// ─────────────────────────────────────────────
//  Cooldown system
// ─────────────────────────────────────────────
const COOLDOWN_BUCKETS = new Map();
const COOLDOWNS_MS = {
  vouch: 60_000, review: 60_000, meme: 5_000, "8ball": 3_000,
  rate: 5_000, quote: 5_000, tip: 5_000, daily: 86_400_000,
  pay: 10_000, stats: 5_000,
};

// Returns remaining seconds (0 = good to go). Sets bucket on success.
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

// ─────────────────────────────────────────────
//  Per-process dedup guard
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Commands that are mod/admin only
// ─────────────────────────────────────────────
const MOD_ONLY_COMMANDS = new Set(["ban", "kick", "mute", "warn", "warns", "unwarn", "purge", "addorder", "complete", "blacklist", "setlog", "addwork", "removework", "settranscripts", "setreviews", "announce", "ticketpanel", "addnote", "say"]);

// ─────────────────────────────────────────────
//  Command list (help)
// ─────────────────────────────────────────────
const COMMAND_LIST = [
  {
    category: "📌 General",
    items: [
      { name: "s!help",        desc: "Show this command list." },
      { name: "s!info",        desc: "Bot info — name, version, owner." },
      { name: "s!status",      desc: "Check if the bot and services are online." },
      { name: "s!ping",        desc: "Replies with pong 🧸." },
      { name: "s!rules",       desc: "Posts the server rules." },
      { name: "s!prices",      desc: "Payment methods and pricing notes." },
      { name: "s!uptime",      desc: "How long the bot has been running." },
    ],
  },
  {
    category: "💼 Commissions",
    items: [
      { name: "s!services",         desc: "Everything Snuggles Scripting offers." },
      { name: "s!queue",            desc: "Active and pending commissions." },
      { name: "s!statusorder <id>", desc: "Check the status of a specific order." },
      { name: "s!ticket",           desc: "Open a private support ticket." },
      { name: "s!pay",              desc: "Show CashApp & PayPal payment details." },
    ],
  },
  {
    category: "📂 Portfolio",
    items: [
      { name: "s!work [page]", desc: "Browse previous work (one per page). Alias: s!portfolio." },
    ],
  },
  {
    category: "🔧 Scripting Utility",
    items: [
      { name: "s!script <type>", desc: "Example scripts: ui, admin, movement, remote, datastore." },
      { name: "s!snippet",       desc: "Random useful Lua/Roblox code snippet." },
      { name: "s!docs",          desc: "Scripting documentation and resources." },
      { name: "s!debug",         desc: "Template for reporting errors to staff." },
    ],
  },
  {
    category: "ℹ️ Info",
    items: [
      { name: "s!userinfo [user]", desc: "Show info about a user." },
      { name: "s!serverinfo",      desc: "Show info about this server." },
      { name: "s!avatar [user]",   desc: "Show a user's full avatar." },
      { name: "s!stats",           desc: "Bot activity stats." },
    ],
  },
  {
    category: "⭐ Reviews",
    items: [
      { name: "s!review <1-5> <type> | <message>", desc: "Submit a public review." },
      { name: "s!vouch <text>",                     desc: "Quick positive vouch." },
    ],
  },
  {
    category: "🎉 Fun",
    items: [
      { name: "s!quote",           desc: "Random motivational quote." },
      { name: "s!tip",             desc: "Random scripting / UI tip." },
      { name: "s!meme",            desc: "Random wholesome meme." },
      { name: "s!8ball <question>", desc: "Magic 8-ball answers." },
      { name: "s!rate <thing>",    desc: "I rate it 0–10." },
      { name: "s!daily",           desc: "Claim your daily reward (once per 24h)." },
    ],
  },
  {
    category: "🔨 Moderation (Staff only)",
    items: [
      { name: "s!ban <user> <reason>",           desc: "Ban a user from the server." },
      { name: "s!kick <user> [reason]",          desc: "Kick a user from the server." },
      { name: "s!mute <user> <time> [reason]",   desc: "Timeout a user (e.g. 10m, 1h, 1d)." },
      { name: "s!warn <user> <reason>",          desc: "Issue a formal warning." },
      { name: "s!warns <user>",                  desc: "View a user's warning history." },
      { name: "s!unwarn <id>",                   desc: "Remove a specific warning by ID." },
      { name: "s!purge <count>",                 desc: "Bulk delete 1–100 messages." },
    ],
  },
  {
    category: "⚙️ Admin",
    items: [
      { name: "s!addorder <@user> <details>", desc: "Add a new commission to the queue." },
      { name: "s!complete <id>",              desc: "Mark a commission as completed." },
      { name: "s!announce <message>",         desc: "Send a styled server announcement." },
      { name: "s!partner <invite> <info>",    desc: "Post a partnership announcement." },
      { name: "s!blacklist <@user>",          desc: "Toggle a user's bot access." },
      { name: "s!setlog [#channel]",          desc: "Set or disable the mod log channel." },
      { name: "s!setreviews [#channel]",      desc: "Set the reviews channel." },
      { name: "s!settranscripts [#channel]",  desc: "Set the ticket transcripts channel." },
      { name: "s!ticketpanel",                desc: "Post the ticket panel in this channel." },
      { name: "s!close",                      desc: "Close the current ticket." },
      { name: "s!addnote <text>",             desc: "Add a staff note inside a ticket." },
      { name: "s!addwork <url> [title]",      desc: "Add an entry to the portfolio gallery." },
      { name: "s!removework <id>",            desc: "Remove a portfolio entry by ID." },
      { name: "s!say <message>",              desc: "Send a message as the bot." },
    ],
  },
];

// ─────────────────────────────────────────────
//  Embed helpers
// ─────────────────────────────────────────────
function brandEmbed(title) {
  return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title);
}
function successEmbed(title) {
  return new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(title);
}
function errorEmbed(title) {
  return new EmbedBuilder().setColor(ERROR_COLOR).setTitle(title);
}
function warnEmbed(title) {
  return new EmbedBuilder().setColor(WARN_COLOR).setTitle(title);
}

// ─────────────────────────────────────────────
//  ── GENERAL COMMANDS ──
// ─────────────────────────────────────────────
async function handleHelp(message) {
  const embed = brandEmbed(`🧸 ${BOT_NAME} — Commands`)
    .setDescription(`All available commands. Prefix: \`${PREFIX}\``)
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION} • Made with 💗` });

  for (const group of COMMAND_LIST) {
    embed.addFields({
      name: group.category,
      value: group.items.map(c => `\`${c.name}\` — ${c.desc}`).join("\n"),
    });
  }
  await respond(message, { embeds: [embed] });
}

async function handleInfo(message) {
  const up = Math.floor(process.uptime());
  const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60;
  const embed = brandEmbed(`🧸 ${BOT_NAME}`)
    .addFields(
      { name: "Bot Tag",   value: client.user?.tag || "Unknown",          inline: true },
      { name: "Version",   value: BOT_VERSION,                            inline: true },
      { name: "Owner",     value: BOT_OWNER,                              inline: true },
      { name: "Library",   value: "discord.js v14",                       inline: true },
      { name: "Runtime",   value: `Node.js ${process.version}`,           inline: true },
      { name: "Servers",   value: `${client.guilds.cache.size}`,          inline: true },
      { name: "Uptime",    value: `${h}h ${m}m ${s}s`,                   inline: true },
    )
    .setFooter({ text: "Built with discord.js" });
  await respond(message, { embeds: [embed] });
}

async function handleStatus(message) {
  const wsPing = Math.max(0, Math.round(client.ws.ping));
  const sent = await message.channel.send("Checking status…");
  const apiLatency = sent.createdTimestamp - message.createdTimestamp;

  const embed = successEmbed("🟢 System Status")
    .addFields(
      { name: "Bot",               value: "🟢 Online",             inline: true },
      { name: "Gateway Ping",      value: `${wsPing} ms`,          inline: true },
      { name: "API Latency",       value: `${apiLatency} ms`,      inline: true },
      { name: "Commission System", value: `🟢 Operational — ${data.orders.length} order(s) tracked` },
      { name: "Ticket System",     value: "🟢 Operational" },
      { name: "Moderation",        value: "🟢 Operational" },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` });

  await sent.edit({ content: "", embeds: [embed] });
}

async function handlePing(message) {
  await respond(message, "pong 🧸");
}

async function handleRules(message) {
  const embed = brandEmbed("📜 Server Rules")
    .setDescription(SERVER_RULES.join("\n\n"))
    .setFooter({ text: "Please follow the rules to keep this community safe." });
  await respond(message, { embeds: [embed] });
}

async function handlePrices(message) {
  const embed = new EmbedBuilder()
    .setTitle(PAYMENT_INFO.title)
    .setDescription(PAYMENT_INFO.description)
    .setColor(SUCCESS_COLOR)
    .addFields(...PAYMENT_INFO.methods.map(m => ({ name: m.name, value: m.value })))
    .addFields({ name: "⚠️ Refund Policy", value: PAYMENT_INFO.note })
    .setFooter({ text: `Open a ticket with ${PREFIX}ticket to start a purchase.` });
  await respond(message, { embeds: [embed] });
}

async function handleServices(message) {
  const embed = brandEmbed(`🛍️ ${BOT_NAME} — Services`)
    .setDescription("Here's everything we offer. Open a ticket to get started.")
    .addFields(SERVICES)
    .setFooter({ text: `Use ${PREFIX}ticket to start a commission.` });
  await respond(message, { embeds: [embed] });
}

async function handleQueue(message) {
  const active = data.orders.filter(o => o.status === "pending" || o.status === "in_progress");
  const embed = brandEmbed("📋 Commission Queue")
    .setFooter({ text: `${active.length} active order(s)` });

  if (active.length === 0) {
    embed.setDescription(`The queue is currently empty. Use \`${PREFIX}ticket\` to request a commission.`);
  } else {
    embed.setDescription(
      active.map(o => `**#${o.id}** — ${statusBadge(o.status)}\n<@${o.userId}> — ${o.details}`).join("\n\n")
    );
  }
  await respond(message, { embeds: [embed] });
}

async function handleStatusOrder(message, args) {
  if (!args[0]) return respond(message, `Usage: \`${PREFIX}statusorder <id>\``);
  const order = findOrder(args[0]);
  if (!order) return respond(message, `❌ No order found with ID \`${args[0]}\`.`);

  const embed = brandEmbed(`📦 Order #${order.id}`)
    .addFields(
      { name: "Status",   value: statusBadge(order.status),                                                       inline: true },
      { name: "Customer", value: `<@${order.userId}>`,                                                            inline: true },
      { name: "Details",  value: order.details },
      { name: "Created",  value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:f>`,               inline: true },
      { name: "Updated",  value: `<t:${Math.floor(new Date(order.updatedAt).getTime() / 1000)}:R>`,               inline: true },
    );
  await respond(message, { embeds: [embed] });
}

async function handleUptime(message) {
  const ms = client.uptime || 0;
  const embed = brandEmbed("⏱️ Uptime")
    .setDescription(`**${BOT_NAME}** has been online for **${formatDuration(ms)}**.`)
    .setFooter({ text: `Version ${BOT_VERSION}` });
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── SCRIPTING UTILITY ──
// ─────────────────────────────────────────────
async function handleScript(message, args) {
  const type = (args[0] || "").toLowerCase();
  const available = Object.keys(SCRIPT_EXAMPLES).join(", ");

  if (!type) return respond(message, `Usage: \`${PREFIX}script <type>\` — types: \`${available}\``);
  const example = SCRIPT_EXAMPLES[type];
  if (!example) return respond(message, `❌ No example for \`${type}\`. Available: \`${available}\``);

  const embed = brandEmbed(`📜 ${example.title}`)
    .setDescription("```lua\n" + example.code + "\n```")
    .setFooter({ text: `Category: ${type}` });
  await respond(message, { embeds: [embed] });
}

async function handleSnippet(message) {
  const s = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
  const embed = brandEmbed(`💡 Snippet — ${s.title}`)
    .setDescription("```lua\n" + s.code + "\n```")
    .setFooter({ text: `Use ${PREFIX}snippet again for another one.` });
  await respond(message, { embeds: [embed] });
}

async function handleDocs(message) {
  const embed = brandEmbed("📚 Scripting Resources")
    .setDescription("Essential references for Roblox / Luau development.")
    .addFields(DOCS.map(d => ({ name: d.name, value: d.value })))
    .setFooter({ text: "Bookmark these — they'll save you hours." });
  await respond(message, { embeds: [embed] });
}

async function handleDebug(message) {
  const template =
    "```\n" +
    "What you're trying to do:\n<describe the goal>\n\n" +
    "What's happening instead:\n<describe the actual behavior>\n\n" +
    "Error message (if any):\n<paste the full error from the Output window>\n\n" +
    "Relevant code:\n<paste only the section that breaks — keep it short>\n\n" +
    "What you've tried:\n<list any fixes you already attempted>\n" +
    "```";

  const embed = warnEmbed("🐛 Need Help With an Error?")
    .setDescription(
      "Copy the template below, fill it out, and post it in the help channel or your ticket. The more specific you are, the faster we can help.\n\n" + template
    );
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── INFO ──
// ─────────────────────────────────────────────
async function handleUserInfo(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let member = null, user = null;
  try {
    member = await message.guild.members.fetch(userId);
    user = member.user;
  } catch {
    try { user = await client.users.fetch(userId); }
    catch { return respond(message, "❌ Couldn't find that user."); }
  }

  const embed = brandEmbed(`👤 ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "ID",              value: user.id,                                                        inline: true },
      { name: "Bot",             value: user.bot ? "Yes" : "No",                                        inline: true },
      { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
    );

  if (member) {
    if (member.joinedTimestamp) embed.addFields({ name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` });
    const roles = member.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`).slice(0, 15);
    if (roles.length) embed.addFields({ name: `Roles (${roles.length})`, value: roles.join(" ") });
    embed.addFields(
      { name: "Warnings",    value: `${(data.warns[user.id] || []).length}`,              inline: true },
      { name: "Blacklisted", value: data.blacklist.includes(user.id) ? "Yes" : "No",      inline: true },
    );
  }
  await respond(message, { embeds: [embed] });
}

async function handleServerInfo(message) {
  const guild = message.guild;
  if (!guild) return;
  const owner = await guild.fetchOwner().catch(() => null);
  const channels = guild.channels.cache;

  const embed = brandEmbed(`🏠 ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 256 }) || null)
    .addFields(
      { name: "ID",            value: guild.id,                                                              inline: true },
      { name: "Owner",         value: owner ? owner.user.tag : "—",                                          inline: true },
      { name: "Created",       value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` },
      { name: "Members",       value: `${guild.memberCount}`,                                                inline: true },
      { name: "Roles",         value: `${guild.roles.cache.size}`,                                           inline: true },
      { name: "Emojis",        value: `${guild.emojis.cache.size}`,                                          inline: true },
      { name: "Text",          value: `${channels.filter(c => c.type === ChannelType.GuildText).size}`,      inline: true },
      { name: "Voice",         value: `${channels.filter(c => c.type === ChannelType.GuildVoice).size}`,     inline: true },
      { name: "Categories",    value: `${channels.filter(c => c.type === ChannelType.GuildCategory).size}`,  inline: true },
      { name: "Boost Tier",    value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)` },
    );
  await respond(message, { embeds: [embed] });
}

async function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try { user = await client.users.fetch(userId); }
  catch { return respond(message, "❌ Couldn't find that user."); }

  const url = user.displayAvatarURL({ size: 1024, extension: "png" });
  const embed = brandEmbed(`🖼️ ${user.tag}'s Avatar`)
    .setURL(url).setImage(url);
  await respond(message, { embeds: [embed] });
}

async function handleStats(message) {
  const cd = checkCooldown("stats", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const stats = data.stats || {};
  const activeOrders    = data.orders.filter(o => o.status !== "completed").length;
  const completedOrders = data.orders.filter(o => o.status === "completed").length;
  const totalReviews    = data.reviews.length;
  const avgRating       = totalReviews
    ? (data.reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(2)
    : "—";
  const totalWarns = Object.values(data.warns).reduce((s, l) => s + l.length, 0);
  const up = process.uptime();

  const embed = brandEmbed(`📈 ${BOT_NAME} — Stats`)
    .addFields(
      { name: "Orders (active / done)",   value: `${activeOrders} / ${completedOrders}`,                    inline: true },
      { name: "Tickets (opened / closed)",value: `${stats.ticketsOpened || 0} / ${stats.ticketsClosed || 0}`, inline: true },
      { name: "Reviews",                  value: `${totalReviews} (avg ${avgRating}⭐)`,                    inline: true },
      { name: "Warnings on file",         value: `${totalWarns}`,                                           inline: true },
      { name: "Portfolio entries",        value: `${data.portfolio.length}`,                                 inline: true },
      { name: "Uptime",                   value: `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`, inline: true },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── REVIEWS & PAYMENT ──
// ─────────────────────────────────────────────
async function handleReview(message, args) {
  const cd = checkCooldown("review", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const raw = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) {
    return respond(message,
      `**Usage:** \`${PREFIX}review <rating 1-5> <commission type> | <your message>\`\n` +
      `**Example:** \`${PREFIX}review 5 UI scripting | Snuggles delivered fast and clean code.\``
    );
  }

  const left = raw.slice(0, pipe).trim().split(/\s+/);
  const reviewMessage = raw.slice(pipe + 1).trim();
  const rating = parseInt(left[0], 10);
  const commissionType = left.slice(1).join(" ").trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return respond(message, "❌ Rating must be a number between 1 and 5.");
  if (!commissionType) return respond(message, "❌ Please include a commission type.");
  if (!reviewMessage)  return respond(message, "❌ Please include a review message after the `|`.");

  const review = {
    id: data.nextReviewId++,
    userId: message.author.id,
    username: message.author.tag,
    commissionType, rating,
    message: reviewMessage,
    at: new Date().toISOString(),
  };
  data.reviews.push(review);
  data.stats.reviewsSubmitted = (data.stats.reviewsSubmitted || 0) + 1;
  saveData();

  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
  const embed = brandEmbed("⭐ New Review")
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: "From",       value: `${message.author} (${message.author.tag})`, inline: true },
      { name: "Commission", value: commissionType,                               inline: true },
      { name: "Rating",     value: `${stars} (${rating}/5)` },
      { name: "Review",     value: reviewMessage },
    )
    .setFooter({ text: `Review #${review.id} • ${BOT_NAME}` })
    .setTimestamp();

  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    try {
      const target = await message.guild.channels.fetch(settings.reviewsChannelId);
      if (target?.isTextBased()) {
        await target.send({ embeds: [embed] });
        return respond(message, `✅ Thanks for the review! Posted in <#${settings.reviewsChannelId}>.`);
      }
    } catch {}
  }
  return respond(message, { embeds: [embed] });
}

async function handleVouch(message, args) {
  const cd = checkCooldown("vouch", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const text = args.join(" ").trim();
  if (!text) return respond(message, `**Usage:** \`${PREFIX}vouch <quick positive note>\``);

  const embed = successEmbed("✅ Vouch")
    .setDescription(text)
    .setThumbnail(message.author.displayAvatarURL())
    .setFooter({ text: `Vouched by ${message.author.tag}` })
    .setTimestamp();

  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    try {
      const target = await message.guild.channels.fetch(settings.reviewsChannelId);
      if (target?.isTextBased()) {
        await target.send({ embeds: [embed] });
        return respond(message, `✅ Vouch posted in <#${settings.reviewsChannelId}>.`);
      }
    } catch {}
  }
  return respond(message, { embeds: [embed] });
}

async function handlePay(message) {
  const cd = checkCooldown("pay", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const embed = brandEmbed("💸 Payment Methods")
    .setDescription("Send payment using one of the methods below, then post a screenshot inside your ticket.")
    .addFields(
      { name: "💵 CashApp",     value: "[$siahhispaid](https://cash.app/$siahhispaid)",               inline: true },
      { name: "🅿️ PayPal",     value: "[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)", inline: true },
      { name: "⚠️ Important",  value: "**Friends & Family only.** Goods & Services payments will be refunded and your order cancelled." },
    )
    .setFooter({ text: `${BOT_NAME} • All sales final` });
  return respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── FUN ──
// ─────────────────────────────────────────────
async function handleQuote(message) {
  const cd = checkCooldown("quote", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const embed = brandEmbed("💭 Motivation")
    .setDescription(`*${QUOTES[Math.floor(Math.random() * QUOTES.length)]}*`);
  return respond(message, { embeds: [embed] });
}

async function handleTip(message) {
  const cd = checkCooldown("tip", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const embed = brandEmbed("💡 Scripting Tip")
    .setDescription(TIPS[Math.floor(Math.random() * TIPS.length)])
    .setFooter({ text: `Use ${PREFIX}tip again for another one.` });
  return respond(message, { embeds: [embed] });
}

async function handleMeme(message) {
  const cd = checkCooldown("meme", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  try {
    const res = await fetch("https://meme-api.com/gimme/wholesomememes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();
    if (m.nsfw || m.spoiler) throw new Error("filtered");
    const embed = brandEmbed(m.title || "Meme")
      .setURL(m.postLink).setImage(m.url)
      .setFooter({ text: `r/${m.subreddit} • 👍 ${m.ups || 0}` });
    return respond(message, { embeds: [embed] });
  } catch {
    return respond(message, "❌ Couldn't grab a meme right now. Try again in a sec.");
  }
}

async function handle8Ball(message, args) {
  const cd = checkCooldown("8ball", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const question = args.join(" ").trim();
  if (!question) return respond(message, `**Usage:** \`${PREFIX}8ball <your question>\``);

  const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
  const embed = brandEmbed("🎱 Magic 8-Ball")
    .addFields(
      { name: "Question", value: question.slice(0, 1000) },
      { name: "Answer",   value: answer },
    );
  return respond(message, { embeds: [embed] });
}

async function handleRate(message, args) {
  const cd = checkCooldown("rate", message.author.id);
  if (cd > 0) return respond(message, `⏱️ Slow down — try again in **${cd}s**.`);

  const thing = args.join(" ").trim();
  if (!thing) return respond(message, `**Usage:** \`${PREFIX}rate <thing to rate>\``);

  const score = Math.floor(Math.random() * 11);
  const bar   = "█".repeat(score) + "░".repeat(10 - score);
  const embed = brandEmbed("📊 Rating")
    .setDescription(`I rate **${thing}** a **${score}/10**\n\`${bar}\``);
  return respond(message, { embeds: [embed] });
}

async function handleDaily(message) {
  const userId = message.author.id;
  const last   = data.dailyClaims[userId] || 0;
  const now    = Date.now();
  const DAY_MS = 86_400_000;
  const elapsed = now - last;

  if (elapsed < DAY_MS) {
    const remaining = DAY_MS - elapsed;
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    return respond(message, `⏱️ You already claimed today's reward. Come back in **${h}h ${m}m**.`);
  }

  data.dailyClaims[userId] = now;
  saveData();

  const reward = DAILY_REWARDS[Math.floor(Math.random() * DAILY_REWARDS.length)];
  const embed = successEmbed("🎁 Daily Reward")
    .setDescription(reward)
    .setFooter({ text: "Come back tomorrow for another!" });
  return respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── TICKETS ──
// ─────────────────────────────────────────────
async function handleTicket(message) {
  await openTicketForUser(message.channel, message.member, null);
}

async function handleTicketPanel(message) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageChannels)) {
    return respond(message, "❌ You need the **Manage Channels** permission to post the ticket panel.");
  }

  const embed = brandEmbed(`🧸 ${BOT_NAME} — Open a Ticket`)
    .setDescription(
      "Need a commission, scripting help, or want to talk to staff?\n\n" +
      "Click **Open Ticket** below and fill out a quick form. A private channel will be created for just you and staff."
    )
    .setFooter({ text: `${BOT_NAME} • Ticket System` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_open")
      .setLabel("Open Ticket")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🧸"),
  );
  await respond(message, { embeds: [embed], components: [row] });
}

async function buildTranscript(channel) {
  const all = [];
  let lastId;
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
    "", "────────────────────────────────────────", "",
  ];
  for (const m of all) {
    const ts = new Date(m.createdTimestamp).toISOString();
    const author = `${m.author.tag} (${m.author.id})`;
    let body = m.content || "";
    if (m.embeds?.length)       for (const e of m.embeds)          body += `\n  [Embed] ${e.title || ""}${e.description ? " — " + e.description.replace(/\n/g, " ") : ""}`;
    if (m.attachments?.size)    for (const a of m.attachments.values()) body += `\n  [Attachment] ${a.url}`;
    lines.push(`[${ts}] ${author}: ${body || "(no content)"}\n`);
  }
  return lines.join("\n");
}

async function handleClose(message) {
  if (!message.channel.name?.startsWith("ticket-")) {
    return respond(message, "❌ This command only works inside a ticket channel.");
  }

  await message.channel.send("Generating transcript…");

  let transcript = "";
  try   { transcript = await buildTranscript(message.channel); }
  catch (err) { transcript = `Transcript generation failed: ${err.message}\nClosed by ${message.author.tag} at ${new Date().toISOString()}`; }

  const settings = getGuildSettings(message.guild.id);
  const targetChannelId = settings.transcriptsChannelId || data.modLogChannels[message.guild.id];

  if (targetChannelId) {
    try {
      const target = await message.guild.channels.fetch(targetChannelId);
      if (target?.isTextBased()) {
        const embed = brandEmbed("🎟️ Ticket Closed")
          .addFields(
            { name: "Channel",   value: `#${message.channel.name}` },
            { name: "Closed by", value: message.author.tag },
          )
          .setTimestamp();
        await target.send({
          embeds: [embed],
          files: [{ attachment: Buffer.from(transcript, "utf8"), name: `${message.channel.name}-transcript.txt` }],
        });
      }
    } catch (err) { console.error("Failed to send transcript:", err); }
  }

  data.stats.ticketsClosed = (data.stats.ticketsClosed || 0) + 1;
  saveData();

  await message.channel.send("🔒 Closing this ticket in 5 seconds…");
  setTimeout(() => message.channel.delete(`Ticket closed by ${message.author.tag}`).catch(console.error), 5000);
}

async function handleAddNote(message, args) {
  if (!message.channel.name?.startsWith("ticket-")) {
    return respond(message, "❌ This command only works inside a ticket channel.");
  }
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) {
    return respond(message, "❌ You need to be staff (Manage Messages) to add notes.");
  }

  const text = args.join(" ").trim();
  if (!text) return respond(message, `**Usage:** \`${PREFIX}addnote <text>\``);

  const embed = new EmbedBuilder()
    .setTitle("📝 Internal Staff Note")
    .setDescription(text)
    .setColor(NOTE_COLOR)
    .setFooter({ text: `Note by ${message.author.tag} • Visible to staff only`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function openTicketForUser(channel, member, formAnswers) {
  const guild = channel.guild;
  if (!guild || !member) return { ok: false, error: "Tickets can only be created inside a server." };

  const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";
  const channelName = `ticket-${safeName}`;

  const existing = guild.channels.cache.find(c => c.name === channelName && c.type === ChannelType.GuildText);
  if (existing) return { ok: false, error: `You already have an open ticket: <#${existing.id}>`, channel: existing };

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (client.user) overwrites.push({ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] });
  guild.roles.cache.forEach(role => {
    if (role.permissions.has(PermissionFlagsBits.ManageMessages) && !role.managed) {
      overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });
    }
  });

  let created;
  try {
    created = await guild.channels.create({
      name: channelName, type: ChannelType.GuildText,
      topic: `Support ticket for ${member.user.tag}`,
      permissionOverwrites: overwrites,
      reason: `Ticket opened by ${member.user.tag}`,
    });
  } catch (err) {
    console.error("Failed to create ticket channel:", err);
    return { ok: false, error: "I couldn't create your ticket. Make sure I have the **Manage Channels** permission." };
  }

  data.stats.ticketsOpened = (data.stats.ticketsOpened || 0) + 1;
  saveData();

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_close").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
  );

  if (formAnswers) {
    const detailsEmbed = brandEmbed("🎫 New Ticket Submission")
      .addFields(
        { name: "Username",       value: formAnswers.username    || "—" },
        { name: "Service Needed", value: formAnswers.service     || "—" },
        { name: "Description",    value: formAnswers.description || "—" },
        { name: "Budget",         value: formAnswers.budget      || "—", inline: true },
        { name: "Payment",        value: formAnswers.payment     || "—", inline: true },
      )
      .setFooter({ text: `Submitted by ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
      .setTimestamp();

    await created.send({ content: `<@${member.id}> — a staff member will be with you shortly.`, embeds: [detailsEmbed], components: [closeRow] });
  } else {
    const welcome = warnEmbed("🎟️ Ticket Opened")
      .setDescription(`Hi <@${member.id}>, a staff member will be with you shortly.\nPlease describe your issue or commission request.\n\nUse \`${PREFIX}close\` to close this ticket.`);
    await created.send({ content: `<@${member.id}>`, embeds: [welcome], components: [closeRow] });
  }

  return { ok: true, channel: created };
}

// ─────────────────────────────────────────────
//  ── PORTFOLIO ──
// ─────────────────────────────────────────────
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp)(?:\?|$)/i;
const VIDEO_EXT_RE = /\.(mov|mp4|webm|m4v|mkv)(?:\?|$)/i;
const GENERIC_URL_RE = /^https?:\/\/\S+$/i;
const MEDIA_HOSTS = ["cdn.discordapp.com","media.discordapp.net","i.imgur.com","imgur.com","media.tenor.com","tenor.com","youtube.com","youtu.be"];

function looksLikeMediaUrl(url) {
  if (!url) return false;
  if (IMAGE_EXT_RE.test(url) || VIDEO_EXT_RE.test(url)) return true;
  try { const u = new URL(url); return MEDIA_HOSTS.some(h => u.hostname.endsWith(h)); } catch { return false; }
}
function isVideoUrl(url) { return VIDEO_EXT_RE.test(url || ""); }

async function handlePortfolio(message, args) {
  if (!data.portfolio.length) {
    return respond(message, {
      embeds: [brandEmbed("🎨 Portfolio — Snuggles Scripting")
        .setDescription(`No work has been added yet. Staff can use \`${PREFIX}addwork <url> [title]\` to start the gallery.`)],
    });
  }

  const total = data.portfolio.length;
  let page = parseInt(args[0], 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > total) page = total;

  const work = [...data.portfolio].reverse()[page - 1];
  const when = work.timestamp ? `<t:${Math.floor(new Date(work.timestamp).getTime() / 1000)}:F>` : "—";
  const isVid = isVideoUrl(work.url);

  const embed = brandEmbed(`🎨 Portfolio — ${work.title || `Entry #${work.id}`}`)
    .setURL(work.url)
    .addFields(
      { name: "ID",    value: `#${work.id}`,                          inline: true },
      { name: "Type",  value: isVid ? "🎥 Video" : "🖼️ Image",       inline: true },
      { name: "Added", value: when,                                   inline: true },
    )
    .setFooter({ text: `Page ${page} of ${total} • Use ${PREFIX}work <page> to browse` });

  if (!isVid) {
    embed.setImage(work.url);
    await respond(message, { embeds: [embed] });
  } else {
    embed.setDescription(`[▶️ Open video](${work.url})`);
    await respond(message, { content: work.url, embeds: [embed] });
  }
}

async function handleAddWork(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) {
    return respond(message, "❌ You need **Manage Server** to add portfolio entries.");
  }

  let url = null, title = "";
  if (args[0] && GENERIC_URL_RE.test(args[0])) {
    url = args[0]; title = args.slice(1).join(" ").trim();
  } else {
    const attach = message.attachments.find(a => a.contentType?.startsWith("image/") || IMAGE_EXT_RE.test(a.url));
    if (attach) { url = attach.url; title = args.join(" ").trim(); }
  }

  if (!url) return respond(message, `**Usage:** \`${PREFIX}addwork <url> [title]\` — or attach an image/video.`);
  if (!looksLikeMediaUrl(url)) return respond(message, "❌ That doesn't look like a direct media link.");

  const work = { id: data.nextWorkId++, url, title: title || null, addedBy: message.author.tag, addedById: message.author.id, timestamp: new Date().toISOString() };
  data.portfolio.push(work);
  saveData();

  const embed = successEmbed(`✅ Added to Portfolio — #${work.id}`)
    .setDescription(work.title || `Use \`${PREFIX}work\` to view the gallery.`)
    .setFooter({ text: `Added by ${message.author.tag} • Total: ${data.portfolio.length}` })
    .setTimestamp();
  if (!isVideoUrl(work.url)) embed.setImage(work.url);

  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleRemoveWork(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) {
    return respond(message, "❌ You need **Manage Server** to remove portfolio entries.");
  }

  const id = Number(args[0]);
  if (!Number.isFinite(id)) return respond(message, `**Usage:** \`${PREFIX}removework <id>\``);

  const idx = data.portfolio.findIndex(w => w.id === id);
  if (idx === -1) return respond(message, `❌ No portfolio entry with ID **#${id}** found.`);

  const removed = data.portfolio.splice(idx, 1)[0];
  saveData();

  const embed = errorEmbed(`🗑️ Removed Portfolio Entry — #${removed.id}`)
    .setDescription(removed.title || "(no title)")
    .setFooter({ text: `Removed by ${message.author.tag}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

// ─────────────────────────────────────────────
//  ── MODERATION (staff only) ──
// ─────────────────────────────────────────────
async function handleBan(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.BanMembers))
    return respond(message, "❌ You need the **Ban Members** permission.");
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
    return respond(message, "❌ I'm missing the **Ban Members** permission.");

  const userId = parseUserId(args[0]);
  if (!userId)                       return respond(message, `**Usage:** \`${PREFIX}ban <@user> <reason>\``);
  if (userId === message.author.id)  return respond(message, "❌ You can't ban yourself.");
  if (userId === client.user.id)     return respond(message, "❌ I can't ban myself.");

  const reason = args.slice(1).join(" ").trim() || "No reason provided";
  try { await message.guild.bans.create(userId, { reason: `By ${message.author.tag}: ${reason}` }); }
  catch (err) { console.error("Ban failed:", err); return respond(message, "❌ Failed to ban that user. Check my role hierarchy."); }

  const embed = errorEmbed("🔨 User Banned")
    .addFields(
      { name: "User",      value: `<@${userId}> (${userId})` },
      { name: "Reason",    value: reason },
      { name: "Moderator", value: message.author.tag },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleKick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.KickMembers))
    return respond(message, "❌ You need the **Kick Members** permission.");
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers))
    return respond(message, "❌ I'm missing the **Kick Members** permission.");

  const userId = parseUserId(args[0]);
  if (!userId)                       return respond(message, `**Usage:** \`${PREFIX}kick <@user> [reason]\``);
  if (userId === message.author.id)  return respond(message, "❌ You can't kick yourself.");
  if (userId === client.user.id)     return respond(message, "❌ I can't kick myself.");

  const reason = args.slice(1).join(" ").trim() || "No reason provided";
  let target;
  try   { target = await message.guild.members.fetch(userId); }
  catch { return respond(message, "❌ That user isn't in this server."); }
  if (!target.kickable) return respond(message, "❌ I can't kick that user (role hierarchy).");

  try { await target.kick(`By ${message.author.tag}: ${reason}`); }
  catch (err) { console.error("Kick failed:", err); return respond(message, "❌ Failed to kick that user."); }

  const embed = warnEmbed("👢 User Kicked")
    .addFields(
      { name: "User",      value: `<@${userId}> (${userId})` },
      { name: "Reason",    value: reason },
      { name: "Moderator", value: message.author.tag },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleMute(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers))
    return respond(message, "❌ You need the **Timeout Members** permission.");
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
    return respond(message, "❌ I'm missing the **Timeout Members** permission.");

  const userId = parseUserId(args[0]);
  if (!userId || !args[1]) return respond(message, `**Usage:** \`${PREFIX}mute <@user> <time> [reason]\` — e.g. \`10m\`, \`1h\`, \`1d\``);
  if (userId === message.author.id) return respond(message, "❌ You can't mute yourself.");
  if (userId === client.user.id)    return respond(message, "❌ I can't mute myself.");

  const ms = parseDuration(args[1]);
  if (!ms) return respond(message, "❌ Invalid duration. Use formats like `30s`, `10m`, `2h`, `1d`.");
  if (ms > 28 * TIME_UNITS.d) return respond(message, "❌ Maximum mute duration is 28 days.");

  const reason = args.slice(2).join(" ").trim() || "No reason provided";
  let target;
  try   { target = await message.guild.members.fetch(userId); }
  catch { return respond(message, "❌ That user isn't in this server."); }
  if (!target.moderatable) return respond(message, "❌ I can't mute that user (role hierarchy).");

  try { await target.timeout(ms, `By ${message.author.tag}: ${reason}`); }
  catch (err) { console.error("Mute failed:", err); return respond(message, "❌ Failed to mute that user."); }

  const embed = warnEmbed("🔇 User Muted")
    .addFields(
      { name: "User",      value: `<@${userId}> (${userId})` },
      { name: "Duration",  value: formatDuration(ms),         inline: true },
      { name: "Reason",    value: reason,                     inline: true },
      { name: "Moderator", value: message.author.tag },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleWarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers))
    return respond(message, "❌ You need the **Timeout Members** permission to issue warnings.");

  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, `**Usage:** \`${PREFIX}warn <@user> <reason>\``);
  const reason = args.slice(1).join(" ").trim();
  if (!reason) return respond(message, "❌ Please include a reason for the warning.");

  const warn = { id: data.nextWarnId++, reason, moderatorId: message.author.id, at: new Date().toISOString() };
  if (!data.warns[userId]) data.warns[userId] = [];
  data.warns[userId].push(warn);
  saveData();

  const total = data.warns[userId].length;
  const embed = warnEmbed("⚠️ User Warned")
    .addFields(
      { name: "User",            value: `<@${userId}>`,       inline: true },
      { name: "Warning ID",      value: `#${warn.id}`,        inline: true },
      { name: "Total Warnings",  value: `${total}`,           inline: true },
      { name: "Reason",          value: reason },
      { name: "Moderator",       value: message.author.tag },
    )
    .setTimestamp();

  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);

  try {
    const target = await client.users.fetch(userId);
    await target.send({
      embeds: [warnEmbed(`⚠️ You were warned in ${message.guild.name}`)
        .addFields(
          { name: "Reason",         value: reason },
          { name: "Total Warnings", value: `${total}` },
        )
        .setTimestamp()],
    });
  } catch { /* DMs closed */ }
}

async function handleWarns(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers))
    return respond(message, "❌ You need the **Timeout Members** permission.");

  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, `**Usage:** \`${PREFIX}warns <@user>\``);

  const list = data.warns[userId] || [];
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnings — ${list.length} total`)
    .setDescription(`<@${userId}>`)
    .setColor(list.length ? WARN_COLOR : SUCCESS_COLOR);

  if (!list.length) {
    embed.addFields({ name: "✅ Clean", value: "This user has no warnings." });
  } else {
    list.slice(-10).forEach(w => {
      const when = w.at ? `<t:${Math.floor(new Date(w.at).getTime() / 1000)}:R>` : "—";
      embed.addFields({ name: `#${w.id} • ${when}`, value: `**Reason:** ${w.reason || "—"}\n**By:** <@${w.moderatorId || "—"}>` });
    });
    if (list.length > 10) embed.setFooter({ text: `Showing the most recent 10 of ${list.length}.` });
  }
  await respond(message, { embeds: [embed] });
}

async function handleUnwarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers))
    return respond(message, "❌ You need the **Timeout Members** permission.");

  const id = Number(args[0]);
  if (!Number.isFinite(id)) return respond(message, `**Usage:** \`${PREFIX}unwarn <warning_id>\``);

  let removed = null, removedFrom = null;
  for (const [uid, list] of Object.entries(data.warns)) {
    const idx = list.findIndex(w => w.id === id);
    if (idx !== -1) {
      removed = list[idx]; removedFrom = uid;
      list.splice(idx, 1);
      if (!list.length) delete data.warns[uid];
      break;
    }
  }
  if (!removed) return respond(message, `❌ No warning with ID **#${id}** found.`);
  saveData();

  const embed = successEmbed("✅ Warning Removed")
    .addFields(
      { name: "Warning ID",     value: `#${id}`,              inline: true },
      { name: "User",           value: `<@${removedFrom}>`,   inline: true },
      { name: "Original Reason",value: removed.reason || "—" },
      { name: "Removed By",     value: message.author.tag },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handlePurge(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, "❌ You need the **Manage Messages** permission.");
  if (!message.guild.members.me.permissionsIn(message.channel).has(PermissionFlagsBits.ManageMessages))
    return respond(message, "❌ I'm missing **Manage Messages** in this channel.");

  const count = parseInt(args[0], 10);
  if (!Number.isFinite(count) || count < 1 || count > 100)
    return respond(message, `**Usage:** \`${PREFIX}purge <1-100>\``);

  try {
    const deleted = await message.channel.bulkDelete(count, true);
    const notice = await message.channel.send({
      embeds: [successEmbed("🧹 Channel Purged")
        .setDescription(`Deleted **${deleted.size}** message(s).`)
        .setFooter({ text: `By ${message.author.tag}` })],
    });
    setTimeout(() => notice.delete().catch(() => {}), 5000);

    await logMod(message.guild, warnEmbed("🧹 Messages Purged")
      .addFields(
        { name: "Channel",   value: `<#${message.channel.id}>`, inline: true },
        { name: "Count",     value: `${deleted.size}`,          inline: true },
        { name: "Moderator", value: message.author.tag },
      )
      .setTimestamp());
  } catch (err) {
    console.error("Purge failed:", err);
    await respond(message, "❌ Failed to purge. Messages older than 14 days can't be bulk-deleted.");
  }
}

// ─────────────────────────────────────────────
//  ── ADMIN COMMANDS ──
// ─────────────────────────────────────────────
async function handleAddOrder(message, args) {
  if (!isAdmin(message.member)) return respond(message, "❌ This command is admin only.");
  if (args.length < 2) return respond(message, `**Usage:** \`${PREFIX}addorder <@user> <details>\``);

  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, "❌ First argument must be a user mention or user ID.");
  const details = args.slice(1).join(" ").trim();
  if (!details) return respond(message, "❌ Please include order details after the user.");

  const now = new Date().toISOString();
  const order = { id: data.nextOrderId++, userId, details, status: "pending", createdAt: now, updatedAt: now, createdBy: message.author.id };
  data.orders.push(order);
  data.stats.ordersCreated = (data.stats.ordersCreated || 0) + 1;
  saveData();

  const embed = successEmbed(`✅ Order #${order.id} Created`)
    .addFields(
      { name: "Customer", value: `<@${order.userId}>`,       inline: true },
      { name: "Status",   value: statusBadge(order.status),  inline: true },
      { name: "Details",  value: order.details },
    )
    .setFooter({ text: `Added by ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
}

async function handleComplete(message, args) {
  if (!isAdmin(message.member)) return respond(message, "❌ This command is admin only.");
  if (!args[0]) return respond(message, `**Usage:** \`${PREFIX}complete <id>\``);

  const order = findOrder(args[0]);
  if (!order) return respond(message, `❌ No order found with ID \`${args[0]}\`.`);
  if (order.status === "completed") return respond(message, `❌ Order #${order.id} is already completed.`);

  order.status = "completed";
  order.updatedAt = new Date().toISOString();
  data.stats.ordersCompleted = (data.stats.ordersCompleted || 0) + 1;
  saveData();

  const embed = successEmbed(`✅ Order #${order.id} Completed`)
    .addFields(
      { name: "Customer", value: `<@${order.userId}>` },
      { name: "Details",  value: order.details },
    )
    .setFooter({ text: `Marked complete by ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
}

async function handleAnnounce(message, args) {
  if (!isAdmin(message.member)) return respond(message, "❌ This command is admin only.");
  const text = args.join(" ").trim();
  if (!text) return respond(message, `**Usage:** \`${PREFIX}announce <message>\``);

  const embed = brandEmbed("📣 Announcement")
    .setDescription(text)
    .setFooter({ text: `Posted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.channel.send({ content: "@everyone", embeds: [embed], allowedMentions: { parse: ["everyone"] } });
}

async function handlePartner(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) {
    return respond(message, "❌ You need the **Manage Server** permission to post partnerships.");
  }
  if (args.length < 2) {
    return respond(message,
      `**Usage:** \`${PREFIX}partner <invite> <server description>\`\n` +
      `**Example:** \`${PREFIX}partner https://discord.gg/abc A chill art community with daily events!\``
    );
  }

  const invite = args[0];
  const info   = args.slice(1).join(" ").trim();

  if (!/^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\//i.test(invite)) {
    return respond(message, "❌ Please provide a valid Discord invite link (e.g. `https://discord.gg/abcd`).");
  }

  const embed = brandEmbed("🤝 New Partnership!")
    .setDescription(
      `We're excited to partner with a new community! Check them out below.\n\u200b`
    )
    .addFields(
      { name: "📋 About the Server",  value: info },
      { name: "🔗 Join the Server",   value: invite },
    )
    .setFooter({ text: `Partnership posted by ${message.author.tag} • ${BOT_NAME}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  await message.channel.send({ content: "@here — New partnership!", embeds: [embed], allowedMentions: { parse: ["everyone"] } });
}

async function handleBlacklist(message, args) {
  if (!isAdmin(message.member)) return respond(message, "❌ This command is admin only.");
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, `**Usage:** \`${PREFIX}blacklist <@user>\``);

  const idx = data.blacklist.indexOf(userId);
  let action;
  if (idx === -1) { data.blacklist.push(userId); action = "added to"; }
  else            { data.blacklist.splice(idx, 1); action = "removed from"; }
  saveData();

  const embed = new EmbedBuilder()
    .setTitle("🚫 Blacklist Updated")
    .setDescription(`<@${userId}> has been **${action}** the blacklist.`)
    .setColor(idx === -1 ? ERROR_COLOR : SUCCESS_COLOR)
    .setFooter({ text: `By ${message.author.tag}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleSetLog(message, args) {
  if (!isAdmin(message.member)) return respond(message, "❌ Only administrators can change the mod log channel.");

  if (!args[0]) {
    if (data.modLogChannels[message.guild.id]) {
      delete data.modLogChannels[message.guild.id];
      saveData();
      return respond(message, { embeds: [warnEmbed("📓 Mod Log Disabled").setDescription("Logging has been turned off for this server.")] });
    }
    return respond(message, `**Usage:** \`${PREFIX}setlog #channel\` — omit to disable.`);
  }

  const m = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d{17,20})$/);
  if (!m) return respond(message, `**Usage:** \`${PREFIX}setlog #channel\``);

  const channelId = m[1];
  const ch = await message.guild.channels.fetch(channelId).catch(() => null);
  if (!ch?.isTextBased()) return respond(message, "❌ That channel doesn't exist or isn't a text channel.");
  if (!message.guild.members.me.permissionsIn(ch).has(PermissionFlagsBits.SendMessages))
    return respond(message, `❌ I can't send messages in <#${channelId}>. Please give me **Send Messages** there.`);

  data.modLogChannels[message.guild.id] = channelId;
  saveData();

  const embed = successEmbed("📓 Mod Log Set")
    .setDescription(`Moderation events will now be logged in <#${channelId}>.`)
    .setFooter({ text: `By ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
  await ch.send({ embeds: [successEmbed("✅ Mod Log Connected").setDescription(`This channel is now receiving logs from **${BOT_NAME}**.`)] });
}

async function handleSetReviews(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, "❌ You need **Manage Server** to set the reviews channel.");

  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) { delete settings.reviewsChannelId; saveData(); return respond(message, "✅ Reviews channel cleared."); }

  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, `**Usage:** \`${PREFIX}setreviews #channel\` (or omit to clear).`);
  settings.reviewsChannelId = channelId;
  saveData();
  return respond(message, `✅ Reviews channel set to <#${channelId}>.`);
}

async function handleSetTranscripts(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, "❌ You need **Manage Server** to set the transcripts channel.");

  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) { delete settings.transcriptsChannelId; saveData(); return respond(message, "✅ Transcripts channel cleared."); }

  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, `**Usage:** \`${PREFIX}settranscripts #channel\` (or omit to clear).`);
  settings.transcriptsChannelId = channelId;
  saveData();
  return respond(message, `✅ Transcripts channel set to <#${channelId}>.`);
}

async function handleSay(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, "❌ You need staff permissions to use this.");

  const text = args.join(" ").trim();
  if (!text) return respond(message, `**Usage:** \`${PREFIX}say <message>\``);

  await message.channel.send({ content: text, allowedMentions: { parse: ["users"] } });
}

// ─────────────────────────────────────────────
//  Command map
// ─────────────────────────────────────────────
const commands = {
  // General
  help: handleHelp, info: handleInfo, status: handleStatus, ping: handlePing,
  rules: handleRules, prices: handlePrices, uptime: handleUptime,
  // Commissions
  services: handleServices, queue: handleQueue, statusorder: handleStatusOrder,
  ticket: handleTicket, pay: handlePay, payment: handlePay,
  // Portfolio
  portfolio: handlePortfolio, work: handlePortfolio, works: handlePortfolio,
  addwork: handleAddWork, removework: handleRemoveWork,
  // Scripting
  script: handleScript, snippet: handleSnippet, docs: handleDocs, debug: handleDebug,
  // Info
  userinfo: handleUserInfo, serverinfo: handleServerInfo, avatar: handleAvatar, stats: handleStats,
  // Reviews
  review: handleReview, vouch: handleVouch,
  // Fun
  quote: handleQuote, tip: handleTip, meme: handleMeme,
  "8ball": handle8Ball, rate: handleRate, daily: handleDaily,
  // Moderation
  ban: handleBan, kick: handleKick, mute: handleMute,
  warn: handleWarn, warns: handleWarns, unwarn: handleUnwarn, purge: handlePurge,
  // Tickets
  ticketpanel: handleTicketPanel, close: handleClose, addnote: handleAddNote,
  // Admin
  addorder: handleAddOrder, complete: handleComplete, announce: handleAnnounce,
  partner: handlePartner, blacklist: handleBlacklist, setlog: handleSetLog,
  setreviews: handleSetReviews, settranscripts: handleSetTranscripts, say: handleSay,
};

// ─────────────────────────────────────────────
//  messageCreate
// ─────────────────────────────────────────────
const ADMIN_BYPASS = new Set(["blacklist"]);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (alreadyHandled(message.id)) {
    console.warn(`[messageCreate] Duplicate event suppressed for ${message.id}`);
    return;
  }

  const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const handler = commands[commandName];
  if (!handler) return;

  // Blacklist check
  if (data.blacklist.includes(message.author.id)) {
    if (!(ADMIN_BYPASS.has(commandName) && isAdmin(message.member))) {
      await message.channel.send("🚫 You are blacklisted from using this bot.").catch(() => {});
      return;
    }
  }

  // Cooldown — staff bypass
  const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
  if (!isStaff) {
    const wait = checkCooldown(commandName, message.author.id);
    if (wait > 0) {
      await message.channel.send(`⏱️ Slow down — try \`${PREFIX}${commandName}\` again in **${wait}s**.`).catch(() => {});
      return;
    }
  }

  try { await handler(message, args); }
  catch (err) {
    console.error(`Error handling ${PREFIX}${commandName}:`, err);
    await message.channel.send("❌ Something went wrong while running that command.").catch(() => {});
  }
});

// ─────────────────────────────────────────────
//  Logging events
// ─────────────────────────────────────────────
client.on("messageDelete", async (message) => {
  try {
    if (!message.guild || message.author?.bot || message.partial || !message.content) return;
    await logMod(message.guild, errorEmbed("🗑️ Message Deleted")
      .addFields(
        { name: "Author",  value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: "Channel", value: `<#${message.channel.id}>`,                        inline: true },
        { name: "Content", value: message.content.slice(0, 1024) },
      )
      .setTimestamp());
  } catch (err) { console.error("messageDelete log failed:", err); }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    await logMod(newMessage.guild, warnEmbed("✏️ Message Edited")
      .addFields(
        { name: "Author",  value: `<@${newMessage.author.id}> (${newMessage.author.tag})`, inline: true },
        { name: "Channel", value: `<#${newMessage.channel.id}>`,                           inline: true },
        { name: "Before",  value: (oldMessage.content || "—").slice(0, 1024) },
        { name: "After",   value: (newMessage.content  || "—").slice(0, 1024) },
        { name: "Jump",    value: `[Go to message](${newMessage.url})` },
      )
      .setTimestamp());
  } catch (err) { console.error("messageUpdate log failed:", err); }
});

client.on("guildMemberAdd", async (member) => {
  try {
    await logMod(member.guild, successEmbed("📥 Member Joined")
      .addFields(
        { name: "User",            value: `<@${member.id}> (${member.user.tag})` },
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp());
  } catch (err) { console.error("guildMemberAdd log failed:", err); }
});

client.on("guildMemberRemove", async (member) => {
  try {
    const embed = errorEmbed("📤 Member Left")
      .addFields({ name: "User", value: `<@${member.id}> (${member.user.tag})` })
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    if (member.joinedTimestamp) embed.addFields({ name: "Joined", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` });
    await logMod(member.guild, embed);
  } catch (err) { console.error("guildMemberRemove log failed:", err); }
});

// ─────────────────────────────────────────────
//  Interactions (ticket modal & buttons)
// ─────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    if (data.blacklist.includes(interaction.user.id)) {
      if (interaction.isRepliable()) await interaction.reply({ content: "🚫 You are blacklisted from using this bot.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.isButton()) {
      // ── Open ticket button ──
      if (interaction.customId === "ticket_open") {
        const modal = new ModalBuilder().setCustomId("ticket_form").setTitle("Open a Ticket");

        const fields = [
          new TextInputBuilder().setCustomId("username").setLabel("Username").setPlaceholder("Your Roblox or preferred username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true),
          new TextInputBuilder().setCustomId("service").setLabel("Service needed").setPlaceholder("e.g. Custom script, full system, code review").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true),
          new TextInputBuilder().setCustomId("description").setLabel("Description of the job").setPlaceholder("Describe what you need built — be as specific as you can.").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true),
          new TextInputBuilder().setCustomId("budget").setLabel("How much are you paying?").setPlaceholder("e.g. $25 USD, 5000 Robux, $50 giftcard").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true),
          new TextInputBuilder().setCustomId("payment").setLabel("Payment method").setPlaceholder("Robux, USD (PayPal/CashApp), Giftcards, etc.").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true),
        ];
        modal.addComponents(...fields.map(f => new ActionRowBuilder().addComponents(f)));
        await interaction.showModal(modal);
        return;
      }

      // ── Close ticket button ──
      if (interaction.customId === "ticket_close") {
        const channel = interaction.channel;
        if (!channel?.name?.startsWith("ticket-")) {
          return interaction.reply({ content: "❌ This button only works inside a ticket channel.", flags: MessageFlags.Ephemeral });
        }
        const isStaff = isAdmin(interaction.member) || hasPerm(interaction.member, PermissionFlagsBits.ManageChannels);
        const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
        const isOwner  = channel.name === `ticket-${safeName}`;
        if (!isStaff && !isOwner) {
          return interaction.reply({ content: "❌ Only the ticket owner or staff can close this ticket.", flags: MessageFlags.Ephemeral });
        }
        await interaction.reply({ content: "🔒 Closing this ticket in 5 seconds…" });
        setTimeout(() => channel.delete(`Ticket closed by ${interaction.user.tag}`).catch(console.error), 5000);
        return;
      }
    }

    // ── Ticket form modal ──
    if (interaction.isModalSubmit() && interaction.customId === "ticket_form") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const formAnswers = {
        username:    interaction.fields.getTextInputValue("username"),
        service:     interaction.fields.getTextInputValue("service"),
        description: interaction.fields.getTextInputValue("description"),
        budget:      interaction.fields.getTextInputValue("budget"),
        payment:     interaction.fields.getTextInputValue("payment"),
      };

      const member = interaction.member ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
      const result = await openTicketForUser(interaction.channel, member, formAnswers);

      if (!result.ok) return interaction.editReply({ content: result.error });
      await interaction.editReply({ content: `✅ Your ticket has been created: <#${result.channel.id}>` });
    }

  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Something went wrong handling that.", flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

// ─────────────────────────────────────────────
//  Error handlers
// ─────────────────────────────────────────────
client.on("error", err => console.error("Client error:", err));
process.on("unhandledRejection", err => console.error("Unhandled rejection:", err));

client.login(TOKEN);

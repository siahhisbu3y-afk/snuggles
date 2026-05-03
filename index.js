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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

// ─────────────────────────────────────────────
//  Environment
// ─────────────────────────────────────────────
require("dotenv").config();
const TOKEN = (process.env.DISCORD_TOKEN || "").trim();
if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN environment variable. Set it in Replit Secrets and restart.");
  process.exit(1);
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const PREFIX        = "s!";
const BOT_NAME      = "Snuggles Scripting";
const BOT_VERSION   = "3.0.0";
const BOT_OWNER     = "Snuggles";
const BRAND_COLOR   = 0xff8fb1;
const SUCCESS_COLOR = 0x57f287;
const WARN_COLOR    = 0xfee75c;
const ERROR_COLOR   = 0xed4245;
const NOTE_COLOR    = 0x9b59b6;
const INFO_COLOR    = 0x5865f2;
const GOLD_COLOR    = 0xf1c40f;
const XP_COLOR      = 0x2ecc71;

// ── Hardcoded channel IDs ──
const ERROR_CHANNEL_ID      = "1497080858048462948";
const LEVELUP_CHANNEL_ID    = "1497080845406699580";
const STICKY_CHANNEL_ID     = "1497080844416975028";
const HOME_GUILD_ID         = "1497048032661864649";

// ── Guild join/leave log channels (home guild only) ──
const GUILD_JOIN_LOG_CHANNEL  = "1497080855913300144";
const GUILD_LEAVE_LOG_CHANNEL = "1497080856941166703";

const STICKY_MESSAGE_TEXT =
  "✨ **Want to leave a review?**\n\n" +
  "Use `s!review <1-5> <type> | <your message>` to share your experience!\n" +
  "**Example:** `s!review 5 Custom Script | Fast delivery and clean code — highly recommend!`\n\n" +
  "Your feedback means the world to us 💗";

// ─────────────────────────────────────────────
//  XP / Leveling config
// ─────────────────────────────────────────────
const XP_PER_MESSAGE   = 15;
const XP_COOLDOWN_MS   = 60_000;
const XP_VARIANCE      = 10;
const BASE_XP_REQUIRED = 100;
const XP_SCALING       = 1.35;

function xpForLevel(level) {
  return Math.floor(BASE_XP_REQUIRED * Math.pow(XP_SCALING, level - 1));
}
function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

// ─────────────────────────────────────────────
//  Economy config
// ─────────────────────────────────────────────
const COINS_PER_MESSAGE   = 5;
const COINS_COOLDOWN_MS   = 30_000;
const WORK_COOLDOWN_MS    = 3_600_000;
const SHOP_ITEMS = [
  { id: "role_color",     name: "🎨 Custom Role Color",   price: 500,  desc: "Request a custom color for your role (staff applies it)." },
  { id: "code_review",    name: "🔍 Code Review Voucher", price: 300,  desc: "Get a free in-depth code review from staff." },
  { id: "priority_queue", name: "⚡ Priority Queue",      price: 750,  desc: "Your next commission gets bumped to the front." },
  { id: "custom_ping",    name: "🔔 VIP Ping",            price: 1000, desc: "Get pinged for exclusive announcements." },
  { id: "badge_og",       name: "🏅 OG Badge",            price: 2000, desc: "Exclusive OG server member badge in your profile." },
];

const WORK_RESPONSES = [
  { text: "You debugged a gnarly script for a client", coins: [80, 200] },
  { text: "You built a datastore system from scratch", coins: [100, 250] },
  { text: "You fixed a RemoteEvent security bug", coins: [60, 150] },
  { text: "You optimized a client-side UI for performance", coins: [50, 180] },
  { text: "You wrote an admin command system", coins: [120, 280] },
  { text: "You helped a beginner in the support channel", coins: [30, 80] },
  { text: "You reviewed and refactored legacy Lua code", coins: [90, 220] },
  { text: "You built a matchmaking system", coins: [150, 350] },
];

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
  { title: "Wait for a child safely",   code: 'local part = workspace:WaitForChild("MyPart", 5)\nif not part then warn("MyPart never appeared") end' },
  { title: "Tween a part's position",   code: 'local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)\nlocal tween = TweenService:Create(part, info, { Position = part.Position + Vector3.new(0, 5, 0) })\ntween:Play()' },
  { title: "Loop through all players",  code: "for _, player in ipairs(game.Players:GetPlayers()) do\n    print(player.Name, player.UserId)\nend" },
  { title: "pcall for safe API calls",  code: 'local ok, result = pcall(function()\n    return HttpService:GetAsync("https://example.com/api")\nend)\nif not ok then warn("Request failed:", result) end' },
  { title: "Debounce a touch event",    code: 'local debounce = false\npart.Touched:Connect(function(hit)\n    if debounce then return end\n    debounce = true\n    print(hit.Name, "touched")\n    task.wait(1)\n    debounce = false\nend)' },
];

const DOCS = [
  { name: "📖 Roblox Creator Documentation",  value: "https://create.roblox.com/docs" },
  { name: "📚 Roblox API Reference",           value: "https://create.roblox.com/docs/reference/engine" },
  { name: "🌙 Luau Language Reference",        value: "https://luau-lang.org/" },
  { name: "💬 DevForum (Scripting Support)",   value: "https://devforum.roblox.com/c/help-and-feedback/scripting-support/55" },
  { name: "✏️ Roblox Style Guide",             value: "https://roblox.github.io/lua-style-guide/" },
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
  { text: "🎁 You got a free **code review tip** — comment your trickiest function and tag a staff member!", coins: 50 },
  { text: "🎁 You got a **5% off** voucher on your next commission — DM staff with code `SNUGSAVE5`.", coins: 75 },
  { text: "🎁 You got a **scripting snippet** — try `s!snippet` for some inspiration.", coins: 60 },
  { text: "🎁 You got **priority queue** — your next ticket gets a faster first response.", coins: 100 },
  { text: "🎁 You got a **shoutout** — drop a screenshot in chat, we'll vibe with it.", coins: 55 },
  { text: "🎁 You got **double XP** on community engagement today (good vibes only).", coins: 80 },
];

const TRIVIA_QUESTIONS = [
  { q: "What Lua function should you use instead of `wait()` in modern Roblox?", a: ["task.wait", "task wait"], hint: "It's in the `task` library." },
  { q: "What does `pcall` stand for in Lua?", a: ["protected call", "pcall"], hint: "It prevents your script from crashing on errors." },
  { q: "What service handles player data saving in Roblox?", a: ["datastoreservice", "datastore service"], hint: "It's a `game:GetService()` call." },
  { q: "What event fires when a player joins a Roblox game?", a: ["playeradded", "players.playeradded"], hint: "It's on the `Players` service." },
  { q: "What Roblox class is used to detect collisions?", a: ["touched", "part.touched", ".touched"], hint: "It's a property/event on `BasePart`." },
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
    leveling: {},
    economy: {},
    invites: {},
    inviteCache: {},
    stickyMessages: {},
    partnerships: [],
    triviaActive: {},
    giveaways: {},
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
      warns:          isObj(parsed.warns)             ? parsed.warns     : {},
      modLogChannels: isObj(parsed.modLogChannels)    ? parsed.modLogChannels : {},
      portfolio:      Array.isArray(parsed.portfolio) ? parsed.portfolio : [],
      reviews:        Array.isArray(parsed.reviews)   ? parsed.reviews   : [],
      dailyClaims:    isObj(parsed.dailyClaims)       ? parsed.dailyClaims : {},
      settings:       isObj(parsed.settings)          ? parsed.settings  : {},
      stats:          isObj(parsed.stats)             ? { ...base.stats, ...parsed.stats } : base.stats,
      leveling:       isObj(parsed.leveling)          ? parsed.leveling  : {},
      economy:        isObj(parsed.economy)           ? parsed.economy   : {},
      invites:        isObj(parsed.invites)           ? parsed.invites   : {},
      inviteCache:    isObj(parsed.inviteCache)       ? parsed.inviteCache : {},
      stickyMessages: isObj(parsed.stickyMessages)    ? parsed.stickyMessages : {},
      partnerships:   Array.isArray(parsed.partnerships) ? parsed.partnerships : [],
      triviaActive:   isObj(parsed.triviaActive)      ? parsed.triviaActive : {},
      giveaways:      isObj(parsed.giveaways)         ? parsed.giveaways : {},
    };
  } catch (err) {
    console.error("Failed to load data.json, starting fresh:", err);
    return defaultData();
  }
}
function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }

function getGuildSettings(guildId) {
  if (!data.settings[guildId]) data.settings[guildId] = {};
  return data.settings[guildId];
}
function getEconomy(userId) {
  if (!data.economy[userId]) data.economy[userId] = { coins: 0, lastWorkAt: 0, lastCoinAt: 0, inventory: [] };
  return data.economy[userId];
}
function getLeveling(userId) {
  if (!data.leveling[userId]) data.leveling[userId] = { xp: 0, level: 1, lastXpAt: 0, totalMessages: 0 };
  return data.leveling[userId];
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
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
});

client.once("clientReady", async () => {
  console.log(`${BOT_NAME} v${BOT_VERSION} ready.`);
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s).`);
  for (const [, guild] of client.guilds.cache) {
    await cacheInvites(guild).catch(() => {});
  }
  setInterval(checkGiveaways, 10_000);
});

// ─────────────────────────────────────────────
//  Utility helpers
// ─────────────────────────────────────────────
function isAdmin(member) { return !!(member?.permissions.has(PermissionFlagsBits.Administrator)); }
function hasPerm(member, flag) { return !!(member?.permissions.has(flag)); }
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

async function sendErrorLog(err, context = "") {
  try {
    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) return;
    const ch = await guild.channels.fetch(ERROR_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setTitle("🚨 Bot Error")
      .setColor(ERROR_COLOR)
      .addFields(
        { name: "📍 Context", value: context || "Unknown" },
        { name: "❌ Error",   value: `\`\`\`${String(err?.message || err).slice(0, 900)}\`\`\`` },
        { name: "📚 Stack",   value: `\`\`\`${String(err?.stack || "No stack").slice(0, 900)}\`\`\`` },
      )
      .setTimestamp();
    await ch.send({ embeds: [embed] });
  } catch (e) { console.error("Could not send error log:", e); }
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
  vouch: 60_000, review: 60_000, meme: 8_000, "8ball": 3_000,
  rate: 5_000, quote: 5_000, tip: 5_000, daily: 86_400_000,
  pay: 10_000, stats: 8_000, snippet: 5_000, work: WORK_COOLDOWN_MS,
  trivia: 5_000, coinflip: 3_000, roll: 3_000, rps: 3_000,
  serverinfo: 5_000,
};

function checkCooldown(commandName, userId) {
  const ms = COOLDOWNS_MS[commandName];
  if (!ms) return 0;
  const key = `${commandName}:${userId}`;
  const next = COOLDOWN_BUCKETS.get(key) || 0;
  const remaining = next - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
function consumeCooldown(commandName, userId) {
  const ms = COOLDOWNS_MS[commandName];
  if (!ms) return;
  COOLDOWN_BUCKETS.set(`${commandName}:${userId}`, Date.now() + ms);
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
//  Embed helpers
// ─────────────────────────────────────────────
function brandEmbed(title)   { return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title); }
function successEmbed(title) { return new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(title); }
function errorEmbed(title)   { return new EmbedBuilder().setColor(ERROR_COLOR).setTitle(title); }
function warnEmbed(title)    { return new EmbedBuilder().setColor(WARN_COLOR).setTitle(title); }
function infoEmbed(title)    { return new EmbedBuilder().setColor(INFO_COLOR).setTitle(title); }
function goldEmbed(title)    { return new EmbedBuilder().setColor(GOLD_COLOR).setTitle(title); }

// ─────────────────────────────────────────────
//  Setup message (sent when bot joins a new guild)
// ─────────────────────────────────────────────
async function sendSetupMessage(guild) {
  const channel = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages))
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .first();
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧸 ${BOT_NAME} v${BOT_VERSION} — Setup Guide`)
    .setDescription(
      `Thanks for adding **${BOT_NAME}** to **${guild.name}**!\n\n` +
      `All commands use the \`${PREFIX}\` prefix. Here's a quick setup guide:`
    )
    .addFields(
      { name: "📓 Step 1 — Set Mod Log Channel", value: `\`${PREFIX}setlog #channel\`` },
      { name: "⭐ Step 2 — Set Reviews Channel", value: `\`${PREFIX}setreviews #channel\`` },
      { name: "🎟️ Step 3 — Set Ticket Transcripts Channel", value: `\`${PREFIX}settranscripts #channel\`` },
      { name: "🎫 Step 4 — Post Ticket Panel", value: `\`${PREFIX}ticketpanel\` — Posts a 3-button panel (Order, Partnership, General Inquiry).` },
      { name: "📋 Step 5 — Commission Queue", value: `\`${PREFIX}addorder @user <details>\`` },
      { name: "🎨 Step 6 — Portfolio", value: `\`${PREFIX}addwork <url> [title]\`` },
      { name: "📈 Leveling & Economy", value: "XP and coins are awarded automatically from chatting." },
      { name: "🤝 Partnerships", value: `\`${PREFIX}partner help\`` },
      { name: "📣 Announcements", value: `\`${PREFIX}announce [#channel] <message>\`` },
      { name: "🆘 Need Help?", value: `Use \`${PREFIX}help\` for the full command list.` },
    )
    .setFooter({ text: `${BOT_NAME} • Made with 💗 by ${BOT_OWNER}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─────────────────────────────────────────────
//  ── LEVELING SYSTEM ──
// ─────────────────────────────────────────────
async function handleXpGrant(message) {
  const userId = message.author.id;
  const now    = Date.now();
  const lv     = getLeveling(userId);

  if (now - lv.lastXpAt < XP_COOLDOWN_MS) return;
  lv.lastXpAt = now;
  lv.totalMessages = (lv.totalMessages || 0) + 1;

  const gained = XP_PER_MESSAGE + Math.floor(Math.random() * XP_VARIANCE * 2) - XP_VARIANCE;
  lv.xp += Math.max(1, gained);

  const needed = xpForLevel(lv.level);
  if (lv.xp >= needed) {
    lv.xp -= needed;
    lv.level++;
    saveData();
    try {
      const lvUpChannel = message.guild?.channels.cache.get(LEVELUP_CHANNEL_ID);
      const ch = lvUpChannel || message.channel;
      const lvEmbed = new EmbedBuilder()
        .setColor(XP_COLOR)
        .setTitle("🎉 Level Up!")
        .setDescription(`<@${userId}> just reached **Level ${lv.level}**! Keep it up 🚀`)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: `Next level needs ${xpForLevel(lv.level)} XP` })
        .setTimestamp();
      await ch.send({ content: `<@${userId}>`, embeds: [lvEmbed] });
    } catch {}
  } else {
    saveData();
  }
}

async function handleLevel(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try { user = await client.users.fetch(userId); }
  catch { return respond(message, { embeds: [errorEmbed("User Not Found").setDescription("Couldn't find that user.")] }); }

  const lv      = getLeveling(userId);
  const needed  = xpForLevel(lv.level);
  const progress = Math.min(20, Math.floor((lv.xp / needed) * 20));
  const bar = "█".repeat(progress) + "░".repeat(20 - progress);

  const embed = new EmbedBuilder()
    .setColor(XP_COLOR)
    .setTitle(`📊 Level — ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "🏆 Level",    value: `${lv.level}`,                            inline: true },
      { name: "✨ XP",       value: `${lv.xp} / ${needed}`,                  inline: true },
      { name: "💬 Messages", value: `${lv.totalMessages || 0}`,               inline: true },
      { name: "📈 Progress", value: `\`${bar}\` ${Math.floor((lv.xp / needed) * 100)}%` },
    )
    .setFooter({ text: `${BOT_NAME} Leveling System` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleLeaderboard(message) {
  const entries = Object.entries(data.leveling)
    .map(([id, d]) => ({ id, level: d.level || 1, xp: d.xp || 0 }))
    .sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp)
    .slice(0, 10);

  if (!entries.length) return respond(message, { embeds: [brandEmbed("📊 Leaderboard").setDescription("No data yet — start chatting!")] });

  const medals = ["🥇", "🥈", "🥉"];
  const lines  = await Promise.all(entries.map(async (e, i) => {
    let tag = `<@${e.id}>`;
    try { const u = await client.users.fetch(e.id); tag = u.username; } catch {}
    return `${medals[i] || `**${i + 1}.**`} ${tag} — Level **${e.level}** (${e.xp} XP)`;
  }));

  const embed = goldEmbed("🏆 Level Leaderboard")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Top 10 • ${BOT_NAME}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleRank(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try { user = await client.users.fetch(userId); }
  catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }

  const lv   = getLeveling(userId);
  const eco  = getEconomy(userId);
  const warns = (data.warns[userId] || []).length;
  const needed = xpForLevel(lv.level);

  const allUsers = Object.entries(data.leveling)
    .sort((a, b) => b[1].level !== a[1].level ? b[1].level - a[1].level : b[1].xp - a[1].xp);
  const rank = allUsers.findIndex(([id]) => id === userId) + 1;

  const embed = new EmbedBuilder()
    .setColor(XP_COLOR)
    .setTitle(`🏅 Rank Card — ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "🌍 Global Rank",   value: rank > 0 ? `#${rank}` : "Unranked",       inline: true },
      { name: "🏆 Level",         value: `${lv.level}`,                            inline: true },
      { name: "✨ XP",            value: `${lv.xp} / ${needed}`,                  inline: true },
      { name: "💰 Coins",         value: `${eco.coins || 0}`,                      inline: true },
      { name: "💬 Messages",      value: `${lv.totalMessages || 0}`,               inline: true },
      { name: "⚠️ Warnings",      value: `${warns}`,                               inline: true },
    )
    .setFooter({ text: `Total XP earned: ${totalXpForLevel(lv.level) + lv.xp}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── ECONOMY SYSTEM ──
// ─────────────────────────────────────────────
async function handleCoinGrant(message) {
  const eco = getEconomy(message.author.id);
  const now = Date.now();
  if (now - eco.lastCoinAt < COINS_COOLDOWN_MS) return;
  eco.lastCoinAt = now;
  eco.coins = (eco.coins || 0) + COINS_PER_MESSAGE;
  saveData();
}

async function handleBalance(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try { user = await client.users.fetch(userId); }
  catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }

  const eco = getEconomy(userId);
  const embed = goldEmbed(`💰 Balance — ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "💰 Coins",     value: `${eco.coins || 0} 🪙`,      inline: true },
      { name: "🎒 Inventory", value: `${(eco.inventory || []).length} item(s)`, inline: true },
    )
    .setFooter({ text: "Earn coins by chatting and using s!work" })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleWork(message) {
  const userId = message.author.id;
  const wait = checkCooldown("work", userId);
  if (wait > 0) {
    await respond(message, { embeds: [warnEmbed("⏰ Slow Down!").setDescription(`Come back in **${wait} second${wait === 1 ? "" : "s"}**.`)] });
    return;
  }
  consumeCooldown("work", userId);

  const eco = getEconomy(userId);
  const job = WORK_RESPONSES[Math.floor(Math.random() * WORK_RESPONSES.length)];
  const earned = Math.floor(Math.random() * (job.coins[1] - job.coins[0])) + job.coins[0];

  eco.coins = (eco.coins || 0) + earned;
  eco.lastWorkAt = Date.now();
  saveData();

  const embed = successEmbed("💼 Work Complete!")
    .setDescription(`> ${job.text}\n\nYou earned **${earned} 🪙 coins**!`)
    .addFields({ name: "💰 New Balance", value: `${eco.coins} 🪙` })
    .setFooter({ text: "Come back in 1 hour to work again." })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleShop(message) {
  const embed = goldEmbed("🛒 Coin Shop")
    .setDescription("Spend your coins on exclusive perks! Use `s!buy <item_id>` to purchase.")
    .addFields(
      SHOP_ITEMS.map(i => ({ name: `${i.name} — ${i.price} 🪙`, value: `${i.desc}\n\`ID: ${i.id}\`` }))
    )
    .setFooter({ text: "Earn coins by chatting and using s!work" })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleBuy(message, args) {
  const itemId = (args[0] || "").toLowerCase();
  if (!itemId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}buy <item_id>\` — use \`${PREFIX}shop\` to see item IDs.`)] });

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return respond(message, { embeds: [errorEmbed("Item Not Found").setDescription(`No item with ID \`${itemId}\`. Use \`${PREFIX}shop\` to browse.`)] });

  const eco = getEconomy(message.author.id);
  if ((eco.coins || 0) < item.price) {
    return respond(message, {
      embeds: [errorEmbed("Not Enough Coins")
        .setDescription(`You need **${item.price} 🪙** but only have **${eco.coins || 0} 🪙**.`)
        .setFooter({ text: "Earn coins by chatting or using s!work" })],
    });
  }

  if ((eco.inventory || []).includes(item.id)) {
    return respond(message, { embeds: [warnEmbed("Already Owned").setDescription(`You already own **${item.name}**.`)] });
  }

  eco.coins -= item.price;
  if (!eco.inventory) eco.inventory = [];
  eco.inventory.push(item.id);
  saveData();

  const embed = successEmbed("✅ Purchase Successful!")
    .addFields(
      { name: "🛍️ Item",          value: item.name,               inline: true },
      { name: "💰 Remaining",     value: `${eco.coins} 🪙`,        inline: true },
      { name: "📋 How to redeem", value: item.desc },
    )
    .setFooter({ text: `Contact staff to redeem your ${item.name}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });

  await logMod(message.guild, infoEmbed("🛒 Shop Purchase")
    .addFields(
      { name: "👤 User",  value: `<@${message.author.id}> (${message.author.tag})` },
      { name: "🛍️ Item",  value: item.name },
    )
    .setTimestamp());
}

async function handleGiveCoins(message, args) {
  if (!isAdmin(message.member))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("Admin only.")] });

  const userId = parseUserId(args[0]);
  const amount = parseInt(args[1], 10);
  if (!userId || !Number.isFinite(amount) || amount <= 0)
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}givecoins @user <amount>\``)] });

  const eco = getEconomy(userId);
  eco.coins = (eco.coins || 0) + amount;
  saveData();

  const embed = successEmbed("💰 Coins Given")
    .addFields(
      { name: "👤 User",    value: `<@${userId}>`, inline: true },
      { name: "➕ Given",   value: `${amount} 🪙`,  inline: true },
      { name: "💰 Balance", value: `${eco.coins} 🪙`, inline: true },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── INVITE TRACKING ──
// ─────────────────────────────────────────────
async function cacheInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    if (!data.inviteCache[guild.id]) data.inviteCache[guild.id] = {};
    invites.forEach(inv => { data.inviteCache[guild.id][inv.code] = inv.uses || 0; });
  } catch {}
}

async function handleInviteLeaderboard(message) {
  const guildInvites = data.invites[message.guild.id] || {};
  const entries = Object.entries(guildInvites)
    .map(([id, d]) => ({ id, invited: d.invited || 0, left: d.left || 0 }))
    .sort((a, b) => (b.invited - b.left) - (a.invited - a.left))
    .slice(0, 10);

  if (!entries.length) return respond(message, { embeds: [brandEmbed("📊 Invite Leaderboard").setDescription("No invite data yet.")] });

  const lines = entries.map((e, i) => {
    const net = e.invited - e.left;
    return `**${i + 1}.** <@${e.id}> — **${net}** net (${e.invited} invited, ${e.left} left)`;
  });

  const embed = goldEmbed("📨 Invite Leaderboard")
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Net invites = invited − users who left" })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleMyInvites(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  const guildInvites = data.invites[message.guild.id] || {};
  const inv = guildInvites[userId] || { invited: 0, left: 0, bonus: 0 };
  const net = inv.invited - inv.left;

  let user;
  try { user = await client.users.fetch(userId); } catch { user = null; }

  const embed = infoEmbed(`📨 Invites — ${user?.username || userId}`)
    .addFields(
      { name: "📬 Total Invited",  value: `${inv.invited}`, inline: true },
      { name: "🚪 Left Server",    value: `${inv.left}`,    inline: true },
      { name: "✅ Net Invites",    value: `${net}`,          inline: true },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── STICKY MESSAGE SYSTEM ──
// ─────────────────────────────────────────────
async function refreshSticky(channel) {
  if (channel.id !== STICKY_CHANNEL_ID) return;
  const lastStickyId = data.stickyMessages[channel.id];
  if (lastStickyId) {
    try { await channel.messages.delete(lastStickyId); } catch {}
  }
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setDescription(STICKY_MESSAGE_TEXT)
    .setFooter({ text: `${BOT_NAME} • Sticky Message` });
  const msg = await channel.send({ embeds: [embed] }).catch(() => null);
  if (msg) {
    data.stickyMessages[channel.id] = msg.id;
    saveData();
  }
}

// ─────────────────────────────────────────────
//  ── PARTNERSHIPS ──
// ─────────────────────────────────────────────
async function handlePartner(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) {
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need the **Manage Server** permission to post partnerships.")] });
  }

  const subcommand = (args[0] || "").toLowerCase();

  if (subcommand === "help" || !subcommand) {
    const embed = infoEmbed("🤝 Partnership System — Help")
      .setDescription("Post beautiful partnership announcements with different formats.")
      .addFields(
        { name: "📋 Basic Format", value: `\`${PREFIX}partner basic <invite> | <server name> | <description>\`` },
        { name: "🎨 Detailed Format", value: `\`${PREFIX}partner detailed <invite> | <server name> | <description> | <perks>\`` },
        { name: "📣 Announcement Format", value: `\`${PREFIX}partner announce <invite> | <server name> | <description> | <what they offer> | <what we offer>\`` },
        { name: "🎁 Promo Format", value: `\`${PREFIX}partner promo <invite> | <server name> | <promo text>\`` },
        { name: "📜 List", value: `\`${PREFIX}partner list\`` },
        { name: "🗑️ Remove", value: `\`${PREFIX}partner remove <id>\`` },
      )
      .setFooter({ text: "All formats delete your command message for a clean channel." });
    return respond(message, { embeds: [embed] });
  }

  if (subcommand === "list") {
    const ps = data.partnerships.filter(p => p.guildId === message.guild.id);
    if (!ps.length) return respond(message, { embeds: [brandEmbed("🤝 Partnerships").setDescription("No active partnerships recorded.")] });
    const embed = infoEmbed(`🤝 Active Partnerships — ${ps.length}`)
      .setDescription(ps.map(p => `**#${p.id}** [${p.name || "Unnamed"}](${p.invite}) — added by ${p.addedBy}`).join("\n"))
      .setTimestamp();
    return respond(message, { embeds: [embed] });
  }

  if (subcommand === "remove") {
    if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("Admin Only")] });
    const id = parseInt(args[1], 10);
    if (!Number.isFinite(id)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}partner remove <id>\``)] });
    const idx = data.partnerships.findIndex(p => p.id === id && p.guildId === message.guild.id);
    if (idx === -1) return respond(message, { embeds: [errorEmbed("Not Found").setDescription(`No partnership with ID #${id}.`)] });
    const removed = data.partnerships.splice(idx, 1)[0];
    saveData();
    return respond(message, { embeds: [successEmbed("✅ Partnership Removed").setDescription(`**${removed.name || removed.invite}** has been removed.`)] });
  }

  // ── Build partnership embed ──
  const rawContent = args.slice(1).join(" ");
  const parts = rawContent.split("|").map(s => s.trim());

  if (!parts[0]) {
    return respond(message, { embeds: [errorEmbed("Missing Info").setDescription(`Use \`${PREFIX}partner help\` to see all formats.`)] });
  }

  let invite = parts[0];
  // Normalize invite link
  if (!invite.startsWith("http")) {
    invite = "https://discord.gg/" + invite.replace(/^(discord\.gg\/|https?:\/\/discord\.gg\/)/i, "");
  }

  const INVITE_RE = /^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\/.+$/i;
  if (!INVITE_RE.test(invite)) {
    return respond(message, {
      embeds: [errorEmbed("Invalid Invite")
        .setDescription("Please provide a valid Discord invite link.\n**Examples:** `https://discord.gg/abc` or `discord.gg/abc`")],
    });
  }

  const partnershipRecord = {
    id: (data.partnerships.length ? Math.max(...data.partnerships.map(p => p.id)) + 1 : 1),
    guildId: message.guild.id,
    invite,
    name: parts[1] || null,
    format: subcommand,
    addedBy: message.author.tag,
    addedAt: new Date().toISOString(),
  };

  let embed;

  if (subcommand === "basic") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription(`\`${PREFIX}partner basic <invite> | <name> | <description>\``)] });
    embed = new EmbedBuilder()
      .setColor(INFO_COLOR)
      .setTitle("🤝 New Partner!")
      .setDescription("We're happy to welcome a new partner to the community!")
      .addFields(
        { name: "🏠 Server",   value: `**${parts[1]}**`,               inline: true },
        { name: "🔗 Join Now", value: `[Click to join!](${invite})`,   inline: true },
        { name: "📋 About",    value: parts[2] || "No description." },
      )
      .setAuthor({ name: BOT_NAME, iconURL: client.user?.displayAvatarURL() })
      .setFooter({ text: `Partnership • ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

  } else if (subcommand === "detailed") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription(`\`${PREFIX}partner detailed <invite> | <name> | <description> | [perks]\``)] });
    embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle("🌟 Featured Partner")
      .setDescription("✨ Check out our awesome partner!")
      .addFields(
        { name: "🏠 Server", value: `**${parts[1]}**`,          inline: true },
        { name: "🔗 Join",   value: `[${parts[1]}](${invite})`, inline: true },
        { name: "📖 About",  value: parts[2] || "—" },
      );
    if (parts[3]) {
      embed.addFields({ name: "🎁 Perks & Highlights", value: parts[3].split(",").map(s => `• ${s.trim()}`).join("\n") });
    }
    embed
      .setAuthor({ name: BOT_NAME, iconURL: client.user?.displayAvatarURL() })
      .setFooter({ text: `Partnership • ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

  } else if (subcommand === "announce") {
    if (parts.length < 5) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription(`\`${PREFIX}partner announce <invite> | <name> | <about> | <what they offer> | <what we offer>\``)] });
    embed = new EmbedBuilder()
      .setColor(GOLD_COLOR)
      .setTitle("🤝 Official Partnership Announcement")
      .setDescription(`We're excited to officially partner with **${parts[1]}**!`)
      .addFields(
        { name: "🏠 Server",             value: `**${parts[1]}**`,         inline: true },
        { name: "🔗 Join",               value: `[Click here](${invite})`, inline: true },
        { name: "📋 About Them",         value: parts[2] || "—" },
        { name: "🎁 What They Offer Us", value: parts[3] || "—", inline: true },
        { name: "💜 What We Offer Them", value: parts[4] || "—", inline: true },
      )
      .setAuthor({ name: BOT_NAME, iconURL: client.user?.displayAvatarURL() })
      .setFooter({ text: `Partnership Announcement • ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

  } else if (subcommand === "promo") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription(`\`${PREFIX}partner promo <invite> | <name> | <promo text>\``)] });
    embed = new EmbedBuilder()
      .setColor(SUCCESS_COLOR)
      .setTitle(`📣 Shoutout — ${parts[1]}`)
      .setDescription(parts[2])
      .addFields({ name: "🔗 Join Server", value: `[${invite}](${invite})` })
      .setAuthor({ name: BOT_NAME, iconURL: client.user?.displayAvatarURL() })
      .setFooter({ text: `Promo by ${message.author.tag}` })
      .setTimestamp();

  } else {
    return respond(message, { embeds: [warnEmbed("Unknown Format").setDescription(`Unknown format \`${subcommand}\`. Use \`${PREFIX}partner help\`.`)] });
  }

  data.partnerships.push(partnershipRecord);
  saveData();

  try { await message.delete(); } catch {}
  await message.channel.send({
    content: "@here — New partnership announcement!",
    embeds: [embed],
    allowedMentions: { parse: ["here"] },
  });
}

// ─────────────────────────────────────────────
//  ── ANNOUNCE ──
// ─────────────────────────────────────────────
async function handleAnnounce(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Server** or **Administrator** to make announcements.")] });

  let targetChannel = message.channel;
  let textArgs = args;

  if (args[0]) {
    const channelId = parseChannelId(args[0]);
    if (channelId) {
      const ch = await message.guild.channels.fetch(channelId).catch(() => null);
      if (ch?.isTextBased()) {
        targetChannel = ch;
        textArgs = args.slice(1);
      }
    }
  }

  const text = textArgs.join(" ").trim();
  if (!text) {
    return respond(message, {
      embeds: [warnEmbed("Usage")
        .setDescription(`\`${PREFIX}announce [#channel] <message>\``)],
    });
  }

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle("📣 Announcement")
    .setDescription(text)
    .setAuthor({ name: BOT_NAME, iconURL: client.user?.displayAvatarURL() })
    .setFooter({ text: `Posted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  try { await message.delete(); } catch {}
  await targetChannel.send({
    content: "@everyone",
    embeds: [embed],
    allowedMentions: { parse: ["everyone"] },
  });
}

// ─────────────────────────────────────────────
//  ── DISCOUNT SYSTEM ──
// ─────────────────────────────────────────────
function hasOrdered(userId) {
  return data.orders.some(o => o.userId === userId);
}

async function handleDiscount(message) {
  const userId = message.author.id;
  const ordered = hasOrdered(userId);

  if (!ordered) {
    const embed = infoEmbed("🎟️ Loyalty Discount")
      .setDescription(
        "You don't have any previous orders yet.\n\n" +
        `Place your first order by opening a ticket!\n` +
        "**After your first order, you'll automatically get a 5% discount on future orders.** 💗"
      )
      .setTimestamp();
    return respond(message, { embeds: [embed] });
  }

  const embed = successEmbed("🎟️ You Have a Loyalty Discount!")
    .setDescription(
      "As a returning customer, you're eligible for a **5% discount** on your next commission!\n\n" +
      "**How to redeem:**\n" +
      "1. Open a ticket\n" +
      "2. Mention your discount when discussing pricing\n" +
      "3. Staff will apply it to your quote automatically.\n\n" +
      "Thank you for being a valued customer! 💗"
    )
    .setThumbnail(message.author.displayAvatarURL())
    .addFields({ name: "📊 Your Orders", value: `${data.orders.filter(o => o.userId === userId).length} total` })
    .setFooter({ text: "One discount applies per order." })
    .setTimestamp();
  return respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── FUN COMMANDS ──
// ─────────────────────────────────────────────
async function handleCoinFlip(message) {
  consumeCooldown("coinflip", message.author.id);
  const result = Math.random() < 0.5 ? "Heads" : "Tails";
  const embed = brandEmbed("🪙 Coin Flip")
    .setDescription(`**${result}!** ${result === "Heads" ? "👑" : "🌊"}`)
    .setFooter({ text: `Flipped by ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
}

async function handleRoll(message, args) {
  consumeCooldown("roll", message.author.id);
  const max = parseInt(args[0], 10) || 6;
  const min = parseInt(args[1], 10) || 1;
  if (max < 2 || max > 10000) return respond(message, { embeds: [errorEmbed("Invalid").setDescription("Max must be between 2 and 10,000.")] });
  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  const embed = brandEmbed("🎲 Dice Roll")
    .setDescription(`You rolled a **${result}** (1–${max})`)
    .setFooter({ text: `Rolled by ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
}

async function handleRPS(message, args) {
  consumeCooldown("rps", message.author.id);
  const choices = ["rock", "paper", "scissors"];
  const emojis = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const userChoice = (args[0] || "").toLowerCase();
  if (!choices.includes(userChoice)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}rps <rock|paper|scissors>\``)] });

  const botChoice = choices[Math.floor(Math.random() * 3)];
  let outcome;
  if (userChoice === botChoice) outcome = "🤝 It's a **tie**!";
  else if (
    (userChoice === "rock" && botChoice === "scissors") ||
    (userChoice === "paper" && botChoice === "rock") ||
    (userChoice === "scissors" && botChoice === "paper")
  ) outcome = "🎉 You **win**!";
  else outcome = "🤖 I **win**!";

  const embed = brandEmbed("🎮 Rock Paper Scissors")
    .addFields(
      { name: "Your Choice", value: `${emojis[userChoice]} ${userChoice}`, inline: true },
      { name: "My Choice",   value: `${emojis[botChoice]} ${botChoice}`,   inline: true },
      { name: "Result",      value: outcome },
    )
    .setFooter({ text: `vs ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
}

async function handlePoll(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Messages** to create polls.")] });

  const raw = args.join(" ");
  const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) {
    return respond(message, {
      embeds: [warnEmbed("Usage")
        .setDescription(`\`${PREFIX}poll <question> | <option 1> | <option 2> | ...\``)],
    });
  }

  const question = parts[0];
  const options  = parts.slice(1).slice(0, 9);
  const numbers  = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];

  const embed = new EmbedBuilder()
    .setColor(INFO_COLOR)
    .setTitle(`📊 Poll: ${question}`)
    .setDescription(options.map((o, i) => `${numbers[i]} ${o}`).join("\n\n"))
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
    .setFooter({ text: "React below to vote!" })
    .setTimestamp();

  try { await message.delete(); } catch {}
  const sent = await message.channel.send({ embeds: [embed] });
  for (let i = 0; i < options.length; i++) await sent.react(numbers[i]).catch(() => {});
}

async function handleTrivia(message) {
  consumeCooldown("trivia", message.author.id);

  const channelId = message.channel.id;
  if (data.triviaActive[channelId]) {
    return respond(message, { embeds: [warnEmbed("Trivia Active").setDescription("There's already an active trivia question in this channel! Answer it first.")] });
  }

  const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
  const rewardCoins = 50 + Math.floor(Math.random() * 50);

  data.triviaActive[channelId] = { question: q.q, answers: q.a, hint: q.hint, hostId: message.author.id, rewardCoins };
  saveData();

  const embed = infoEmbed("🧠 Trivia Time!")
    .setDescription(`**${q.q}**\n\n*Hint: ${q.hint}*`)
    .addFields({ name: "💰 Reward", value: `${rewardCoins} 🪙 coins for the first correct answer!` })
    .setFooter({ text: "Type your answer in chat • 60 second timeout" })
    .setTimestamp();
  await respond(message, { embeds: [embed] });

  setTimeout(async () => {
    if (data.triviaActive[channelId]) {
      delete data.triviaActive[channelId];
      saveData();
      await message.channel.send({ embeds: [warnEmbed("⏰ Trivia Expired").setDescription(`No one answered in time! The answer was: **${q.a[0]}**`)] }).catch(() => {});
    }
  }, 60_000);
}

// ─────────────────────────────────────────────
//  ── GIVEAWAY (fixed) ──
// ─────────────────────────────────────────────
async function handleGiveaway(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Server** to start giveaways.")] });

  const raw   = args.join(" ");
  const pipeIdx = raw.indexOf("|");
  if (pipeIdx < 0) {
    return respond(message, {
      embeds: [warnEmbed("Usage")
        .setDescription(`\`${PREFIX}giveaway <duration> | <prize>\`\n\n**Example:** \`${PREFIX}giveaway 10m | 500 Robux Commission Voucher\``)],
    });
  }

  const durationPart = raw.slice(0, pipeIdx).trim();
  const prize = raw.slice(pipeIdx + 1).trim();

  const ms = parseDuration(durationPart);
  if (!ms) return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Use formats like `10m`, `1h`, `1d`.")] });
  if (!prize) return respond(message, { embeds: [errorEmbed("Missing Prize").setDescription("Please specify a prize after the `|`.")] });

  const endAt = Date.now() + ms;

  const embed = new EmbedBuilder()
    .setColor(GOLD_COLOR)
    .setTitle("🎉 GIVEAWAY!")
    .setDescription(`React with 🎉 to enter!\n\n**Prize:** ${prize}`)
    .addFields(
      { name: "⏰ Ends",  value: `<t:${Math.floor(endAt / 1000)}:R>`, inline: true },
      { name: "🎁 Prize", value: prize,                               inline: true },
      { name: "🏠 Host",  value: `<@${message.author.id}>`,           inline: true },
    )
    .setFooter({ text: "React with 🎉 to enter!" })
    .setTimestamp();

  const sent = await message.channel.send({ content: "@here", embeds: [embed], allowedMentions: { parse: ["here"] } });
  await sent.react("🎉").catch(() => {});

  data.giveaways[sent.id] = {
    prize, endAt,
    channelId: message.channel.id,
    guildId: message.guild.id,
    hostId: message.author.id,
    ended: false,
  };
  saveData();
}

async function checkGiveaways() {
  const now = Date.now();
  for (const [msgId, giveaway] of Object.entries(data.giveaways)) {
    if (giveaway.ended || giveaway.endAt > now) continue;
    giveaway.ended = true;
    saveData();

    try {
      const guild = client.guilds.cache.get(giveaway.guildId);
      if (!guild) continue;
      const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
      if (!channel) continue;

      // Fetch message with force to ensure reaction data is fresh
      const msg = await channel.messages.fetch({ message: msgId, force: true }).catch(() => null);
      if (!msg) continue;

      const reaction = msg.reactions.cache.get("🎉");
      let entrants = [];
      if (reaction) {
        // Fetch all users who reacted (handles pagination)
        let lastId;
        while (true) {
          const batch = await reaction.users.fetch({ limit: 100, after: lastId }).catch(() => null);
          if (!batch || batch.size === 0) break;
          entrants.push(...batch.filter(u => !u.bot).map(u => u.id));
          if (batch.size < 100) break;
          lastId = batch.last().id;
        }
      }

      if (!entrants.length) {
        await channel.send({ embeds: [warnEmbed("🎉 Giveaway Ended").setDescription(`**${giveaway.prize}** — No valid entries. Giveaway cancelled.`)] });
      } else {
        const winnerId = entrants[Math.floor(Math.random() * entrants.length)];
        await channel.send({
          content: `🎉 Congratulations <@${winnerId}>!`,
          embeds: [successEmbed("🎉 Giveaway Winner!")
            .setDescription(`<@${winnerId}> won **${giveaway.prize}**!\n\nContact staff to claim your prize.`)
            .addFields({ name: "📊 Entries", value: `${entrants.length}` })
            .setTimestamp()],
          allowedMentions: { parse: ["users"] },
        });
      }
    } catch (err) {
      console.error("Giveaway end failed:", err);
      await sendErrorLog(err, `Giveaway end for message ${msgId}`);
    }
  }
}

async function handleReminder(message, args) {
  const raw = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) {
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}remindme <time> | <message>\`\n**Example:** \`${PREFIX}remindme 30m | Check on the datastore fix\``)] });
  }

  const durationStr  = raw.slice(0, pipe).trim();
  const reminderText = raw.slice(pipe + 1).trim();
  const ms = parseDuration(durationStr);
  if (!ms || ms > 7 * TIME_UNITS.d) return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Use formats like `10m`, `1h`, `1d`. Max 7 days.")] });
  if (!reminderText) return respond(message, { embeds: [errorEmbed("Missing Message").setDescription("Include a reminder message after the `|`.")] });

  await respond(message, {
    embeds: [successEmbed("⏰ Reminder Set!")
      .setDescription(`I'll ping you in **${formatDuration(ms)}**.\n> ${reminderText}`)
      .setFooter({ text: "Reminder will be sent in this channel." })],
  });

  setTimeout(async () => {
    await message.channel.send({
      content: `<@${message.author.id}>`,
      embeds: [brandEmbed("⏰ Reminder!")
        .setDescription(`> ${reminderText}`)
        .setFooter({ text: `Reminder set ${formatDuration(ms)} ago` })
        .setTimestamp()],
    }).catch(() => {});
  }, ms);
}

async function handleColor(message, args) {
  const hex = (args[0] || "").replace("#", "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}color <hex code>\`\n**Example:** \`${PREFIX}color FF8FB1\``)] });
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const embed = new EmbedBuilder()
    .setColor(parseInt(hex, 16))
    .setTitle(`🎨 Color #${hex.toUpperCase()}`)
    .addFields(
      { name: "HEX", value: `#${hex.toUpperCase()}`, inline: true },
      { name: "RGB", value: `${r}, ${g}, ${b}`,      inline: true },
      { name: "INT", value: `${parseInt(hex, 16)}`,  inline: true },
    )
    .setImage(`https://singlecolorimage.com/get/${hex}/200x80`)
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleEmbed(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const raw = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) {
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}embed <title> | <description>\``)] });
  }
  const title = raw.slice(0, pipe).trim();
  const desc  = raw.slice(pipe + 1).trim();
  if (!title || !desc) return respond(message, { embeds: [errorEmbed("Missing Fields")] });

  try { await message.delete(); } catch {}
  await message.channel.send({
    embeds: [new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setDescription(desc).setTimestamp()],
  });
}

async function handleCalc(message, args) {
  const expr = args.join(" ").trim().replace(/[^0-9+\-*/.() %^]/g, "");
  if (!expr) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}calc <expression>\``)] });
  try {
    const result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result !== "number" || !Number.isFinite(result))
      throw new Error("Not a finite number");
    const embed = brandEmbed("🧮 Calculator")
      .addFields(
        { name: "📥 Input",  value: `\`${expr}\``,  inline: true },
        { name: "📤 Result", value: `\`${result}\``, inline: true },
      );
    await respond(message, { embeds: [embed] });
  } catch {
    await respond(message, { embeds: [errorEmbed("Invalid Expression").setDescription("Couldn't evaluate that. Use basic math: `+`, `-`, `*`, `/`, `()`")] });
  }
}

async function handleServerIcon(message) {
  const guild = message.guild;
  if (!guild.iconURL()) return respond(message, { embeds: [errorEmbed("No Icon").setDescription("This server has no icon.")] });
  const url = guild.iconURL({ size: 1024, extension: "png" });
  const embed = brandEmbed(`🖼️ ${guild.name} — Server Icon`)
    .setURL(url).setImage(url)
    .setFooter({ text: "Click the title to open full size." });
  await respond(message, { embeds: [embed] });
}

async function handleBanner(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try { user = await client.users.fetch(userId, { force: true }); }
  catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  if (!user.bannerURL()) return respond(message, { embeds: [warnEmbed("No Banner").setDescription("That user has no banner set.")] });
  const url = user.bannerURL({ size: 1024, extension: "png" });
  const embed = brandEmbed(`🖼️ ${user.username}'s Banner`)
    .setURL(url).setImage(url);
  await respond(message, { embeds: [embed] });
}

async function handleSlowmode(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageChannels))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Channels**.")] });

  const secs = parseInt(args[0], 10);
  if (!Number.isFinite(secs) || secs < 0 || secs > 21600)
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}slowmode <seconds>\` — 0 to disable, max 21600.`)] });

  await message.channel.setRateLimitPerUser(secs, `Set by ${message.author.tag}`);
  const embed = successEmbed("🐢 Slowmode Updated")
    .setDescription(secs === 0 ? "Slowmode has been **disabled**." : `Slowmode set to **${secs} second(s)**.`)
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleLock(message) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageChannels))
    return respond(message, { embeds: [errorEmbed("No Permission")] });
  await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
  const embed = errorEmbed("🔒 Channel Locked").setDescription("This channel has been locked. Only staff can send messages.").setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🔒 Channel Locked")
    .addFields({ name: "💬 Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "🛡️ By", value: message.author.tag, inline: true })
    .setTimestamp());
}

async function handleUnlock(message) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageChannels))
    return respond(message, { embeds: [errorEmbed("No Permission")] });
  await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
  const embed = successEmbed("🔓 Channel Unlocked").setDescription("This channel has been unlocked. Members can send messages again.").setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleNick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageNicknames))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}nick @user <new nickname>\` (or omit nickname to reset)`)] });

  const nick = args.slice(1).join(" ").trim() || null;
  let member;
  try { member = await message.guild.members.fetch(userId); }
  catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  if (!member.manageable) return respond(message, { embeds: [errorEmbed("Can't Edit").setDescription("I can't change that user's nickname (role hierarchy).")] });

  await member.setNickname(nick, `By ${message.author.tag}`);
  const embed = successEmbed("✏️ Nickname Updated")
    .addFields(
      { name: "👤 User",     value: `<@${userId}>`,      inline: true },
      { name: "✏️ Nickname", value: nick || "*(reset)*", inline: true },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

// ─────────────────────────────────────────────
//  ── ORIGINAL COMMANDS ──
// ─────────────────────────────────────────────
async function handleHelp(message) {
  const COMMAND_LIST = [
    {
      category: "📌 General",
      items: [
        { name: "s!help",        desc: "Show this command list." },
        { name: "s!info",        desc: "Bot info." },
        { name: "s!status",      desc: "Check if the bot is online." },
        { name: "s!ping",        desc: "Replies with pong 🧸." },
        { name: "s!rules",       desc: "Posts the server rules." },
        { name: "s!prices",      desc: "Payment methods and pricing." },
        { name: "s!uptime",      desc: "How long the bot has been running." },
        { name: "s!discount",    desc: "Check if you qualify for a 5% discount." },
      ],
    },
    {
      category: "💼 Commissions",
      items: [
        { name: "s!services",         desc: "Everything we offer." },
        { name: "s!queue",            desc: "Active and pending commissions." },
        { name: "s!statusorder <id>", desc: "Check a specific order status." },
        { name: "s!ticket",           desc: "Open a private support ticket." },
        { name: "s!pay",              desc: "Show payment details." },
      ],
    },
    {
      category: "📂 Portfolio",
      items: [
        { name: "s!work [page]", desc: "Browse previous work. Alias: s!portfolio." },
      ],
    },
    {
      category: "🔧 Scripting Utility",
      items: [
        { name: "s!script <type>", desc: "Example scripts: ui, admin, movement, remote, datastore." },
        { name: "s!snippet",       desc: "Random useful Lua/Roblox code snippet." },
        { name: "s!docs",          desc: "Scripting documentation and resources." },
        { name: "s!debug",         desc: "Template for reporting errors." },
      ],
    },
    {
      category: "📊 Leveling & Economy",
      items: [
        { name: "s!level [user]",    desc: "Your current level and XP." },
        { name: "s!rank [user]",     desc: "Detailed stats." },
        { name: "s!leaderboard",     desc: "Top users by level." },
        { name: "s!balance [user]",  desc: "Check your coin balance." },
        { name: "s!work",            desc: "Earn coins (1 hour cooldown)." },
        { name: "s!daily",           desc: "Claim your daily reward." },
        { name: "s!shop",            desc: "View the coin shop." },
        { name: "s!buy <item_id>",   desc: "Purchase an item." },
      ],
    },
    {
      category: "📨 Invites",
      items: [
        { name: "s!invites [user]",    desc: "Check your invites." },
        { name: "s!inviteleaderboard", desc: "Top inviters." },
      ],
    },
    {
      category: "ℹ️ Info",
      items: [
        { name: "s!userinfo [user]", desc: "Show info about a user." },
        { name: "s!serverinfo",      desc: "Show server info." },
        { name: "s!avatar [user]",   desc: "Show a user's avatar." },
        { name: "s!banner [user]",   desc: "Show a user's banner." },
        { name: "s!servericon",      desc: "Show the server icon." },
        { name: "s!stats",           desc: "Bot activity stats." },
        { name: "s!color <hex>",     desc: "Preview a hex color." },
        { name: "s!calc <expr>",     desc: "Calculator." },
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
      category: "🎉 Fun & Games",
      items: [
        { name: "s!quote",                       desc: "Random motivational quote." },
        { name: "s!tip",                         desc: "Random scripting tip." },
        { name: "s!meme",                        desc: "Random wholesome meme." },
        { name: "s!8ball <question>",            desc: "Magic 8-ball answers." },
        { name: "s!rate <thing>",                desc: "I rate it 0–10." },
        { name: "s!coinflip",                    desc: "Flip a coin." },
        { name: "s!roll [max]",                  desc: "Roll a dice." },
        { name: "s!rps <rock|paper|scissors>",   desc: "Rock, paper, scissors." },
        { name: "s!trivia",                      desc: "Answer a Lua/Roblox trivia question." },
        { name: "s!remindme <time> | <message>", desc: "Set a personal reminder." },
      ],
    },
    {
      category: "🔨 Moderation (Staff only)",
      items: [
        { name: "s!ban <user> <reason>",         desc: "Ban a user." },
        { name: "s!kick <user> [reason]",        desc: "Kick a user." },
        { name: "s!mute <user> <time> [reason]", desc: "Timeout a user." },
        { name: "s!warn <user> <reason>",        desc: "Issue a warning." },
        { name: "s!warns <user>",                desc: "View warning history." },
        { name: "s!unwarn <id>",                 desc: "Remove a warning." },
        { name: "s!purge <count>",               desc: "Bulk delete messages." },
        { name: "s!lock",                        desc: "Lock the current channel." },
        { name: "s!unlock",                      desc: "Unlock the current channel." },
        { name: "s!slowmode <seconds>",          desc: "Set channel slowmode." },
        { name: "s!nick @user [nickname]",       desc: "Set or reset a nickname." },
      ],
    },
    {
      category: "⚙️ Admin",
      items: [
        { name: "s!announce [#ch] <message>",    desc: "Send a styled announcement." },
        { name: "s!partner <format> ...",        desc: "Post a partnership." },
        { name: "s!poll <q> | <a1> | <a2> ...", desc: "Create a reaction poll." },
        { name: "s!giveaway <time> | <prize>",  desc: "Start a giveaway." },
        { name: "s!embed <title> | <body>",      desc: "Send a custom embed." },
        { name: "s!addorder @user <details>",   desc: "Add a commission." },
        { name: "s!complete <id>",              desc: "Mark a commission as completed." },
        { name: "s!blacklist @user",            desc: "Toggle a user's bot access." },
        { name: "s!setlog [#channel]",          desc: "Set the mod log channel." },
        { name: "s!setreviews [#channel]",      desc: "Set the reviews channel." },
        { name: "s!settranscripts [#channel]",  desc: "Set the transcripts channel." },
        { name: "s!ticketpanel",                desc: "Post the ticket panel." },
        { name: "s!close",                      desc: "Close the current ticket." },
        { name: "s!addnote <text>",             desc: "Add a staff note in a ticket." },
        { name: "s!addwork <url> [title]",      desc: "Add a portfolio entry." },
        { name: "s!removework <id>",            desc: "Remove a portfolio entry." },
        { name: "s!givecoins @user <amount>",   desc: "Give coins to a user." },
        { name: "s!say <message>",              desc: "Send a message as the bot." },
      ],
    },
  ];

  const embed = brandEmbed(`🧸 ${BOT_NAME} — Command List`)
    .setDescription(`Use the prefix \`${PREFIX}\` before any command below.\n*${BOT_NAME} v${BOT_VERSION}*`)
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION} • Made with 💗 by ${BOT_OWNER}` })
    .setTimestamp();

  for (const group of COMMAND_LIST) {
    embed.addFields({ name: group.category, value: group.items.map(c => `\`${c.name}\` — ${c.desc}`).join("\n") });
  }
  await respond(message, { embeds: [embed] });
}

async function handleInfo(message) {
  const up = Math.floor(process.uptime());
  const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60;
  const embed = brandEmbed(`🧸 ${BOT_NAME}`)
    .setDescription("A feature-rich scripting services bot for the Snuggles Scripting community.")
    .addFields(
      { name: "🤖 Bot Tag",  value: client.user?.tag || "Unknown", inline: true },
      { name: "📦 Version",  value: `v${BOT_VERSION}`,             inline: true },
      { name: "👑 Owner",    value: BOT_OWNER,                     inline: true },
      { name: "📚 Library",  value: "discord.js v14",              inline: true },
      { name: "⚙️ Runtime",  value: `Node.js ${process.version}`,  inline: true },
      { name: "🌐 Servers",  value: `${client.guilds.cache.size}`, inline: true },
      { name: "⏱️ Uptime",   value: `${h}h ${m}m ${s}s`,          inline: true },
    )
    .setFooter({ text: "Built with discord.js • Snuggles Scripting" })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleStatus(message) {
  const wsPing = Math.max(0, Math.round(client.ws.ping));
  const sent = await message.channel.send({ embeds: [infoEmbed("🔍 Checking Status…").setDescription("Please wait…")] });
  const apiLatency = sent.createdTimestamp - message.createdTimestamp;

  const embed = successEmbed("🟢 All Systems Operational")
    .addFields(
      { name: "🤖 Bot",               value: "🟢 Online",                                                  inline: true },
      { name: "📡 Gateway Ping",      value: `${wsPing} ms`,                                               inline: true },
      { name: "🌐 API Latency",       value: `${apiLatency} ms`,                                           inline: true },
      { name: "📋 Commission System", value: `🟢 ${data.orders.length} order(s) tracked` },
      { name: "🎟️ Ticket System",    value: "🟢 Operational" },
      { name: "📊 Leveling",          value: `🟢 ${Object.keys(data.leveling).length} users tracked` },
      { name: "💰 Economy",           value: `🟢 ${Object.keys(data.economy).length} accounts` },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` })
    .setTimestamp();
  await sent.edit({ content: "", embeds: [embed] });
}

async function handlePing(message) {
  const wsPing = Math.max(0, Math.round(client.ws.ping));
  await respond(message, { embeds: [successEmbed("🏓 Pong!").addFields({ name: "Gateway Ping", value: `${wsPing} ms`, inline: true })] });
}

async function handleRules(message) {
  const embed = brandEmbed("📜 Server Rules")
    .setDescription(SERVER_RULES.join("\n\n"))
    .setFooter({ text: "Please follow the rules to keep this community safe and welcoming." })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handlePrices(message) {
  const embed = new EmbedBuilder()
    .setTitle(PAYMENT_INFO.title).setDescription(PAYMENT_INFO.description).setColor(SUCCESS_COLOR)
    .addFields(...PAYMENT_INFO.methods.map(m => ({ name: m.name, value: m.value })))
    .addFields({ name: "⚠️ Refund Policy", value: PAYMENT_INFO.note })
    .setFooter({ text: `Open a ticket to start a purchase.` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleServices(message) {
  const embed = brandEmbed(`🛍️ ${BOT_NAME} — Services`)
    .setDescription("Here's everything we offer. Open a ticket to get started.")
    .addFields(SERVICES)
    .setFooter({ text: `Use ${PREFIX}ticket to start a commission.` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleQueue(message) {
  const active = data.orders.filter(o => o.status === "pending" || o.status === "in_progress");
  const embed = brandEmbed("📋 Commission Queue")
    .setFooter({ text: `${active.length} active order(s) • ${BOT_NAME}` })
    .setTimestamp();
  if (!active.length) {
    embed.setDescription(`The queue is currently empty. Open a ticket to request a commission.`);
  } else {
    embed.setDescription(active.map(o => `**#${o.id}** — ${statusBadge(o.status)}\n<@${o.userId}> — ${o.details}`).join("\n\n"));
  }
  await respond(message, { embeds: [embed] });
}

async function handleStatusOrder(message, args) {
  if (!args[0]) return respond(message, { embeds: [errorEmbed("Missing Argument").setDescription(`Usage: \`${PREFIX}statusorder <id>\``)] });
  const order = findOrder(args[0]);
  if (!order) return respond(message, { embeds: [errorEmbed("Order Not Found").setDescription(`No order found with ID \`${args[0]}\`.`)] });

  const embed = brandEmbed(`📦 Order #${order.id}`)
    .addFields(
      { name: "📊 Status",   value: statusBadge(order.status),                                                       inline: true },
      { name: "👤 Customer", value: `<@${order.userId}>`,                                                            inline: true },
      { name: "📝 Details",  value: order.details },
      { name: "📅 Created",  value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:f>`,               inline: true },
      { name: "🔄 Updated",  value: `<t:${Math.floor(new Date(order.updatedAt).getTime() / 1000)}:R>`,               inline: true },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleUptime(message) {
  const ms = client.uptime || 0;
  await respond(message, { embeds: [brandEmbed("⏱️ Bot Uptime").setDescription(`**${BOT_NAME}** has been online for **${formatDuration(ms)}**.`).setFooter({ text: `v${BOT_VERSION}` }).setTimestamp()] });
}

async function handleScript(message, args) {
  const type = (args[0] || "").toLowerCase();
  const available = Object.keys(SCRIPT_EXAMPLES).join(", ");
  if (!type) return respond(message, { embeds: [warnEmbed("Missing Script Type").setDescription(`Usage: \`${PREFIX}script <type>\`\n\nAvailable: \`${available}\``)] });
  const example = SCRIPT_EXAMPLES[type];
  if (!example) return respond(message, { embeds: [errorEmbed("Unknown Type").setDescription(`No example for \`${type}\`.\n\nAvailable: \`${available}\``)] });
  await respond(message, { embeds: [brandEmbed(`📜 ${example.title}`).setDescription("```lua\n" + example.code + "\n```").setFooter({ text: `Category: ${type} • ${BOT_NAME}` }).setTimestamp()] });
}

async function handleSnippet(message) {
  consumeCooldown("snippet", message.author.id);
  const s = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
  await respond(message, { embeds: [brandEmbed(`💡 Snippet — ${s.title}`).setDescription("```lua\n" + s.code + "\n```").setFooter({ text: `Use ${PREFIX}snippet again for another one.` })] });
}

async function handleDocs(message) {
  await respond(message, { embeds: [brandEmbed("📚 Scripting Resources").setDescription("Essential references for Roblox / Luau development.").addFields(DOCS.map(d => ({ name: d.name, value: d.value }))).setFooter({ text: "Bookmark these — they'll save you hours." }).setTimestamp()] });
}

async function handleDebug(message) {
  const template = "```\nWhat you're trying to do:\n<describe the goal>\n\nWhat's happening instead:\n<describe the actual behavior>\n\nError message (if any):\n<paste the full error from the Output window>\n\nRelevant code:\n<paste only the section that breaks — keep it short>\n\nWhat you've tried:\n<list any fixes you already attempted>\n```";
  await respond(message, { embeds: [warnEmbed("🐛 Debug Template").setDescription("Copy the template below, fill it out, and post it in the help channel or your ticket.\n\n" + template).setFooter({ text: `${BOT_NAME} • Be as detailed as possible!` })] });
}

async function handleUserInfo(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let member = null, user = null;
  try { member = await message.guild.members.fetch(userId); user = member.user; }
  catch { try { user = await client.users.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); } }

  const embed = brandEmbed(`👤 ${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "🆔 ID",              value: user.id,                                inline: true },
      { name: "🤖 Bot",             value: user.bot ? "Yes" : "No",                inline: true },
      { name: "📅 Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
    );
  if (member) {
    if (member.joinedTimestamp) embed.addFields({ name: "📥 Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` });
    const roles = member.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position).map(r => `<@&${r.id}>`).slice(0, 15);
    if (roles.length) embed.addFields({ name: `🎭 Roles (${roles.length})`, value: roles.join(" ") });
    const lv  = getLeveling(userId);
    const eco = getEconomy(userId);
    embed.addFields(
      { name: "🏆 Level",       value: `${lv.level}`,                               inline: true },
      { name: "💰 Coins",       value: `${eco.coins || 0} 🪙`,                      inline: true },
      { name: "⚠️ Warnings",    value: `${(data.warns[user.id] || []).length}`,      inline: true },
      { name: "🚫 Blacklisted", value: data.blacklist.includes(user.id) ? "Yes" : "No", inline: true },
    );
  }
  embed.setTimestamp();
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
      { name: "🆔 ID",         value: guild.id,                                                              inline: true },
      { name: "👑 Owner",      value: owner ? owner.user.tag : "—",                                          inline: true },
      { name: "📅 Created",    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` },
      { name: "👥 Members",    value: `${guild.memberCount}`,                                                inline: true },
      { name: "🎭 Roles",      value: `${guild.roles.cache.size}`,                                           inline: true },
      { name: "😄 Emojis",     value: `${guild.emojis.cache.size}`,                                          inline: true },
      { name: "💬 Text",       value: `${channels.filter(c => c.type === ChannelType.GuildText).size}`,      inline: true },
      { name: "🔊 Voice",      value: `${channels.filter(c => c.type === ChannelType.GuildVoice).size}`,     inline: true },
      { name: "✨ Boost Tier", value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)` },
    )
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user;
  try { user = await client.users.fetch(userId); }
  catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  const url = user.displayAvatarURL({ size: 1024, extension: "png" });
  await respond(message, { embeds: [brandEmbed(`🖼️ ${user.tag}'s Avatar`).setURL(url).setImage(url).setFooter({ text: "Click the title to open full size." })] });
}

async function handleStats(message) {
  consumeCooldown("stats", message.author.id);
  const stats = data.stats || {};
  const activeOrders    = data.orders.filter(o => o.status !== "completed").length;
  const completedOrders = data.orders.filter(o => o.status === "completed").length;
  const totalReviews    = data.reviews.length;
  const avgRating       = totalReviews ? (data.reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(2) : "—";
  const totalWarns      = Object.values(data.warns).reduce((s, l) => s + l.length, 0);
  const up = process.uptime();
  const embed = brandEmbed(`📈 ${BOT_NAME} — Stats`)
    .addFields(
      { name: "📦 Orders (active / done)",    value: `${activeOrders} / ${completedOrders}`,                    inline: true },
      { name: "🎟️ Tickets (opened / closed)", value: `${stats.ticketsOpened || 0} / ${stats.ticketsClosed || 0}`, inline: true },
      { name: "⭐ Reviews",                   value: `${totalReviews} (avg ${avgRating}⭐)`,                    inline: true },
      { name: "⚠️ Warnings on file",          value: `${totalWarns}`,                                           inline: true },
      { name: "🎨 Portfolio entries",         value: `${data.portfolio.length}`,                                 inline: true },
      { name: "📊 Leveling users",            value: `${Object.keys(data.leveling).length}`,                    inline: true },
      { name: "💰 Economy accounts",          value: `${Object.keys(data.economy).length}`,                     inline: true },
      { name: "⏱️ Uptime",                    value: `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`, inline: true },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}` })
    .setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleReview(message, args) {
  consumeCooldown("review", message.author.id);
  const raw = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) return respond(message, { embeds: [warnEmbed("Review Format").setDescription(`\`${PREFIX}review <rating 1-5> <commission type> | <your message>\``)] });
  const left = raw.slice(0, pipe).trim().split(/\s+/);
  const reviewMessage = raw.slice(pipe + 1).trim();
  const rating = parseInt(left[0], 10);
  const commissionType = left.slice(1).join(" ").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return respond(message, { embeds: [errorEmbed("Invalid Rating").setDescription("Rating must be 1–5.")] });
  if (!commissionType) return respond(message, { embeds: [errorEmbed("Missing Type")] });
  if (!reviewMessage) return respond(message, { embeds: [errorEmbed("Missing Message")] });

  const review = { id: data.nextReviewId++, userId: message.author.id, username: message.author.tag, commissionType, rating, message: reviewMessage, at: new Date().toISOString() };
  data.reviews.push(review);
  data.stats.reviewsSubmitted = (data.stats.reviewsSubmitted || 0) + 1;
  saveData();

  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
  const embed = brandEmbed("⭐ New Review Submitted")
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: "👤 From",        value: `${message.author} (${message.author.tag})`, inline: true },
      { name: "🛠️ Commission", value: commissionType,                               inline: true },
      { name: "📊 Rating",     value: `${stars} **(${rating}/5)**` },
      { name: "💬 Review",     value: reviewMessage },
    )
    .setFooter({ text: `Review #${review.id} • ${BOT_NAME}` })
    .setTimestamp();

  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    try {
      const target = await message.guild.channels.fetch(settings.reviewsChannelId);
      if (target?.isTextBased()) {
        await target.send({ embeds: [embed] });
        return respond(message, { embeds: [successEmbed("✅ Review Posted").setDescription(`Posted in <#${settings.reviewsChannelId}>. Thanks!`)] });
      }
    } catch {}
  }
  return respond(message, { embeds: [embed] });
}

async function handleVouch(message, args) {
  consumeCooldown("vouch", message.author.id);
  const text = args.join(" ").trim();
  if (!text) return respond(message, { embeds: [warnEmbed("Missing Message").setDescription(`\`${PREFIX}vouch <your note>\``)] });
  const embed = successEmbed("✅ Vouch").setDescription(`> ${text}`).setThumbnail(message.author.displayAvatarURL()).setFooter({ text: `Vouched by ${message.author.tag}` }).setTimestamp();
  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    try {
      const target = await message.guild.channels.fetch(settings.reviewsChannelId);
      if (target?.isTextBased()) {
        await target.send({ embeds: [embed] });
        return respond(message, { embeds: [successEmbed("✅ Vouch Posted").setDescription(`Posted in <#${settings.reviewsChannelId}>!`)] });
      }
    } catch {}
  }
  return respond(message, { embeds: [embed] });
}

async function handlePay(message) {
  consumeCooldown("pay", message.author.id);
  await respond(message, {
    embeds: [brandEmbed("💸 Payment Details")
      .setDescription("Send payment using one of the methods below, then drop a screenshot inside your ticket.")
      .addFields(
        { name: "💵 CashApp",    value: "[$siahhispaid](https://cash.app/$siahhispaid)",                    inline: true },
        { name: "🅿️ PayPal",    value: "[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)", inline: true },
        { name: "⚠️ Important", value: "**Friends & Family only.** Goods & Services payments will be refunded." },
      )
      .setFooter({ text: `${BOT_NAME} • All sales final — no refunds.` })
      .setTimestamp()],
  });
}

async function handleQuote(message) {
  consumeCooldown("quote", message.author.id);
  await respond(message, { embeds: [brandEmbed("💭 Motivation").setDescription(`*${QUOTES[Math.floor(Math.random() * QUOTES.length)]}*`).setFooter({ text: `${BOT_NAME} • Keep building 🧸` })] });
}

async function handleTip(message) {
  consumeCooldown("tip", message.author.id);
  await respond(message, { embeds: [brandEmbed("💡 Scripting Tip").setDescription(TIPS[Math.floor(Math.random() * TIPS.length)]).setFooter({ text: `Use ${PREFIX}tip again for another one.` })] });
}

async function handleMeme(message) {
  consumeCooldown("meme", message.author.id);
  try {
    const res = await fetch("https://meme-api.com/gimme/wholesomememes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();
    if (m.nsfw || m.spoiler) throw new Error("filtered");
    await respond(message, { embeds: [brandEmbed(m.title || "Meme").setURL(m.postLink).setImage(m.url).setFooter({ text: `r/${m.subreddit} • 👍 ${m.ups || 0}` })] });
  } catch {
    await respond(message, { embeds: [errorEmbed("Meme Unavailable").setDescription("Couldn't grab a meme right now.")] });
  }
}

async function handle8Ball(message, args) {
  consumeCooldown("8ball", message.author.id);
  const question = args.join(" ").trim();
  if (!question) return respond(message, { embeds: [warnEmbed("Missing Question").setDescription(`\`${PREFIX}8ball <question>\``)] });
  const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
  await respond(message, { embeds: [brandEmbed("🎱 Magic 8-Ball").addFields({ name: "❓ Question", value: question.slice(0, 1000) }, { name: "🎱 Answer", value: `**${answer}**` }).setFooter({ text: `Asked by ${message.author.tag}` })] });
}

async function handleRate(message, args) {
  consumeCooldown("rate", message.author.id);
  const thing = args.join(" ").trim();
  if (!thing) return respond(message, { embeds: [warnEmbed("Missing Input").setDescription(`\`${PREFIX}rate <thing>\``)] });
  const score = Math.floor(Math.random() * 11);
  const bar   = "█".repeat(score) + "░".repeat(10 - score);
  const emoji = score >= 8 ? "🔥" : score >= 5 ? "😊" : score >= 3 ? "😐" : "💀";
  await respond(message, { embeds: [brandEmbed("📊 Rating").setDescription(`${emoji} I rate **${thing}** a **${score}/10**\n\`${bar}\``).setFooter({ text: `Rated by ${BOT_NAME}` })] });
}

async function handleDaily(message) {
  const userId = message.author.id;
  const last   = data.dailyClaims[userId] || 0;
  const now    = Date.now();
  const DAY_MS = 86_400_000;
  const elapsed = now - last;
  if (elapsed < DAY_MS) {
    const remaining = DAY_MS - elapsed;
    const h = Math.floor(remaining / 3_600_000), m = Math.floor((remaining % 3_600_000) / 60_000);
    return respond(message, { embeds: [warnEmbed("⏰ Already Claimed").setDescription(`Come back in **${h}h ${m}m**.`).setFooter({ text: "Daily rewards reset every 24 hours." })] });
  }
  data.dailyClaims[userId] = now;
  const reward = DAILY_REWARDS[Math.floor(Math.random() * DAILY_REWARDS.length)];
  const eco = getEconomy(userId);
  eco.coins = (eco.coins || 0) + reward.coins;
  saveData();
  await respond(message, { embeds: [successEmbed("🎁 Daily Reward Claimed!").setDescription(`${reward.text}\n\n**+${reward.coins} 🪙 coins** added to your balance!`).setThumbnail(message.author.displayAvatarURL()).setFooter({ text: "Come back tomorrow for another reward!" }).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  ── TICKET SYSTEM (reworked) ──
// ─────────────────────────────────────────────

async function handleTicket(message) {
  // Trigger a type selection via ephemeral reply isn't possible with prefix commands
  // so we show a prompt explaining to use the panel
  return respond(message, {
    embeds: [brandEmbed("🎫 Open a Ticket")
      .setDescription("Please use the **ticket panel** to open a ticket — choose from:\n\n📦 **Order Something** — Commission a script\n🤝 **Partnership** — Partner with our server\n❓ **General Inquiry** — Ask a question or get help\n\nIf there's no panel visible, ask a staff member to post one with `s!ticketpanel`.")
      .setFooter({ text: `${BOT_NAME} Ticket System` })],
  });
}

async function handleTicketPanel(message) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageChannels))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Channels**.")] });

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧸 ${BOT_NAME} — Open a Ticket`)
    .setDescription(
      "Need help or want to work with us? Click the button below that best describes your need!\n\n" +
      "📦 **Order Something** — Commission a script or system\n" +
      "🤝 **Partnership** — Interested in partnering with us?\n" +
      "❓ **General Inquiry** — Questions, support, or anything else"
    )
    .setFooter({ text: `${BOT_NAME} • Ticket System v2` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_order")
      .setLabel("Order Something")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📦"),
    new ButtonBuilder()
      .setCustomId("ticket_partnership")
      .setLabel("Partnership")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🤝"),
    new ButtonBuilder()
      .setCustomId("ticket_inquiry")
      .setLabel("General Inquiry")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❓"),
  );

  await respond(message, { embeds: [embed], components: [row] });
}

async function buildTranscript(channel) {
  const all = [];
  let lastId;
  for (let i = 0; i < 10; i++) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const batch = await channel.messages.fetch(opts);
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
    "─".repeat(40),
    "",
  ];
  for (const m of all) {
    const ts = new Date(m.createdTimestamp).toISOString();
    const author = `${m.author.tag} (${m.author.id})`;
    let body = m.content || "";
    if (m.embeds?.length)    for (const e of m.embeds)               body += `\n  [Embed] ${e.title || ""}${e.description ? " — " + e.description.replace(/\n/g, " ") : ""}`;
    if (m.attachments?.size) for (const a of m.attachments.values()) body += `\n  [Attachment] ${a.url}`;
    lines.push(`[${ts}] ${author}: ${body || "(no content)"}\n`);
  }
  return lines.join("\n");
}

async function handleClose(message) {
  if (!message.channel.name?.startsWith("ticket-"))
    return respond(message, { embeds: [errorEmbed("Wrong Channel").setDescription("This command only works inside a ticket channel.")] });

  // Show a modal asking for close reason
  const modal = new ModalBuilder()
    .setCustomId("ticket_close_reason_cmd")
    .setTitle("Close Ticket");
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("close_reason")
        .setLabel("Reason for closing this ticket")
        .setPlaceholder("e.g. Issue resolved, commission completed, spam, etc.")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(true)
    )
  );

  // We can only show a modal in response to an interaction, not a message command.
  // So for the s!close command, we collect a reason differently.
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/).slice(1);
  const reason = args.join(" ").trim();
  if (!reason) {
    return respond(message, {
      embeds: [warnEmbed("Provide a Reason")
        .setDescription(`Usage: \`${PREFIX}close <reason>\`\n**Example:** \`${PREFIX}close Commission completed!\`\n\nOr use the **Close Ticket** button inside the ticket.`)],
    });
  }

  await closeTicketChannel(message.channel, message.member || message.author, reason, message.guild);
}

async function closeTicketChannel(channel, closer, reason, guild) {
  // Find the ticket owner from channel topic or name
  const safeName = channel.name.replace("ticket-", "");
  let ownerId = null;
  // Try to find owner via permission overwrites
  for (const [id, overwrite] of channel.permissionOverwrites.cache) {
    if (overwrite.type === 1) { // member overwrite
      ownerId = id;
      break;
    }
  }

  await channel.send({ embeds: [infoEmbed("📝 Generating Transcript…").setDescription("Please wait…")] });

  let transcript = "";
  try { transcript = await buildTranscript(channel); }
  catch (err) { transcript = `Transcript failed: ${err.message}\nClosed by ${closer.user?.tag || closer.tag} at ${new Date().toISOString()}`; }

  const transcriptBuffer = Buffer.from(transcript, "utf8");
  const transcriptFile = { attachment: transcriptBuffer, name: `${channel.name}-transcript.txt` };

  // Send transcript to staff channel
  const settings = getGuildSettings(guild.id);
  const targetChannelId = settings.transcriptsChannelId || data.modLogChannels[guild.id];
  if (targetChannelId) {
    try {
      const target = await guild.channels.fetch(targetChannelId).catch(() => null);
      if (target?.isTextBased()) {
        await target.send({
          embeds: [brandEmbed("🎟️ Ticket Closed")
            .addFields(
              { name: "📁 Channel",    value: `#${channel.name}` },
              { name: "🔒 Closed by", value: closer.user?.tag || closer.tag, inline: true },
              { name: "📋 Reason",    value: reason, inline: true },
            )
            .setTimestamp()],
          files: [transcriptFile],
        });
      }
    } catch (err) { console.error("Transcript send to staff channel failed:", err); }
  }

  // Send transcript to ticket owner's DMs
  if (ownerId) {
    try {
      const owner = await client.users.fetch(ownerId).catch(() => null);
      if (owner) {
        await owner.send({
          embeds: [brandEmbed("🎟️ Your Ticket Has Been Closed")
            .setDescription(`Your ticket **#${channel.name}** has been closed.\n\n**Reason:** ${reason}\n\nA transcript of the ticket is attached below for your records.`)
            .setFooter({ text: `${BOT_NAME} • Thank you!` })
            .setTimestamp()],
          files: [{ attachment: Buffer.from(transcript, "utf8"), name: `${channel.name}-transcript.txt` }],
        });
      }
    } catch {
      // DMs might be closed — that's okay
    }
  }

  data.stats.ticketsClosed = (data.stats.ticketsClosed || 0) + 1;
  saveData();

  await channel.send({ embeds: [warnEmbed("🔒 Ticket Closing").setDescription(`**Reason:** ${reason}\n\nThis channel will be deleted in **5 seconds**.`)] });
  setTimeout(() => channel.delete(`Closed by ${closer.user?.tag || closer.tag}: ${reason}`).catch(console.error), 5000);
}

async function handleAddNote(message, args) {
  if (!message.channel.name?.startsWith("ticket-"))
    return respond(message, { embeds: [errorEmbed("Wrong Channel")] });
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, { embeds: [errorEmbed("No Permission")] });
  const text = args.join(" ").trim();
  if (!text) return respond(message, { embeds: [warnEmbed("Missing Note").setDescription(`\`${PREFIX}addnote <text>\``)] });
  await respond(message, { embeds: [new EmbedBuilder().setTitle("📝 Internal Staff Note").setDescription(text).setColor(NOTE_COLOR).setFooter({ text: `Note by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() }).setTimestamp()] });
}

async function openTicketForUser(channel, member, ticketType, formAnswers) {
  const guild = channel.guild;
  if (!guild || !member) return { ok: false, error: "Tickets can only be created inside a server." };

  const typeLabels = { order: "Order", partnership: "Partnership", inquiry: "Inquiry" };
  const typeLabel = typeLabels[ticketType] || "Ticket";
  const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "user";
  const channelName = `ticket-${safeName}`;

  const existing = guild.channels.cache.find(c => c.name === channelName && c.type === ChannelType.GuildText);
  if (existing) return { ok: false, error: `You already have an open ticket: <#${existing.id}>`, channel: existing };

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (client.user) overwrites.push({ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] });
  guild.roles.cache.forEach(role => {
    if (role.permissions.has(PermissionFlagsBits.ManageMessages) && !role.managed)
      overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });
  });

  let created;
  try {
    created = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `[${typeLabel}] Support ticket for ${member.user.tag}`,
      permissionOverwrites: overwrites,
      reason: `Ticket (${typeLabel}) by ${member.user.tag}`,
    });
  } catch (err) {
    console.error("Failed to create ticket:", err);
    return { ok: false, error: "I couldn't create your ticket. Make sure I have **Manage Channels**." };
  }

  data.stats.ticketsOpened = (data.stats.ticketsOpened || 0) + 1;
  saveData();

  const isReturning = hasOrdered(member.id);

  // Close button
  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close_button")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  // Build the details embed based on ticket type
  let detailsEmbed;

  if (ticketType === "order") {
    const typeIcon = { "Custom Script": "🛠️", "Full System": "⚙️", "Code Review": "🔍", "Bug Fix": "🐛", "Other": "📋" };
    detailsEmbed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle("📦 New Order Ticket")
      .addFields(
        { name: "👤 Roblox Username",  value: formAnswers.username    || "—" },
        { name: "🛠️ Service Needed",  value: formAnswers.service     || "—" },
        { name: "📝 Description",     value: formAnswers.description || "—" },
        { name: "💰 Budget",          value: formAnswers.budget      || "—", inline: true },
        { name: "💳 Payment Method",  value: formAnswers.payment     || "—", inline: true },
      )
      .setFooter({ text: `Order Ticket • ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
      .setTimestamp();

  } else if (ticketType === "partnership") {
    detailsEmbed = new EmbedBuilder()
      .setColor(SUCCESS_COLOR)
      .setTitle("🤝 New Partnership Ticket")
      .addFields(
        { name: "🏠 Server Name",        value: formAnswers.serverName   || "—" },
        { name: "🔗 Invite Link",        value: formAnswers.invite       || "—" },
        { name: "👥 Member Count",       value: formAnswers.memberCount  || "—", inline: true },
        { name: "🎯 Server Focus",       value: formAnswers.focus        || "—", inline: true },
        { name: "🤝 What We'd Offer",    value: formAnswers.offering     || "—" },
      )
      .setFooter({ text: `Partnership Ticket • ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
      .setTimestamp();

  } else { // inquiry
    detailsEmbed = new EmbedBuilder()
      .setColor(INFO_COLOR)
      .setTitle("❓ New General Inquiry Ticket")
      .addFields(
        { name: "👤 Name / Username",  value: formAnswers.name        || "—" },
        { name: "❓ Question/Topic",   value: formAnswers.topic       || "—" },
        { name: "📝 Details",          value: formAnswers.details     || "—" },
        { name: "⚡ Urgency",          value: formAnswers.urgency     || "—", inline: true },
      )
      .setFooter({ text: `General Inquiry • ${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
      .setTimestamp();
  }

  if (isReturning && ticketType === "order") {
    detailsEmbed.addFields({ name: "🎟️ Loyalty Discount", value: "✅ Returning customer — qualifies for **5% off**!" });
  }

  await created.send({
    content: `<@${member.id}> — A staff member will be with you shortly! 💗`,
    embeds: [detailsEmbed],
    components: [closeRow],
  });

  return { ok: true, channel: created };
}

// ─────────────────────────────────────────────
//  Portfolio
// ─────────────────────────────────────────────
const IMAGE_EXT_RE  = /\.(png|jpe?g|gif|webp|bmp)(?:\?|$)/i;
const VIDEO_EXT_RE  = /\.(mov|mp4|webm|m4v|mkv)(?:\?|$)/i;
const GENERIC_URL_RE = /^https?:\/\/\S+$/i;
const MEDIA_HOSTS   = ["cdn.discordapp.com","media.discordapp.net","i.imgur.com","imgur.com","media.tenor.com","tenor.com","youtube.com","youtu.be"];

function looksLikeMediaUrl(url) {
  if (!url) return false;
  if (IMAGE_EXT_RE.test(url) || VIDEO_EXT_RE.test(url)) return true;
  try { const u = new URL(url); return MEDIA_HOSTS.some(h => u.hostname.endsWith(h)); } catch { return false; }
}
function isVideoUrl(url) { return VIDEO_EXT_RE.test(url || ""); }

async function handlePortfolio(message, args) {
  if (!data.portfolio.length) return respond(message, { embeds: [brandEmbed("🎨 Portfolio").setDescription(`No work added yet. Staff can use \`${PREFIX}addwork <url> [title]\`.`)] });
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
      { name: "🆔 ID",   value: `#${work.id}`,                               inline: true },
      { name: "📂 Type", value: isVid ? "🎥 Video" : "🖼️ Image",             inline: true },
      { name: "📅 Added", value: when,                                        inline: true },
    )
    .setFooter({ text: `Page ${page} of ${total} • Use ${PREFIX}work <page> to browse` });
  if (!isVid) { embed.setImage(work.url); await respond(message, { embeds: [embed] }); }
  else { embed.setDescription(`[▶️ Click here to open the video](${work.url})`); await respond(message, { content: work.url, embeds: [embed] }); }
}

async function handleAddWork(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Server**.")] });
  let url = null, title = "";
  if (args[0] && GENERIC_URL_RE.test(args[0])) { url = args[0]; title = args.slice(1).join(" ").trim(); }
  else { const a = message.attachments?.find(a => a.contentType?.startsWith("image/") || IMAGE_EXT_RE.test(a.url)); if (a) { url = a.url; title = args.join(" ").trim(); } }
  if (!url) return respond(message, { embeds: [warnEmbed("Missing URL").setDescription(`\`${PREFIX}addwork <url> [title]\` — or attach an image.`)] });
  if (!looksLikeMediaUrl(url)) return respond(message, { embeds: [errorEmbed("Invalid URL").setDescription("That doesn't look like a direct media link.")] });
  const work = { id: data.nextWorkId++, url, title: title || null, addedBy: message.author.tag, addedById: message.author.id, timestamp: new Date().toISOString() };
  data.portfolio.push(work);
  saveData();
  const embed = successEmbed(`✅ Portfolio Entry #${work.id} Added`).setDescription(work.title || `View it with \`${PREFIX}work\`.`).setFooter({ text: `Added by ${message.author.tag}` }).setTimestamp();
  if (!isVideoUrl(work.url)) embed.setImage(work.url);
  await respond(message, { embeds: [embed] });
}

async function handleRemoveWork(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission")] });
  const id = Number(args[0]);
  if (!Number.isFinite(id)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}removework <id>\``)] });
  const idx = data.portfolio.findIndex(w => w.id === id);
  if (idx === -1) return respond(message, { embeds: [errorEmbed("Not Found").setDescription(`No entry with ID #${id}.`)] });
  const removed = data.portfolio.splice(idx, 1)[0];
  saveData();
  await respond(message, { embeds: [warnEmbed(`🗑️ Removed Portfolio Entry #${removed.id}`).setDescription(removed.title || "(no title)").setFooter({ text: `Removed by ${message.author.tag}` }).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Moderation commands
// ─────────────────────────────────────────────
async function handleBan(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.BanMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return respond(message, { embeds: [errorEmbed("Missing Bot Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}ban <@user> <reason>\``)] });
  if (userId === message.author.id || userId === client.user.id) return respond(message, { embeds: [errorEmbed("Error").setDescription("Can't ban yourself or the bot.")] });
  const reason = args.slice(1).join(" ").trim() || "No reason provided";
  try { await message.guild.bans.create(userId, { reason: `By ${message.author.tag}: ${reason}` }); }
  catch { return respond(message, { embeds: [errorEmbed("Ban Failed")] }); }
  const embed = errorEmbed("🔨 User Banned").addFields({ name: "👤 User", value: `<@${userId}>` }, { name: "📋 Reason", value: reason }, { name: "🛡️ Moderator", value: message.author.tag }).setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleKick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.KickMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}kick <@user> [reason]\``)] });
  if (userId === message.author.id || userId === client.user.id) return respond(message, { embeds: [errorEmbed("Error")] });
  const reason = args.slice(1).join(" ").trim() || "No reason provided";
  let target;
  try { target = await message.guild.members.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); }
  if (!target.kickable) return respond(message, { embeds: [errorEmbed("Can't Kick")] });
  try { await target.kick(`By ${message.author.tag}: ${reason}`); } catch { return respond(message, { embeds: [errorEmbed("Kick Failed")] }); }
  const embed = warnEmbed("👢 User Kicked").addFields({ name: "👤 User", value: `<@${userId}>` }, { name: "📋 Reason", value: reason }, { name: "🛡️ Moderator", value: message.author.tag }).setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleMute(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId || !args[1]) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}mute <@user> <time> [reason]\``)] });
  if (userId === message.author.id || userId === client.user.id) return respond(message, { embeds: [errorEmbed("Error")] });
  const ms = parseDuration(args[1]);
  if (!ms) return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Use `30s`, `10m`, `2h`, `1d`.")] });
  if (ms > 28 * TIME_UNITS.d) return respond(message, { embeds: [errorEmbed("Too Long").setDescription("Max 28 days.")] });
  const reason = args.slice(2).join(" ").trim() || "No reason provided";
  let target;
  try { target = await message.guild.members.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); }
  if (!target.moderatable) return respond(message, { embeds: [errorEmbed("Can't Mute")] });
  try { await target.timeout(ms, `By ${message.author.tag}: ${reason}`); } catch { return respond(message, { embeds: [errorEmbed("Mute Failed")] }); }
  const embed = warnEmbed("🔇 User Muted").addFields({ name: "👤 User", value: `<@${userId}>` }, { name: "⏱️ Duration", value: formatDuration(ms), inline: true }, { name: "📋 Reason", value: reason, inline: true }, { name: "🛡️ Moderator", value: message.author.tag }).setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleWarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}warn <@user> <reason>\``)] });
  const reason = args.slice(1).join(" ").trim();
  if (!reason) return respond(message, { embeds: [errorEmbed("Missing Reason")] });
  const warn = { id: data.nextWarnId++, reason, moderatorId: message.author.id, at: new Date().toISOString() };
  if (!data.warns[userId]) data.warns[userId] = [];
  data.warns[userId].push(warn);
  saveData();
  const total = data.warns[userId].length;
  const embed = warnEmbed("⚠️ User Warned").addFields({ name: "👤 User", value: `<@${userId}>`, inline: true }, { name: "🆔 Warning ID", value: `#${warn.id}`, inline: true }, { name: "📊 Total", value: `${total}`, inline: true }, { name: "📋 Reason", value: reason }, { name: "🛡️ Moderator", value: message.author.tag }).setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
  try { const u = await client.users.fetch(userId); await u.send({ embeds: [warnEmbed(`⚠️ You were warned in ${message.guild.name}`).addFields({ name: "📋 Reason", value: reason }, { name: "📊 Total Warnings", value: `${total}` }).setTimestamp()] }); } catch {}
}

async function handleWarns(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}warns <@user>\``)] });
  const list = data.warns[userId] || [];
  const embed = new EmbedBuilder().setTitle(`⚠️ Warning History — ${list.length} total`).setDescription(`<@${userId}>`).setColor(list.length ? WARN_COLOR : SUCCESS_COLOR);
  if (!list.length) embed.addFields({ name: "✅ Clean Record", value: "No warnings on file." });
  else list.slice(-10).forEach(w => embed.addFields({ name: `#${w.id} • ${w.at ? `<t:${Math.floor(new Date(w.at).getTime()/1000)}:R>` : "—"}`, value: `**Reason:** ${w.reason || "—"}\n**By:** <@${w.moderatorId || "—"}>` }));
  if (list.length > 10) embed.setFooter({ text: `Showing most recent 10 of ${list.length}` });
  await respond(message, { embeds: [embed] });
}

async function handleUnwarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const id = Number(args[0]);
  if (!Number.isFinite(id)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}unwarn <id>\``)] });
  let removed = null, removedFrom = null;
  for (const [uid, list] of Object.entries(data.warns)) {
    const idx = list.findIndex(w => w.id === id);
    if (idx !== -1) { removed = list[idx]; removedFrom = uid; list.splice(idx, 1); if (!list.length) delete data.warns[uid]; break; }
  }
  if (!removed) return respond(message, { embeds: [errorEmbed("Not Found").setDescription(`No warning #${id} found.`)] });
  saveData();
  await respond(message, { embeds: [successEmbed("✅ Warning Removed").addFields({ name: "🆔 Warning ID", value: `#${id}`, inline: true }, { name: "👤 User", value: `<@${removedFrom}>`, inline: true }, { name: "📋 Original Reason", value: removed.reason || "—" }, { name: "🛡️ Removed By", value: message.author.tag }).setTimestamp()] });
}

async function handlePurge(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const count = parseInt(args[0], 10);
  if (!Number.isFinite(count) || count < 1 || count > 100) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}purge <1-100>\``)] });
  try {
    const deleted = await message.channel.bulkDelete(count, true);
    const notice = await message.channel.send({ embeds: [successEmbed("🧹 Purged").setDescription(`Deleted **${deleted.size}** message(s).`).setFooter({ text: `By ${message.author.tag}` })] });
    setTimeout(() => notice.delete().catch(() => {}), 5000);
    await logMod(message.guild, warnEmbed("🧹 Messages Purged").addFields({ name: "💬 Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "🔢 Count", value: `${deleted.size}`, inline: true }, { name: "🛡️ Moderator", value: message.author.tag }).setTimestamp());
  } catch { await respond(message, { embeds: [errorEmbed("Purge Failed").setDescription("Messages older than 14 days can't be bulk-deleted.")] }); }
}

// ─────────────────────────────────────────────
//  Admin
// ─────────────────────────────────────────────
async function handleAddOrder(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (args.length < 2) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}addorder <@user> <details>\``)] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [errorEmbed("Invalid User")] });
  const details = args.slice(1).join(" ").trim();
  if (!details) return respond(message, { embeds: [errorEmbed("Missing Details")] });
  const now = new Date().toISOString();
  const order = { id: data.nextOrderId++, userId, details, status: "pending", createdAt: now, updatedAt: now, createdBy: message.author.id };
  data.orders.push(order);
  data.stats.ordersCreated = (data.stats.ordersCreated || 0) + 1;
  saveData();
  await respond(message, { embeds: [successEmbed(`✅ Order #${order.id} Created`).addFields({ name: "👤 Customer", value: `<@${order.userId}>` }, { name: "📝 Details", value: order.details }).setFooter({ text: `Added by ${message.author.tag}` }).setTimestamp()] });
}

async function handleComplete(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (!args[0]) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}complete <id>\``)] });
  const order = findOrder(args[0]);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found")] });
  if (order.status === "completed") return respond(message, { embeds: [warnEmbed("Already Done")] });
  order.status = "completed"; order.updatedAt = new Date().toISOString();
  data.stats.ordersCompleted = (data.stats.ordersCompleted || 0) + 1;
  saveData();
  await respond(message, { embeds: [successEmbed(`✅ Order #${order.id} Complete`).addFields({ name: "👤 Customer", value: `<@${order.userId}>` }, { name: "📝 Details", value: order.details }).setFooter({ text: `By ${message.author.tag}` }).setTimestamp()] });
}

async function handleBlacklist(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}blacklist <@user>\``)] });
  const idx = data.blacklist.indexOf(userId);
  let action;
  if (idx === -1) { data.blacklist.push(userId); action = "added to"; } else { data.blacklist.splice(idx, 1); action = "removed from"; }
  saveData();
  const embed = new EmbedBuilder().setTitle("🚫 Blacklist Updated").setDescription(`<@${userId}> has been **${action}** the blacklist.`).setColor(idx === -1 ? ERROR_COLOR : SUCCESS_COLOR).setFooter({ text: `By ${message.author.tag}` }).setTimestamp();
  await respond(message, { embeds: [embed] });
  await logMod(message.guild, embed);
}

async function handleSetLog(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (!args[0]) {
    if (data.modLogChannels[message.guild.id]) { delete data.modLogChannels[message.guild.id]; saveData(); return respond(message, { embeds: [warnEmbed("📓 Mod Log Disabled")] }); }
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}setlog #channel\``)] });
  }
  const m = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d{17,20})$/);
  if (!m) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}setlog #channel\``)] });
  const ch = await message.guild.channels.fetch(m[1]).catch(() => null);
  if (!ch?.isTextBased()) return respond(message, { embeds: [errorEmbed("Invalid Channel")] });
  data.modLogChannels[message.guild.id] = m[1];
  saveData();
  const embed = successEmbed("📓 Mod Log Set").setDescription(`Events will be logged in <#${m[1]}>.`).setFooter({ text: `By ${message.author.tag}` });
  await respond(message, { embeds: [embed] });
  await ch.send({ embeds: [successEmbed("✅ Mod Log Connected").setDescription(`This channel is now receiving mod logs from **${BOT_NAME}**.`)] });
}

async function handleSetReviews(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) { delete settings.reviewsChannelId; saveData(); return respond(message, { embeds: [successEmbed("✅ Reviews Channel Cleared")] }); }
  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}setreviews #channel\``)] });
  settings.reviewsChannelId = channelId;
  saveData();
  return respond(message, { embeds: [successEmbed("✅ Reviews Channel Set").setDescription(`Reviews will be posted in <#${channelId}>.`)] });
}

async function handleSetTranscripts(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) { delete settings.transcriptsChannelId; saveData(); return respond(message, { embeds: [successEmbed("✅ Transcripts Channel Cleared")] }); }
  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}settranscripts #channel\``)] });
  settings.transcriptsChannelId = channelId;
  saveData();
  return respond(message, { embeds: [successEmbed("✅ Transcripts Channel Set").setDescription(`Transcripts will be saved in <#${channelId}>.`)] });
}

async function handleSay(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const text = args.join(" ").trim();
  if (!text) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}say <message>\``)] });
  try { await message.delete(); } catch {}
  await message.channel.send({ content: text, allowedMentions: { parse: ["users"] } });
}

// ─────────────────────────────────────────────
//  Command map
// ─────────────────────────────────────────────
const commands = {
  help: handleHelp, info: handleInfo, status: handleStatus, ping: handlePing,
  rules: handleRules, prices: handlePrices, uptime: handleUptime, discount: handleDiscount,
  services: handleServices, queue: handleQueue, statusorder: handleStatusOrder,
  ticket: handleTicket, pay: handlePay, payment: handlePay,
  portfolio: handlePortfolio, work: handleWork, works: handlePortfolio,
  addwork: handleAddWork, removework: handleRemoveWork,
  script: handleScript, snippet: handleSnippet, docs: handleDocs, debug: handleDebug,
  userinfo: handleUserInfo, serverinfo: handleServerInfo, avatar: handleAvatar,
  banner: handleBanner, servericon: handleServerIcon, stats: handleStats,
  color: handleColor, calc: handleCalc,
  review: handleReview, vouch: handleVouch,
  level: handleLevel, rank: handleRank, leaderboard: handleLeaderboard, lb: handleLeaderboard,
  balance: handleBalance, bal: handleBalance,
  shop: handleShop, buy: handleBuy,
  daily: handleDaily, givecoins: handleGiveCoins,
  invites: handleMyInvites, myinvites: handleMyInvites,
  inviteleaderboard: handleInviteLeaderboard, invitelb: handleInviteLeaderboard,
  quote: handleQuote, tip: handleTip, meme: handleMeme,
  "8ball": handle8Ball, rate: handleRate,
  coinflip: handleCoinFlip, flip: handleCoinFlip,
  roll: handleRoll, dice: handleRoll,
  rps: handleRPS, trivia: handleTrivia,
  remindme: handleReminder, reminder: handleReminder,
  ban: handleBan, kick: handleKick, mute: handleMute,
  warn: handleWarn, warns: handleWarns, unwarn: handleUnwarn, purge: handlePurge,
  lock: handleLock, unlock: handleUnlock, slowmode: handleSlowmode, nick: handleNick,
  ticketpanel: handleTicketPanel, close: handleClose, addnote: handleAddNote,
  addorder: handleAddOrder, complete: handleComplete, announce: handleAnnounce,
  partner: handlePartner, blacklist: handleBlacklist, setlog: handleSetLog,
  setreviews: handleSetReviews, settranscripts: handleSetTranscripts, say: handleSay,
  poll: handlePoll, giveaway: handleGiveaway, embed: handleEmbed,
};

// ─────────────────────────────────────────────
//  messageCreate
// ─────────────────────────────────────────────
const ADMIN_BYPASS = new Set(["blacklist"]);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (alreadyHandled(message.id)) return;

  // ── Sticky message ──
  if (message.channel.id === STICKY_CHANNEL_ID && !message.author.bot) {
    refreshSticky(message.channel).catch(() => {});
  }

  // ── Passive XP & coins ──
  if (!message.content.startsWith(PREFIX)) {
    handleXpGrant(message).catch(() => {});
    handleCoinGrant(message).catch(() => {});
    // Trivia answer check
    if (data.triviaActive[message.channel.id]) {
      const trivia = data.triviaActive[message.channel.id];
      const answer = message.content.trim().toLowerCase();
      if (trivia.answers.some(a => answer.includes(a.toLowerCase()))) {
        const eco = getEconomy(message.author.id);
        eco.coins = (eco.coins || 0) + trivia.rewardCoins;
        delete data.triviaActive[message.channel.id];
        saveData();
        await message.reply({
          embeds: [successEmbed("🧠 Correct!")
            .setDescription(`<@${message.author.id}> got it right! The answer was **${trivia.answers[0]}**.\n\n**+${trivia.rewardCoins} 🪙 coins** added to your balance!`)
            .setTimestamp()],
        }).catch(() => {});
      }
    }
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
      await message.channel.send({ embeds: [errorEmbed("🚫 Blacklisted").setDescription("You are not allowed to use this bot.")] }).catch(() => {});
      return;
    }
  }

  // Cooldown check
  if (COOLDOWNS_MS[commandName]) {
    const wait = checkCooldown(commandName, message.author.id);
    if (wait > 0) {
      await message.channel.send({
        embeds: [warnEmbed("⏰ Slow Down!")
          .setDescription(`You can use \`${PREFIX}${commandName}\` again in **${wait} second${wait === 1 ? "" : "s"}**.`)
          .setFooter({ text: "Cooldowns help keep the channel clean." })],
      }).catch(() => {});
      return;
    }
    consumeCooldown(commandName, message.author.id);
  }

  try { await handler(message, args); }
  catch (err) {
    console.error(`Error handling ${PREFIX}${commandName}:`, err);
    await sendErrorLog(err, `Command: ${PREFIX}${commandName} in guild ${message.guild?.id}`);
    await message.channel.send({ embeds: [errorEmbed("Something Went Wrong").setDescription("An unexpected error occurred. The developer has been notified.")] }).catch(() => {});
  }
});

// ─────────────────────────────────────────────
//  guildCreate / guildDelete — log to home guild
// ─────────────────────────────────────────────
client.on("guildCreate", async (guild) => {
  console.log(`Joined new guild: ${guild.name} (${guild.id})`);
  await sendSetupMessage(guild);
  await cacheInvites(guild).catch(() => {});

  // Log to home guild
  try {
    const homeGuild = client.guilds.cache.get(HOME_GUILD_ID);
    if (homeGuild) {
      const ch = await homeGuild.channels.fetch(GUILD_JOIN_LOG_CHANNEL).catch(() => null);
      if (ch?.isTextBased()) {
        const owner = await client.users.fetch(guild.ownerId).catch(() => null);
        await ch.send({
          embeds: [successEmbed("✅ Bot Joined a New Server")
            .setThumbnail(guild.iconURL({ size: 256 }) || null)
            .addFields(
              { name: "🏠 Server",    value: `${guild.name}`,                                              inline: true },
              { name: "🆔 ID",        value: guild.id,                                                     inline: true },
              { name: "👑 Owner",     value: owner ? `${owner.tag} (${owner.id})` : guild.ownerId,         inline: true },
              { name: "👥 Members",   value: `${guild.memberCount}`,                                        inline: true },
              { name: "📅 Created",   value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,          inline: true },
              { name: "🌐 Total Servers", value: `${client.guilds.cache.size}`,                             inline: true },
            )
            .setTimestamp()],
        });
      }
    }
  } catch (err) { console.error("Guild join log failed:", err); }
});

client.on("guildDelete", async (guild) => {
  console.log(`Left guild: ${guild.name} (${guild.id})`);

  // Log to home guild
  try {
    const homeGuild = client.guilds.cache.get(HOME_GUILD_ID);
    if (homeGuild) {
      const ch = await homeGuild.channels.fetch(GUILD_LEAVE_LOG_CHANNEL).catch(() => null);
      if (ch?.isTextBased()) {
        await ch.send({
          embeds: [errorEmbed("❌ Bot Left / Removed from a Server")
            .setThumbnail(guild.iconURL({ size: 256 }) || null)
            .addFields(
              { name: "🏠 Server",        value: `${guild.name}`,                               inline: true },
              { name: "🆔 ID",            value: guild.id,                                      inline: true },
              { name: "👥 Members",       value: `${guild.memberCount ?? "Unknown"}`,             inline: true },
              { name: "🌐 Total Servers", value: `${client.guilds.cache.size}`,                  inline: true },
            )
            .setTimestamp()],
        });
      }
    }
  } catch (err) { console.error("Guild leave log failed:", err); }
});

// ─────────────────────────────────────────────
//  Invite tracking
// ─────────────────────────────────────────────
client.on("inviteCreate", async (invite) => {
  if (!invite.guild) return;
  if (!data.inviteCache[invite.guild.id]) data.inviteCache[invite.guild.id] = {};
  data.inviteCache[invite.guild.id][invite.code] = invite.uses || 0;
  saveData();
});

client.on("inviteDelete", async (invite) => {
  if (!invite.guild) return;
  if (data.inviteCache[invite.guild.id]) {
    delete data.inviteCache[invite.guild.id][invite.code];
    saveData();
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild;
    const newInvites = await guild.invites.fetch().catch(() => null);
    if (newInvites) {
      const cached = data.inviteCache[guild.id] || {};
      let inviterId = null;
      newInvites.forEach(inv => {
        if ((inv.uses || 0) > (cached[inv.code] || 0)) inviterId = inv.inviter?.id;
        cached[inv.code] = inv.uses || 0;
      });
      data.inviteCache[guild.id] = cached;

      if (inviterId) {
        if (!data.invites[guild.id]) data.invites[guild.id] = {};
        if (!data.invites[guild.id][inviterId]) data.invites[guild.id][inviterId] = { invited: 0, left: 0 };
        data.invites[guild.id][inviterId].invited++;
      }
      saveData();
    }

    await logMod(guild, successEmbed("📥 Member Joined")
      .addFields(
        { name: "👤 User",             value: `<@${member.id}> (${member.user.tag})` },
        { name: "📅 Account Created",  value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp());
  } catch (err) { console.error("guildMemberAdd failed:", err); }
});

client.on("guildMemberRemove", async (member) => {
  try {
    await logMod(member.guild, errorEmbed("📤 Member Left")
      .addFields({ name: "👤 User", value: `<@${member.id}> (${member.user.tag})` })
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp());
  } catch (err) { console.error("guildMemberRemove failed:", err); }
});

// ─────────────────────────────────────────────
//  Logging events
// ─────────────────────────────────────────────
client.on("messageDelete", async (message) => {
  try {
    if (!message.guild || message.author?.bot || message.partial || !message.content) return;
    await logMod(message.guild, errorEmbed("🗑️ Message Deleted")
      .addFields(
        { name: "👤 Author",  value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: "💬 Channel", value: `<#${message.channel.id}>`,                        inline: true },
        { name: "📝 Content", value: message.content.slice(0, 1024) },
      )
      .setTimestamp());
  } catch (err) { console.error("messageDelete log failed:", err); }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    await logMod(newMessage.guild, warnEmbed("✏️ Message Edited")
      .addFields(
        { name: "👤 Author",  value: `<@${newMessage.author.id}> (${newMessage.author.tag})`, inline: true },
        { name: "💬 Channel", value: `<#${newMessage.channel.id}>`,                           inline: true },
        { name: "📄 Before",  value: (oldMessage.content || "—").slice(0, 1024) },
        { name: "✅ After",   value: (newMessage.content || "—").slice(0, 1024) },
        { name: "🔗 Jump",    value: `[Go to message](${newMessage.url})` },
      )
      .setTimestamp());
  } catch (err) { console.error("messageUpdate log failed:", err); }
});

// ─────────────────────────────────────────────
//  ── INTERACTIONS ──
// ─────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    if (data.blacklist.includes(interaction.user.id)) {
      if (interaction.isRepliable()) await interaction.reply({ content: "🚫 You are blacklisted from using this bot.", flags: MessageFlags.Ephemeral });
      return;
    }

    // ── BUTTONS ──
    if (interaction.isButton()) {

      // ── Ticket type buttons ──
      if (["ticket_order", "ticket_partnership", "ticket_inquiry"].includes(interaction.customId)) {
        const typeMap = {
          ticket_order:       { type: "order",       label: "Order a Script" },
          ticket_partnership: { type: "partnership", label: "Partnership Request" },
          ticket_inquiry:     { type: "inquiry",     label: "General Inquiry" },
        };
        const { type, label } = typeMap[interaction.customId];
        let modal;

        if (type === "order") {
          modal = new ModalBuilder().setCustomId("ticket_form_order").setTitle("📦 Order a Script");
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("username").setLabel("Your Roblox Username").setPlaceholder("Your Roblox or preferred username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("service").setLabel("Service needed").setPlaceholder("e.g. Custom script, full game system, UI, datastore").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("description").setLabel("Description of the job").setPlaceholder("Describe what you need in detail — be specific!").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("budget").setLabel("Your budget").setPlaceholder("e.g. $25 USD, 5000 Robux, $50 giftcard").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("payment").setLabel("Payment method").setPlaceholder("Robux, USD (PayPal/CashApp), Giftcards, etc.").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)
            ),
          );

        } else if (type === "partnership") {
          modal = new ModalBuilder().setCustomId("ticket_form_partnership").setTitle("🤝 Partnership Request");
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("serverName").setLabel("Your Server Name").setPlaceholder("e.g. Chill Zone").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("invite").setLabel("Your Server Invite Link").setPlaceholder("e.g. discord.gg/yourcode").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("memberCount").setLabel("Approximate Member Count").setPlaceholder("e.g. 250").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("focus").setLabel("What is your server's focus?").setPlaceholder("e.g. Roblox dev community, gaming, etc.").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("offering").setLabel("What can you offer us?").setPlaceholder("e.g. Shoutout in announcements, mutual promotion, etc.").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)
            ),
          );

        } else { // inquiry
          modal = new ModalBuilder().setCustomId("ticket_form_inquiry").setTitle("❓ General Inquiry");
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("name").setLabel("Your Name / Username").setPlaceholder("What should we call you?").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("topic").setLabel("What is your question/topic?").setPlaceholder("e.g. Pricing question, technical help, etc.").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("details").setLabel("More details").setPlaceholder("Describe your question or inquiry in detail.").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("urgency").setLabel("How urgent is this?").setPlaceholder("e.g. Not urgent, within a few days, ASAP").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false)
            ),
          );
        }

        await interaction.showModal(modal);
        return;
      }

      // ── Close ticket button ──
      if (interaction.customId === "ticket_close_button") {
        const channel = interaction.channel;
        if (!channel?.name?.startsWith("ticket-")) {
          return interaction.reply({ content: "❌ This button only works inside a ticket channel.", flags: MessageFlags.Ephemeral });
        }

        // Check permission: staff or the ticket owner
        const isStaff = isAdmin(interaction.member) || hasPerm(interaction.member, PermissionFlagsBits.ManageChannels);
        const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
        const isOwner  = channel.name === `ticket-${safeName}`;
        if (!isStaff && !isOwner) {
          return interaction.reply({ content: "❌ Only the ticket owner or staff can close this ticket.", flags: MessageFlags.Ephemeral });
        }

        // Show a modal asking for a close reason
        const modal = new ModalBuilder()
          .setCustomId("ticket_close_reason")
          .setTitle("🔒 Close Ticket");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("close_reason")
              .setLabel("Reason for closing")
              .setPlaceholder("e.g. Issue resolved, commission completed, no response...")
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(500)
              .setRequired(true)
          )
        );
        await interaction.showModal(modal);
        return;
      }
    }

    // ── MODAL SUBMITS ──
    if (interaction.isModalSubmit()) {

      // ── Ticket forms ──
      if (["ticket_form_order", "ticket_form_partnership", "ticket_form_inquiry"].includes(interaction.customId)) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const typeMap = {
          ticket_form_order:       "order",
          ticket_form_partnership: "partnership",
          ticket_form_inquiry:     "inquiry",
        };
        const ticketType = typeMap[interaction.customId];

        // Gather answers based on type
        const formAnswers = {};
        if (ticketType === "order") {
          formAnswers.username    = interaction.fields.getTextInputValue("username");
          formAnswers.service     = interaction.fields.getTextInputValue("service");
          formAnswers.description = interaction.fields.getTextInputValue("description");
          formAnswers.budget      = interaction.fields.getTextInputValue("budget");
          formAnswers.payment     = interaction.fields.getTextInputValue("payment");
        } else if (ticketType === "partnership") {
          formAnswers.serverName   = interaction.fields.getTextInputValue("serverName");
          formAnswers.invite       = interaction.fields.getTextInputValue("invite");
          formAnswers.memberCount  = interaction.fields.getTextInputValue("memberCount");
          formAnswers.focus        = interaction.fields.getTextInputValue("focus");
          formAnswers.offering     = interaction.fields.getTextInputValue("offering");
        } else {
          formAnswers.name    = interaction.fields.getTextInputValue("name");
          formAnswers.topic   = interaction.fields.getTextInputValue("topic");
          formAnswers.details = interaction.fields.getTextInputValue("details");
          formAnswers.urgency = interaction.fields.getTextInputValue("urgency");
        }

        const member = interaction.member ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        const result = await openTicketForUser(interaction.channel, member, ticketType, formAnswers);

        if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
        await interaction.editReply({ content: `✅ Your ticket has been created: <#${result.channel.id}>` });
        return;
      }

      // ── Close ticket reason modal ──
      if (interaction.customId === "ticket_close_reason") {
        const reason = interaction.fields.getTextInputValue("close_reason");
        const channel = interaction.channel;

        if (!channel?.name?.startsWith("ticket-")) {
          return interaction.reply({ content: "❌ This is not a ticket channel.", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply({ content: "🔒 Closing ticket..." });

        await closeTicketChannel(channel, interaction.member || interaction.user, reason, interaction.guild);
        return;
      }

      // ── Close ticket reason from command ──
      if (interaction.customId === "ticket_close_reason_cmd") {
        const reason = interaction.fields.getTextInputValue("close_reason");
        const channel = interaction.channel;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply({ content: "🔒 Closing ticket..." });
        await closeTicketChannel(channel, interaction.member || interaction.user, reason, interaction.guild);
        return;
      }
    }

  } catch (err) {
    console.error("Interaction error:", err);
    await sendErrorLog(err, "Interaction handler");
    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Something went wrong. Please try again.", flags: MessageFlags.Ephemeral });
      }
    } catch {}
  }
});

// ─────────────────────────────────────────────
//  Error handlers
// ─────────────────────────────────────────────
client.on("error", async err => {
  console.error("Client error:", err);
  await sendErrorLog(err, "Client error event");
});

process.on("unhandledRejection", async (err) => {
  console.error("Unhandled rejection:", err);
  await sendErrorLog(err, "Unhandled promise rejection");
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught exception:", err);
  await sendErrorLog(err, "Uncaught exception");
});

client.login(TOKEN);

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
  AuditLogEvent,
  ActivityType,
} = require("discord.js");

require("dotenv").config();
const TOKEN = (process.env.DISCORD_TOKEN || "").trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();

if (!TOKEN) { console.error("Missing DISCORD_TOKEN environment variable."); process.exit(1); }
if (!GROQ_API_KEY) console.warn("WARNING: No GROQ_API_KEY found. Ticket AI will be disabled.");

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const PREFIX        = "s!";
const BOT_NAME      = "Snuggles Scripting";
const BOT_VERSION   = "6.0.0";
const BOT_OWNER     = "Snuggles";
const OWNER_ID      = "1354222786268102677"; // SnugglesMcBear user ID

// Colors
const BRAND_COLOR   = 0xff8fb1;
const SUCCESS_COLOR = 0x57f287;
const WARN_COLOR    = 0xfee75c;
const ERROR_COLOR   = 0xed4245;
const NOTE_COLOR    = 0x9b59b6;
const INFO_COLOR    = 0x5865f2;
const GOLD_COLOR    = 0xf1c40f;
const XP_COLOR      = 0x2ecc71;
const AI_COLOR      = 0x7289da;
const DARK_COLOR    = 0x23272a;
const PURPLE_COLOR  = 0x8e44ad;
const CORAL_COLOR   = 0xff7675;
const TEAL_COLOR    = 0x1abc9c;

// Channel / Guild IDs
const ERROR_CHANNEL_ID         = "1497080858048462948";
const LEVELUP_CHANNEL_ID       = "1497080845406699580";
const STICKY_CHANNEL_ID        = "1497080844416975028";
const HOME_GUILD_ID            = "1497048032661864649";
const GUILD_JOIN_LOG_CHANNEL   = "1497080855913300144";
const GUILD_LEAVE_LOG_CHANNEL  = "1497080856941166703";
const ORDER_CHANNEL_ID         = "1500678617594593291";
const FORUM_SUPPORT_CHANNEL_ID = "1497080830323855370";
const PARTNER_AD_CHANNEL_ID    = "1497080839736131655";

const STICKY_MESSAGE_TEXT =
  "✨ **Want to leave a review?**\n\n" +
  "Use `s!review <1-5> <type> | <your message>` to share your experience!\n" +
  "**Example:** `s!review 5 Custom Script | Fast delivery and clean code — highly recommend!`\n\n" +
  "Your feedback means the world to us 💗";

// ─────────────────────────────────────────────
//  Groq models
// ─────────────────────────────────────────────
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

// ─────────────────────────────────────────────
//  XP / Economy config
// ─────────────────────────────────────────────
const XP_PER_MESSAGE   = 15;
const XP_COOLDOWN_MS   = 60_000;
const XP_VARIANCE      = 10;
const BASE_XP_REQUIRED = 100;
const XP_SCALING       = 1.35;
const COINS_PER_MESSAGE = 5;
const COINS_COOLDOWN_MS = 30_000;
const WORK_COOLDOWN_MS  = 3_600_000;

function xpForLevel(level) {
  return Math.floor(BASE_XP_REQUIRED * Math.pow(XP_SCALING, level - 1));
}

const SHOP_ITEMS = [
  { id: "role_color",     name: "🎨 Custom Role Color",   price: 500,  desc: "Request a custom color for your role (staff applies it)." },
  { id: "code_review",    name: "🔍 Code Review Voucher", price: 300,  desc: "Get a free in-depth code review from staff." },
  { id: "priority_queue", name: "⚡ Priority Queue",      price: 750,  desc: "Your next commission gets bumped to the front." },
  { id: "custom_ping",    name: "🔔 VIP Ping",            price: 1000, desc: "Get pinged for exclusive announcements." },
  { id: "badge_og",       name: "🏅 OG Badge",            price: 2000, desc: "Exclusive OG server member badge in your profile." },
];

const WORK_RESPONSES = [
  { text: "You debugged a gnarly script for a client",       coins: [80, 200] },
  { text: "You built a datastore system from scratch",       coins: [100, 250] },
  { text: "You fixed a RemoteEvent security bug",            coins: [60, 150] },
  { text: "You optimized a client-side UI for performance",  coins: [50, 180] },
  { text: "You wrote an admin command system",               coins: [120, 280] },
  { text: "You helped a beginner in the support channel",    coins: [30, 80] },
  { text: "You reviewed and refactored legacy Lua code",     coins: [90, 220] },
  { text: "You built a matchmaking system",                  coins: [150, 350] },
];

const ORDER_STATUSES = {
  not_started:        { label: "🔴 Not Started",         color: 0xed4245, emoji: "🔴" },
  in_progress:        { label: "🔵 In Progress",          color: 0x5865f2, emoji: "🔵" },
  almost_complete:    { label: "🟠 Almost Complete",      color: 0xffa500, emoji: "🟠" },
  partially_complete: { label: "🟡 Partially Complete",   color: 0xfee75c, emoji: "🟡" },
  completed:          { label: "🟢 Completed",            color: 0x57f287, emoji: "🟢" },
  cancelled:          { label: "⚪ Cancelled",            color: 0x95a5a6, emoji: "⚪" },
  on_hold:            { label: "⏸️ On Hold",              color: 0x9b59b6, emoji: "⏸️" },
  revision:           { label: "🔄 In Revision",          color: 0xf1c40f, emoji: "🔄" },
};

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
  { name: "🛠️ Roblox Scripts",  value: "Custom Lua scripts — gameplay systems, tools, weapons, vehicles, and more." },
  { name: "📋 Commissions",      value: "Full commissioned work, from small features to complete game systems. Open a ticket to discuss." },
  { name: "⚙️ Custom Systems",   value: "Inventory, shop, datastore, leaderboard, party, matchmaking, anti-exploit, and admin systems." },
  { name: "🐛 Scripting Help",   value: "Stuck on a bug or design question? Use `s!debug` to format your issue." },
  { name: "🔍 Code Reviews",     value: "Feedback on existing scripts — performance, structure, and best practices." },
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
      "end\n",
  },
  movement: {
    title: "Movement Tweaks",
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
    title: "RemoteEvent Pattern",
    code:
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\n' +
      'local event = Instance.new("RemoteEvent")\n' +
      'event.Name = "GiveCoins"\n' +
      "event.Parent = ReplicatedStorage\n\n" +
      "event.OnServerEvent:Connect(function(player, amount)\n" +
      "    amount = math.clamp(tonumber(amount) or 0, 0, 100)\n" +
      '    print(player.Name, "requested", amount, "coins")\n' +
      "end)",
  },
  datastore: {
    title: "Safe DataStore",
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
      "end",
  },
};

const SNIPPETS = [
  { title: "Wait for a child safely",  code: 'local part = workspace:WaitForChild("MyPart", 5)\nif not part then warn("MyPart never appeared") end' },
  { title: "Tween a part",             code: 'local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(1, Enum.EasingStyle.Quad)\nlocal tween = TweenService:Create(part, info, { Position = part.Position + Vector3.new(0,5,0) })\ntween:Play()' },
  { title: "Loop all players",         code: "for _, player in ipairs(game.Players:GetPlayers()) do\n    print(player.Name, player.UserId)\nend" },
  { title: "pcall for safe API calls", code: 'local ok, result = pcall(function()\n    return HttpService:GetAsync("https://example.com/api")\nend)\nif not ok then warn("Request failed:", result) end' },
  { title: "Debounce a touch event",   code: 'local debounce = false\npart.Touched:Connect(function(hit)\n    if debounce then return end\n    debounce = true\n    print(hit.Name, "touched")\n    task.wait(1)\n    debounce = false\nend)' },
];

const DOCS = [
  { name: "📖 Roblox Creator Docs",     value: "https://create.roblox.com/docs" },
  { name: "📚 Roblox API Reference",    value: "https://create.roblox.com/docs/reference/engine" },
  { name: "🌙 Luau Language Reference", value: "https://luau-lang.org/" },
  { name: "💬 DevForum Scripting Help", value: "https://devforum.roblox.com/c/help-and-feedback/scripting-support/55" },
  { name: "✏️ Roblox Style Guide",      value: "https://roblox.github.io/lua-style-guide/" },
];

const QUOTES = [
  "Code is poetry — write it like someone you respect will read it.",
  "Small details make big experiences. Sweat them.",
  "The best script is the one you can read six months from now.",
  "Clean code beats clever code. Always.",
  "Every bug is a lesson disguised as frustration.",
  "Ship something today. Polish it tomorrow.",
  "Reading code is a superpower. Practice it.",
  "Comment the WHY, not the WHAT.",
  "Your future self is your most demanding user.",
  "Naming is half the design.",
  "Refactor like a chef cleans as they cook.",
  "If you can't test it, you don't understand it.",
];

const TIPS = [
  "Use `task.wait()` instead of `wait()` — it's faster and more accurate.",
  "Cache `:GetService()` calls at the top of your script — the lookup adds up in hot loops.",
  "Always parent UI to `PlayerGui` AFTER setting properties — fewer redraws.",
  "RemoteEvents are fire-and-forget. RemoteFunctions block — only use them when you need a return value.",
  "DataStore writes are rate-limited. Batch them and use `:UpdateAsync` over `:SetAsync` to avoid race conditions.",
  "Use `Vector3.zero` and `Vector3.one` — fewer allocations.",
  "Anchor parts you don't want physics on. The engine will thank you.",
  "Validate everything from the client on the server. Never trust the client.",
  "`UDim2.fromScale` and `UDim2.fromOffset` make UI math 10x clearer.",
  "Use `:Destroy()` on instances you're done with so connections clean up.",
  "Profile before you optimize. The MicroProfiler is your friend.",
];

const EIGHT_BALL = [
  "It is certain.", "Without a doubt.", "Yes — definitely.", "You may rely on it.",
  "As I see it, yes.", "Most likely.", "Outlook good.", "Signs point to yes.",
  "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.",
  "Don't count on it.", "My reply is no.", "Outlook not so good.", "Very doubtful.",
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
];

// ─────────────────────────────────────────────
//  AI System Prompts
// ─────────────────────────────────────────────
const AI_SYSTEM_PROMPT = `You are the support assistant for **Snuggles Scripting** — a professional Roblox scripting services server owned and operated by **SnugglesMcBear**. You help customers inside their support tickets while they wait for a staff member.

## About Snuggles Scripting
- Professional custom Roblox/Luau scripting: game systems, UI, datastores, admin panels, anti-exploit, matchmaking, weapons, vehicles, leaderboards, and more
- Owned & operated by SnugglesMcBear — committed to quality, reliability, and fast turnaround
- Payment: USD via PayPal (Friends & Family) or CashApp, Robux group payout (buyer covers 30% tax), or gift cards (Amazon, Roblox, Visa, Mastercard)
- All sales are FINAL — no refunds under any circumstances
- Pricing varies by complexity — staff will provide a quote after reviewing the request
- Typical response time: within 24 hours

## Legal & Policy
- 📜 Terms of Service: https://docs.google.com/document/d/13dYCdrmj9mU9jWmEYONExBDnfcwYlQfxR6UJdZRsP28/edit
- 🔒 Privacy Policy: https://docs.google.com/document/d/16ppiOOtWtPkarJVjmxbsHBlObJFQg8IIrnMOaFhDcXk/edit

## How You Behave
- Be warm, genuine, and professional — you represent SnugglesMcBear and the team 💗
- Answer all questions clearly and accurately based on what you know
- For things only staff can decide (specific quotes, ETAs, order details), say "Staff will confirm that for you shortly!"
- Never promise specific prices, delivery timelines, or guarantees — staff handle those
- Keep responses concise and well-formatted — use bullet points when listing things
- Do NOT identify yourself as an AI — you are the Snuggles Scripting assistant
- Do NOT process refund requests — explain all sales are final and refer them to staff
- Always end your very first message in a ticket with: "A staff member will be with you shortly — feel free to ask me anything in the meantime! 💗"`;

const AI_CHAT_PROMPT = `You are a smart, friendly AI assistant. You can help with absolutely anything — questions, writing, ideas, coding in any language, math, creative projects, advice, explanations, or just chatting. Be conversational, clear, and genuinely useful.`;

// ─────────────────────────────────────────────
//  AI Helper
// ─────────────────────────────────────────────
const ticketConversations = new Map();
const ticketAIDisabled    = new Set();
const partnerAwaitingAd   = new Map();

async function callTicketAI(channelId, userMessage, ticketType, formContext) {
  if (!GROQ_API_KEY) return null;
  if (!ticketConversations.has(channelId)) ticketConversations.set(channelId, []);
  const history = ticketConversations.get(channelId);
  history.push({ role: "user", content: userMessage });
  while (history.length > 20) history.shift();
  const systemWithContext = AI_SYSTEM_PROMPT +
    (formContext ? `\n\n## Current Ticket Context\nTicket Type: ${ticketType}\nForm Data:\n${formContext}` : "");
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: "system", content: systemWithContext }, ...history] }),
      });
      if (!response.ok) { if (response.status === 429) continue; continue; }
      const result = await response.json();
      const aiText = result.choices?.[0]?.message?.content?.trim() || null;
      if (aiText) { history.push({ role: "assistant", content: aiText }); return aiText; }
    } catch { continue; }
  }
  return null;
}

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
    leveling: {}, economy: {}, invites: {}, inviteCache: {},
    stickyMessages: {}, partnerships: [], triviaActive: {}, giveaways: {},
    antiRaid: {}, antiNuke: {},
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
      orders:         Array.isArray(parsed.orders)       ? parsed.orders       : [],
      blacklist:      Array.isArray(parsed.blacklist)    ? parsed.blacklist    : [],
      warns:          isObj(parsed.warns)                ? parsed.warns        : {},
      modLogChannels: isObj(parsed.modLogChannels)       ? parsed.modLogChannels : {},
      portfolio:      Array.isArray(parsed.portfolio)    ? parsed.portfolio    : [],
      reviews:        Array.isArray(parsed.reviews)      ? parsed.reviews      : [],
      dailyClaims:    isObj(parsed.dailyClaims)          ? parsed.dailyClaims  : {},
      settings:       isObj(parsed.settings)             ? parsed.settings     : {},
      stats:          isObj(parsed.stats)                ? { ...base.stats, ...parsed.stats } : base.stats,
      leveling:       isObj(parsed.leveling)             ? parsed.leveling     : {},
      economy:        isObj(parsed.economy)              ? parsed.economy      : {},
      invites:        isObj(parsed.invites)              ? parsed.invites      : {},
      inviteCache:    isObj(parsed.inviteCache)          ? parsed.inviteCache  : {},
      stickyMessages: isObj(parsed.stickyMessages)       ? parsed.stickyMessages : {},
      partnerships:   Array.isArray(parsed.partnerships) ? parsed.partnerships : [],
      triviaActive:   isObj(parsed.triviaActive)         ? parsed.triviaActive : {},
      giveaways:      isObj(parsed.giveaways)            ? parsed.giveaways    : {},
      antiRaid:       isObj(parsed.antiRaid)             ? parsed.antiRaid     : {},
      antiNuke:       isObj(parsed.antiNuke)             ? parsed.antiNuke     : {},
    };
  } catch { return defaultData(); }
}

function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
function getGuildSettings(guildId) { if (!data.settings[guildId]) data.settings[guildId] = {}; return data.settings[guildId]; }
function getEconomy(userId) { if (!data.economy[userId]) data.economy[userId] = { coins: 0, lastWorkAt: 0, lastCoinAt: 0, inventory: [] }; return data.economy[userId]; }
function getLeveling(userId) { if (!data.leveling[userId]) data.leveling[userId] = { xp: 0, level: 1, lastXpAt: 0, totalMessages: 0 }; return data.leveling[userId]; }
function saveData() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (err) { console.error("Failed to save data.json:", err); } }

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
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
});

// ─────────────────────────────────────────────
//  Dynamic bot status
// ─────────────────────────────────────────────
const STATUS_CYCLE = [
  (n) => ({ name: `over ${n} server${n !== 1 ? "s" : ""} 💗`,         type: ActivityType.Watching }),
  (n) => ({ name: `${n} communit${n !== 1 ? "ies" : "y"} grow 🌱`,    type: ActivityType.Watching }),
  (n) => ({ name: `${n} Roblox scripter${n !== 1 ? "s" : ""} ✨`,     type: ActivityType.Watching }),
  ()  => ({ name: `snuggles-scripting.com 🤝`,                         type: ActivityType.Playing  }),
  (n) => ({ name: `${n} server${n !== 1 ? "s" : ""} stay cozy ☁️`,    type: ActivityType.Watching }),
];
let _statusIdx = 0;
function updateBotStatus() {
  try {
    const count = client.guilds.cache.size;
    const preset = STATUS_CYCLE[_statusIdx % STATUS_CYCLE.length](count);
    _statusIdx++;
    client.user?.setActivity(preset.name, { type: preset.type });
  } catch {}
}

client.once("clientReady", async () => {
  console.log(`✅ ${BOT_NAME} v${BOT_VERSION} ready as ${client.user.tag}`);
  console.log(`🤖 AI: ${GROQ_API_KEY ? "Enabled (Groq)" : "Disabled (no API key)"}`);
  for (const [, guild] of client.guilds.cache) await cacheInvites(guild).catch(() => {});
  updateBotStatus();
  setInterval(updateBotStatus, 5 * 60 * 1000);
  setInterval(checkGiveaways, 10_000);
  // Update order channel every 3 hours
  setInterval(updateOrderChannel, 3 * 60 * 60 * 1000);
  // Repost ticket panels every 24 hours
  setInterval(repostTicketPanels, 24 * 60 * 60 * 1000);
  setTimeout(updateOrderChannel, 5000);
  setTimeout(repostTicketPanels, 10000);
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
function parseRoleId(arg) {
  if (!arg) return null;
  const m = arg.match(/^<@&(\d+)>$/) || arg.match(/^(\d{15,21})$/);
  return m ? m[1] : null;
}
function findOrder(id) {
  const n = Number(id);
  return Number.isFinite(n) ? (data.orders.find(o => o.id === n) || null) : null;
}
function getOrderStatusInfo(status) { return ORDER_STATUSES[status] || { label: status, color: BRAND_COLOR, emoji: "❓" }; }

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
  } catch {}
}

async function sendErrorLog(err, context = "") {
  try {
    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) return;
    const ch = await guild.channels.fetch(ERROR_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setTitle("🚨 Bot Error").setColor(ERROR_COLOR)
      .addFields(
        { name: "📍 Context", value: context || "Unknown" },
        { name: "❌ Error",   value: `\`\`\`${String(err?.message || err).slice(0, 900)}\`\`\`` },
        { name: "📚 Stack",   value: `\`\`\`${String(err?.stack || "No stack").slice(0, 900)}\`\`\`` },
      ).setTimestamp();
    await ch.send({ embeds: [embed] });
  } catch {}
}

// ─────────────────────────────────────────────
//  Single-send guard
// ─────────────────────────────────────────────
const RESPONDED = new WeakSet();
async function respond(message, payload) {
  if (RESPONDED.has(message)) return null;
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
  pay: 10_000, stats: 8_000, snippet: 5_000, dowork: WORK_COOLDOWN_MS,
  trivia: 5_000, coinflip: 3_000, roll: 3_000, rps: 3_000, serverinfo: 5_000,
};
function checkCooldown(commandName, userId) {
  const ms = COOLDOWNS_MS[commandName];
  if (!ms) return 0;
  const next = COOLDOWN_BUCKETS.get(`${commandName}:${userId}`) || 0;
  const remaining = next - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
function consumeCooldown(commandName, userId) {
  const ms = COOLDOWNS_MS[commandName];
  if (!ms) return;
  COOLDOWN_BUCKETS.set(`${commandName}:${userId}`, Date.now() + ms);
}

const HANDLED_MESSAGES = new Map();
const HANDLED_TTL_MS = 60_000;
function alreadyHandled(messageId) {
  const now = Date.now();
  for (const [id, ts] of HANDLED_MESSAGES) { if (now - ts > HANDLED_TTL_MS) HANDLED_MESSAGES.delete(id); }
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
function aiEmbed(title)      { return new EmbedBuilder().setColor(AI_COLOR).setTitle(title); }

// ─────────────────────────────────────────────
//  Anti-Raid System
// ─────────────────────────────────────────────
const raidTracker = new Map();
const antiRaidLockdowns = new Map();
const nukeTracker = new Map();

function getAntiRaidSettings(guildId) {
  if (!data.antiRaid[guildId]) {
    data.antiRaid[guildId] = {
      enabled: false, threshold: 8, window: 10_000, action: "kick",
      minAccountAge: 0, autoUnlock: 30_000, whitelistedRoles: [], notifyChannel: null,
    };
  }
  return data.antiRaid[guildId];
}

function getAntiNukeSettings(guildId) {
  if (!data.antiNuke[guildId]) {
    data.antiNuke[guildId] = {
      enabled: false, channelDeleteThreshold: 3, banThreshold: 5,
      roleDeleteThreshold: 3, webhookDeleteThreshold: 3, kickThreshold: 5,
      window: 10_000, action: "ban", trustedRoles: [], trustedUsers: [], notifyChannel: null,
    };
  }
  return data.antiNuke[guildId];
}

async function handleAntiRaidJoin(member) {
  const settings = getAntiRaidSettings(member.guild.id);
  if (!settings.enabled) return;
  if (settings.whitelistedRoles?.some(r => member.roles.cache.has(r))) return;
  if (!raidTracker.has(member.guild.id)) raidTracker.set(member.guild.id, { joins: [], locked: false });
  const tracker = raidTracker.get(member.guild.id);
  const now = Date.now();
  tracker.joins = tracker.joins.filter(t => now - t < settings.window);
  tracker.joins.push(now);

  if (settings.minAccountAge > 0) {
    const accountAgeMs = now - member.user.createdTimestamp;
    if (accountAgeMs < settings.minAccountAge * TIME_UNITS.d) {
      try {
        await member.user.send({ content: `🛡️ **${member.guild.name} — Anti-Raid Protection**\n\nYour account is too new to join this server (minimum age: **${settings.minAccountAge} day(s)**).` }).catch(() => {});
        if (settings.action === "ban") await member.ban({ reason: "Anti-Raid: account too new" });
        else await member.kick("Anti-Raid: account too new");
        await sendRaidAlert(member.guild, settings, { title: "🛡️ Anti-Raid: New Account Blocked", fields: [{ name: "👤 User", value: `${member.user.tag} (${member.id})`, inline: true }, { name: "⚡ Action", value: settings.action, inline: true }] });
      } catch {}
      return;
    }
  }

  if (tracker.joins.length >= settings.threshold && !tracker.locked) {
    tracker.locked = true;
    await sendRaidAlert(member.guild, settings, {
      title: "🚨 RAID DETECTED — Protection Active",
      description: `**${tracker.joins.length}** joins in **${settings.window / 1000}s**`,
      fields: [{ name: "⚡ Action", value: settings.action, inline: true }, { name: "📊 Joins", value: `${tracker.joins.length}`, inline: true }],
      danger: true,
    });
    if (settings.action === "lockdown") {
      const channels = member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
      for (const [, ch] of channels) { try { await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: false }); } catch {} }
      antiRaidLockdowns.set(member.guild.id, { lockedAt: now });
      if (settings.autoUnlock > 0) {
        setTimeout(async () => {
          raidTracker.get(member.guild.id) && (raidTracker.get(member.guild.id).locked = false);
          antiRaidLockdowns.delete(member.guild.id);
          for (const [, ch] of member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText))
            await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: null }).catch(() => {});
          await sendRaidAlert(member.guild, settings, { title: "🔓 Lockdown Lifted", description: `Auto-unlocked after ${formatDuration(settings.autoUnlock)}.` });
        }, settings.autoUnlock);
      }
    }
    if (settings.autoUnlock > 0 && settings.action !== "lockdown") {
      setTimeout(() => { raidTracker.get(member.guild.id) && (raidTracker.get(member.guild.id).locked = false); }, settings.autoUnlock);
    }
  }
  if (tracker.locked && (settings.action === "kick" || settings.action === "ban")) {
    try {
      await member.user.send({ content: `🛡️ **${member.guild.name}** — You were ${settings.action === "kick" ? "removed" : "banned"} by the anti-raid system.` }).catch(() => {});
      if (settings.action === "kick") await member.kick("Anti-Raid");
      else await member.ban({ reason: "Anti-Raid: raid detected" });
    } catch {}
  }
}

async function sendRaidAlert(guild, settings, opts) {
  const channelId = settings.notifyChannel || data.modLogChannels[guild.id];
  if (!channelId) return;
  try {
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) return;
    const embed = new EmbedBuilder().setColor(opts.danger !== false ? ERROR_COLOR : SUCCESS_COLOR).setTitle(opts.title).setTimestamp();
    if (opts.description) embed.setDescription(opts.description);
    if (opts.fields) embed.addFields(opts.fields);
    await ch.send({ embeds: [embed] });
  } catch {}
}

async function sendNukeAlert(guild, settings, opts) {
  const channelId = settings.notifyChannel || data.modLogChannels[guild.id];
  if (!channelId) return;
  try {
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (!ch?.isTextBased()) return;
    const embed = new EmbedBuilder().setColor(opts.danger !== false ? ERROR_COLOR : WARN_COLOR).setTitle(opts.title).setTimestamp();
    if (opts.description) embed.setDescription(opts.description);
    if (opts.fields) embed.addFields(opts.fields);
    await ch.send({ embeds: [embed] });
  } catch {}
}

async function checkAntiNuke(guild, userId, type) {
  const settings = getAntiNukeSettings(guild.id);
  if (!settings.enabled) return;
  if (settings.trustedUsers?.includes(userId)) return;
  const key = `${guild.id}:${userId}`;
  if (!nukeTracker.has(key)) nukeTracker.set(key, { channelDeletes: [], bans: [], roleDeletes: [], webhookDeletes: [], kicks: [] });
  const tracker = nukeTracker.get(key);
  const now = Date.now();
  const typeMap = {
    channelDelete: { arr: "channelDeletes", threshold: settings.channelDeleteThreshold, label: "channel deletions" },
    ban:           { arr: "bans",           threshold: settings.banThreshold,           label: "member bans" },
    roleDelete:    { arr: "roleDeletes",    threshold: settings.roleDeleteThreshold,    label: "role deletions" },
    webhookDelete: { arr: "webhookDeletes", threshold: settings.webhookDeleteThreshold, label: "webhook deletions" },
    kick:          { arr: "kicks",          threshold: settings.kickThreshold,          label: "member kicks" },
  };
  const cfg = typeMap[type];
  if (!cfg) return;
  tracker[cfg.arr] = tracker[cfg.arr].filter(t => now - t < settings.window);
  tracker[cfg.arr].push(now);
  if (tracker[cfg.arr].length >= cfg.threshold) {
    tracker[cfg.arr] = [];
    await nukeResponse(guild, userId, `Performed ${cfg.threshold} ${cfg.label} in ${settings.window / 1000}s`, settings);
  }
}

async function nukeResponse(guild, userId, reason, settings) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member || member.permissions.has(PermissionFlagsBits.Administrator) || member.id === client.user?.id) return;
  if (settings.trustedRoles?.some(r => member.roles.cache.has(r))) return;
  let actionTaken = "none";
  try {
    if (settings.action === "ban") { await member.ban({ reason: `Anti-Nuke: ${reason}` }); actionTaken = "Banned"; }
    else if (settings.action === "kick") { await member.kick(`Anti-Nuke: ${reason}`); actionTaken = "Kicked"; }
    else if (settings.action === "strip_roles") {
      for (const [, r] of member.roles.cache.filter(r => r.id !== guild.id && r.manageable)) await member.roles.remove(r).catch(() => {});
      actionTaken = "Roles Stripped";
    }
    await member.user.send({ content: `🚨 **${guild.name} — Anti-Nuke**\n\nAction: **${actionTaken}**\nReason: ${reason}` }).catch(() => {});
  } catch {}
  await sendNukeAlert(guild, settings, {
    title: "🚨 ANTI-NUKE TRIGGERED",
    description: `**${member.user.tag}** was actioned: **${actionTaken}**`,
    fields: [
      { name: "👤 User", value: `${member.user.tag}`, inline: true },
      { name: "⚡ Action", value: actionTaken, inline: true },
      { name: "📋 Reason", value: reason },
    ],
    danger: true,
  });
}

// ─────────────────────────────────────────────
//  Anti-Raid commands
// ─────────────────────────────────────────────
async function handleAntiRaid(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission").setDescription("Admin only.")] });
  const sub = (args[0] || "").toLowerCase();
  const settings = getAntiRaidSettings(message.guild.id);

  if (sub === "enable")  { settings.enabled = true;  saveData(); return respond(message, { embeds: [successEmbed("🛡️ Anti-Raid Enabled").addFields({ name: "Threshold", value: `${settings.threshold} joins`, inline: true }, { name: "Window", value: `${settings.window/1000}s`, inline: true }, { name: "Action", value: settings.action, inline: true }).setTimestamp()] }); }
  if (sub === "disable") { settings.enabled = false; saveData(); return respond(message, { embeds: [warnEmbed("🛡️ Anti-Raid Disabled").setTimestamp()] }); }

  if (sub === "config") {
    const param = (args[1] || "").toLowerCase(), val = args[2];
    if (param === "threshold") { const n = parseInt(val, 10); if (!Number.isFinite(n) || n < 2) return respond(message, { embeds: [errorEmbed("Invalid").setDescription("Threshold ≥ 2")] }); settings.threshold = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Threshold → ${n} joins`)] }); }
    if (param === "window") { const n = parseInt(val, 10) * 1000; if (!Number.isFinite(n) || n < 1000) return respond(message, { embeds: [errorEmbed("Invalid")] }); settings.window = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Window → ${val}s`)] }); }
    if (param === "action") { if (!["kick","ban","lockdown"].includes(val)) return respond(message, { embeds: [errorEmbed("Invalid").setDescription("`kick`, `ban`, `lockdown`")] }); settings.action = val; saveData(); return respond(message, { embeds: [successEmbed(`✅ Action → ${val}`)] }); }
    if (param === "minage") { const n = parseInt(val, 10); if (!Number.isFinite(n) || n < 0) return respond(message, { embeds: [errorEmbed("Invalid")] }); settings.minAccountAge = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Min Age → ${n}d`)] }); }
    if (param === "autounlock") { settings.autoUnlock = parseInt(val, 10) * 1000 || 0; saveData(); return respond(message, { embeds: [successEmbed(`✅ Auto-Unlock → ${val}s`)] }); }
    if (param === "alertchannel") { const chId = parseChannelId(val); settings.notifyChannel = chId; saveData(); return respond(message, { embeds: [successEmbed(`✅ Alert Channel → ${chId ? `<#${chId}>` : "cleared"}`)] }); }
    return respond(message, { embeds: [infoEmbed("⚙️ Anti-Raid Config").addFields(
      { name: "`config threshold <n>`",            value: "Joins to trigger (≥2)" },
      { name: "`config window <secs>`",             value: "Detection window" },
      { name: "`config action <kick|ban|lockdown>`", value: "Action on raid" },
      { name: "`config minage <days>`",             value: "Min account age" },
      { name: "`config autounlock <secs>`",         value: "Auto-unlock time" },
      { name: "`config alertchannel <#ch>`",        value: "Alert channel" },
    )] });
  }

  if (sub === "status") {
    const lock = antiRaidLockdowns.get(message.guild.id);
    return respond(message, { embeds: [infoEmbed("🛡️ Anti-Raid Status")
      .setDescription(`**Status:** ${settings.enabled ? "🟢 Active" : "🔴 Disabled"}`)
      .addFields(
        { name: "📊 Threshold", value: `${settings.threshold} joins`, inline: true },
        { name: "⏱️ Window",    value: `${settings.window/1000}s`,   inline: true },
        { name: "⚡ Action",    value: settings.action,              inline: true },
        { name: "📅 Min Age",   value: settings.minAccountAge ? `${settings.minAccountAge}d` : "Off", inline: true },
        { name: "🔓 Auto-Unlock", value: settings.autoUnlock ? formatDuration(settings.autoUnlock) : "Manual", inline: true },
        { name: "🔒 Lockdown", value: lock ? `Active since <t:${Math.floor(lock.lockedAt/1000)}:R>` : "Not active", inline: true },
      ).setTimestamp()] });
  }

  if (sub === "unlock") {
    let count = 0;
    for (const [, ch] of message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText)) {
      try { await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }); count++; } catch {}
    }
    raidTracker.has(message.guild.id) && (raidTracker.get(message.guild.id).locked = false);
    antiRaidLockdowns.delete(message.guild.id);
    return respond(message, { embeds: [successEmbed("🔓 Lockdown Lifted").setDescription(`Unlocked **${count}** channels.`).setTimestamp()] });
  }

  return respond(message, { embeds: [brandEmbed("🛡️ Anti-Raid System")
    .setDescription(`**Status:** ${settings.enabled ? "🟢 Active" : "🔴 Disabled"} | **Action:** ${settings.action} | **Threshold:** ${settings.threshold} joins/${settings.window/1000}s`)
    .addFields({ name: "📋 Commands", value: `\`${PREFIX}antiraid enable\` · \`${PREFIX}antiraid disable\` · \`${PREFIX}antiraid status\` · \`${PREFIX}antiraid unlock\` · \`${PREFIX}antiraid config <param> <val>\`` })
    .setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Anti-Nuke commands
// ─────────────────────────────────────────────
async function handleAntiNuke(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission").setDescription("Admin only.")] });
  const sub = (args[0] || "").toLowerCase();
  const settings = getAntiNukeSettings(message.guild.id);

  if (sub === "enable")  { settings.enabled = true;  saveData(); return respond(message, { embeds: [successEmbed("🛡️ Anti-Nuke Enabled").addFields({ name: "Action", value: settings.action, inline: true }, { name: "Window", value: `${settings.window/1000}s`, inline: true }).setTimestamp()] }); }
  if (sub === "disable") { settings.enabled = false; saveData(); return respond(message, { embeds: [warnEmbed("🛡️ Anti-Nuke Disabled").setTimestamp()] }); }

  if (sub === "config") {
    const param = (args[1] || "").toLowerCase(), val = args[2];
    const thresholds = { channels: "channelDeleteThreshold", bans: "banThreshold", roles: "roleDeleteThreshold", webhooks: "webhookDeleteThreshold", kicks: "kickThreshold" };
    if (thresholds[param]) { const n = parseInt(val, 10); if (!Number.isFinite(n) || n < 1) return respond(message, { embeds: [errorEmbed("Invalid")] }); settings[thresholds[param]] = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ ${param} threshold → ${n}`)] }); }
    if (param === "window") { const n = parseInt(val, 10) * 1000; if (!Number.isFinite(n)) return respond(message, { embeds: [errorEmbed("Invalid")] }); settings.window = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Window → ${val}s`)] }); }
    if (param === "action") { if (!["ban","kick","strip_roles"].includes(val)) return respond(message, { embeds: [errorEmbed("Invalid").setDescription("`ban`, `kick`, `strip_roles`")] }); settings.action = val; saveData(); return respond(message, { embeds: [successEmbed(`✅ Action → ${val}`)] }); }
    if (param === "alertchannel") { const chId = parseChannelId(val); settings.notifyChannel = chId; saveData(); return respond(message, { embeds: [successEmbed(`✅ Alert Channel Set`)] }); }
    if (param === "trustrole") { const roleId = parseRoleId(val); if (!roleId) return respond(message, { embeds: [errorEmbed("Invalid Role")] }); if (!settings.trustedRoles) settings.trustedRoles = []; const idx = settings.trustedRoles.indexOf(roleId); if (idx === -1) { settings.trustedRoles.push(roleId); saveData(); return respond(message, { embeds: [successEmbed("✅ Role Trusted")] }); } else { settings.trustedRoles.splice(idx, 1); saveData(); return respond(message, { embeds: [warnEmbed("✅ Role Untrusted")] }); } }
    if (param === "trustuser") { const userId = parseUserId(val); if (!userId) return respond(message, { embeds: [errorEmbed("Invalid User")] }); if (!settings.trustedUsers) settings.trustedUsers = []; const idx = settings.trustedUsers.indexOf(userId); if (idx === -1) { settings.trustedUsers.push(userId); saveData(); return respond(message, { embeds: [successEmbed("✅ User Trusted")] }); } else { settings.trustedUsers.splice(idx, 1); saveData(); return respond(message, { embeds: [warnEmbed("✅ User Untrusted")] }); } }
    return respond(message, { embeds: [infoEmbed("⚙️ Anti-Nuke Config").addFields(
      { name: "`config channels/bans/roles/webhooks/kicks <n>`", value: "Set thresholds" },
      { name: "`config window <secs>`",                         value: "Detection window" },
      { name: "`config action <ban|kick|strip_roles>`",         value: "Action on trigger" },
      { name: "`config alertchannel <#ch>`",                    value: "Alert channel" },
      { name: "`config trustrole <@role>`",                     value: "Toggle trusted role" },
      { name: "`config trustuser <@user>`",                     value: "Toggle trusted user" },
    )] });
  }

  if (sub === "status") {
    return respond(message, { embeds: [infoEmbed("🛡️ Anti-Nuke Status")
      .setDescription(`**Status:** ${settings.enabled ? "🟢 Active" : "🔴 Disabled"}`)
      .addFields(
        { name: "💬 Channel Deletes", value: `${settings.channelDeleteThreshold}`, inline: true },
        { name: "🔨 Bans",            value: `${settings.banThreshold}`,           inline: true },
        { name: "🎭 Role Deletes",    value: `${settings.roleDeleteThreshold}`,    inline: true },
        { name: "🔗 Webhook Deletes", value: `${settings.webhookDeleteThreshold}`, inline: true },
        { name: "👢 Kicks",           value: `${settings.kickThreshold}`,          inline: true },
        { name: "⚡ Action",          value: settings.action,                      inline: true },
        { name: "✅ Trusted Roles",   value: settings.trustedRoles?.length ? settings.trustedRoles.map(r => `<@&${r}>`).join(", ") : "None" },
        { name: "✅ Trusted Users",   value: settings.trustedUsers?.length ? settings.trustedUsers.map(u => `<@${u}>`).join(", ") : "None" },
      ).setTimestamp()] });
  }

  return respond(message, { embeds: [brandEmbed("🛡️ Anti-Nuke System")
    .setDescription(`**Status:** ${settings.enabled ? "🟢 Active" : "🔴 Disabled"}`)
    .addFields({ name: "📋 Commands", value: `\`${PREFIX}antinuke enable\` · \`${PREFIX}antinuke disable\` · \`${PREFIX}antinuke status\` · \`${PREFIX}antinuke config <param> <val>\`` })
    .setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Ticket Staff Role Management
// ─────────────────────────────────────────────
async function handleTicketRole(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const sub = (args[0] || "").toLowerCase();
  const settings = getGuildSettings(message.guild.id);
  if (!settings.ticketStaffRoles) settings.ticketStaffRoles = [];

  if (sub === "add") {
    const roleId = parseRoleId(args[1]);
    if (!roleId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}ticketrole add <@role>\``)] });
    if (settings.ticketStaffRoles.includes(roleId)) return respond(message, { embeds: [warnEmbed("Already Added")] });
    settings.ticketStaffRoles.push(roleId); saveData();
    return respond(message, { embeds: [successEmbed("✅ Staff Role Added").setDescription(`<@&${roleId}> can now see all tickets.`)] });
  }
  if (sub === "remove") {
    const roleId = parseRoleId(args[1]);
    if (!roleId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}ticketrole remove <@role>\``)] });
    const idx = settings.ticketStaffRoles.indexOf(roleId);
    if (idx === -1) return respond(message, { embeds: [errorEmbed("Not Found")] });
    settings.ticketStaffRoles.splice(idx, 1); saveData();
    return respond(message, { embeds: [successEmbed("✅ Staff Role Removed")] });
  }
  if (sub === "list") {
    return respond(message, { embeds: [infoEmbed("🎭 Ticket Staff Roles").setDescription(settings.ticketStaffRoles.length ? settings.ticketStaffRoles.map(r => `• <@&${r}>`).join("\n") : "No roles configured.")] });
  }
  return respond(message, { embeds: [infoEmbed("🎭 Ticket Role Management").addFields(
    { name: `\`${PREFIX}ticketrole add <@role>\``,    value: "Give a role ticket access" },
    { name: `\`${PREFIX}ticketrole remove <@role>\``, value: "Remove a role's ticket access" },
    { name: `\`${PREFIX}ticketrole list\``,           value: "List all ticket staff roles" },
  )] });
}

// ─────────────────────────────────────────────
//  Ticket Config
// ─────────────────────────────────────────────
async function handleTicketConfig(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const sub = (args[0] || "").toLowerCase();
  const settings = getGuildSettings(message.guild.id);

  if (sub === "ai") {
    const val = (args[1] || "").toLowerCase();
    if (val === "on" || val === "enable")   { settings.ticketAI = true;  saveData(); return respond(message, { embeds: [successEmbed("🤖 Ticket AI Enabled")] }); }
    if (val === "off" || val === "disable") { settings.ticketAI = false; saveData(); return respond(message, { embeds: [warnEmbed("🤖 Ticket AI Disabled")] }); }
  }
  if (sub === "greeting") {
    const text = args.slice(1).join(" ").trim();
    if (!text) { delete settings.ticketGreeting; saveData(); return respond(message, { embeds: [successEmbed("✅ Greeting Cleared")] }); }
    settings.ticketGreeting = text; saveData();
    return respond(message, { embeds: [successEmbed("✅ Greeting Set").setDescription(`> ${text}`)] });
  }
  if (sub === "category") {
    const catId = parseChannelId(args[1]);
    settings.ticketCategoryId = catId || undefined; saveData();
    return respond(message, { embeds: [successEmbed(`✅ Category ${catId ? "Set" : "Cleared"}`)] });
  }
  if (sub === "maxopen") {
    const n = parseInt(args[1], 10);
    if (!Number.isFinite(n) || n < 1) return respond(message, { embeds: [errorEmbed("Invalid")] });
    settings.maxOpenTickets = n; saveData();
    return respond(message, { embeds: [successEmbed(`✅ Max tickets → ${n}`)] });
  }
  return respond(message, { embeds: [brandEmbed("⚙️ Ticket Configuration").addFields(
    { name: `\`${PREFIX}ticketconfig ai <on|off>\``,     value: `AI assistant — **${settings.ticketAI !== false ? "ON" : "OFF"}**` },
    { name: `\`${PREFIX}ticketconfig greeting <text>\``, value: `Custom greeting — **${settings.ticketGreeting ? "Set" : "Default"}**` },
    { name: `\`${PREFIX}ticketconfig category <#ch>\``,  value: `Ticket category` },
    { name: `\`${PREFIX}ticketconfig maxopen <n>\``,     value: `Max open tickets/user — **${settings.maxOpenTickets || 1}**` },
  ).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Order Channel — rebuilt, active board
// ─────────────────────────────────────────────
async function updateOrderChannel() {
  try {
    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) return;
    const ch = await guild.channels.fetch(ORDER_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) return;

    const now = Date.now();
    const active    = data.orders.filter(o => o.status !== "completed" && o.status !== "cancelled");
    const completed = data.orders.filter(o => o.status === "completed");
    const today     = data.orders.filter(o => o.status === "completed" && now - new Date(o.updatedAt).getTime() < 86_400_000);

    // ── Header embed
    const headerEmbed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle("📋  Commission Order Board")
      .setDescription(
        "```\n" +
        "╔══════════════════════════════════╗\n" +
        "║   🧸  Snuggles Scripting Orders  ║\n" +
        "╚══════════════════════════════════╝\n" +
        "```\n" +
        `> Last refreshed: <t:${Math.floor(now / 1000)}:R>  •  Refreshes every **3 hours**`
      )
      .addFields(
        { name: "🔵 Active",         value: `${active.length}`,    inline: true },
        { name: "🟢 Completed Total", value: `${completed.length}`, inline: true },
        { name: "✅ Done Today",      value: `${today.length}`,     inline: true },
      )
      .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}  •  Use s!orderinfo <id> for details` })
      .setTimestamp();

    // ── Status breakdown embed
    const statusCounts = {};
    for (const o of active) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    const statusLines = Object.entries(ORDER_STATUSES)
      .filter(([k]) => k !== "completed" && k !== "cancelled")
      .map(([k, v]) => `${v.emoji} **${v.label.replace(/^\S+\s/, "")}** — ${statusCounts[k] || 0}`)
      .join("\n");

    const statsEmbed = new EmbedBuilder()
      .setColor(INFO_COLOR)
      .setTitle("📊  Status Overview")
      .setDescription(statusLines || "*No active orders.*")
      .setTimestamp();

    // ── Active orders embed (up to 10, paginated via description)
    let orderEmbeds = [];
    if (active.length === 0) {
      orderEmbeds.push(new EmbedBuilder()
        .setColor(SUCCESS_COLOR)
        .setTitle("✅  Queue Clear!")
        .setDescription("No active orders right now. Open a ticket to commission something! 💗")
        .setTimestamp()
      );
    } else {
      for (const order of active.slice(0, 10)) {
        const si = getOrderStatusInfo(order.status);
        orderEmbeds.push(new EmbedBuilder()
          .setColor(si.color)
          .setTitle(`${si.emoji}  Order #${order.id}  —  ${si.label}`)
          .addFields(
            { name: "👤 Customer", value: `<@${order.userId}>`,                                                      inline: true },
            { name: "📅 Created",  value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:d>`,        inline: true },
            { name: "🔄 Updated",  value: `<t:${Math.floor(new Date(order.updatedAt).getTime() / 1000)}:R>`,        inline: true },
            { name: "📝 Details",  value: order.details.slice(0, 200) + (order.details.length > 200 ? "…" : "") },
            ...(order.note ? [{ name: "📋 Staff Note", value: order.note }] : []),
          )
          .setTimestamp()
        );
      }
      if (active.length > 10) {
        orderEmbeds.push(new EmbedBuilder()
          .setColor(NOTE_COLOR)
          .setDescription(`*…and **${active.length - 10}** more active orders. Use \`s!orderinfo <id>\` to look up any order.*`)
        );
      }
    }

    // Delete previous board messages
    const settings = getGuildSettings(HOME_GUILD_ID);
    if (settings.orderBoardMessageIds?.length) {
      for (const msgId of settings.orderBoardMessageIds) {
        try { await ch.messages.delete(msgId); } catch {}
      }
    }

    // Send all embeds (split to stay under 10 embeds/message)
    const allEmbeds = [headerEmbed, statsEmbed, ...orderEmbeds];
    const sentIds = [];
    for (let i = 0; i < allEmbeds.length; i += 10) {
      const sent = await ch.send({ embeds: allEmbeds.slice(i, i + 10) });
      sentIds.push(sent.id);
    }
    settings.orderBoardMessageIds = sentIds;
    saveData();
  } catch (err) { console.error("updateOrderChannel failed:", err); }
}

// ─────────────────────────────────────────────
//  Ticket Panel
// ─────────────────────────────────────────────
function buildTicketPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle("🧸  Open a Support Ticket")
    .setDescription(
      "```\n╔══════════════════════════════════╗\n║    Welcome to Snuggles Scripting ║\n╚══════════════════════════════════╝\n```\n" +
      "Choose the option below that best fits your needs.\n\n" +
      "📦 **Order** — Commission a custom script or system\n" +
      "🤝 **Partnership** — Apply to partner with our server\n" +
      "❓ **General Inquiry** — Questions, support, or general help\n\n" +
      "> *Average response time: under 24 hours. AI support is available 24/7.*"
    )
    .setFooter({ text: `${BOT_NAME}  •  Ticket System  •  AI-Powered Support` })
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_order").setLabel("Commission Order").setStyle(ButtonStyle.Primary).setEmoji("📦"),
    new ButtonBuilder().setCustomId("ticket_partnership").setLabel("Partnership").setStyle(ButtonStyle.Success).setEmoji("🤝"),
    new ButtonBuilder().setCustomId("ticket_inquiry").setLabel("General Inquiry").setStyle(ButtonStyle.Secondary).setEmoji("❓"),
  );
  return { embed, row };
}

async function repostTicketPanels() {
  for (const [guildId, settings] of Object.entries(data.settings)) {
    if (!settings.ticketPanelChannelId) continue;
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      const ch = await guild.channels.fetch(settings.ticketPanelChannelId).catch(() => null);
      if (!ch?.isTextBased()) continue;
      if (settings.ticketPanelMessageId) { try { await ch.messages.delete(settings.ticketPanelMessageId); } catch {} }
      const { embed, row } = buildTicketPanelEmbed();
      const sent = await ch.send({ embeds: [embed], components: [row] });
      settings.ticketPanelMessageId = sent.id;
      saveData();
    } catch {}
  }
}

// ─────────────────────────────────────────────
//  Setup message (sent on guild join)
// ─────────────────────────────────────────────
async function sendSetupMessage(guild) {
  const channel = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText && c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages))
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .first();
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧸  ${BOT_NAME} v${BOT_VERSION}  —  Setup Guide`)
    .setDescription(
      `Thanks for adding **${BOT_NAME}** to **${guild.name}**! 💗\n\n` +
      `All commands use the **\`${PREFIX}\`** prefix. Follow the steps below to get everything configured.`
    )
    .addFields(
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━━━", value: "**📋  Step 1 — Core Setup**" },
      { name: "Set Mod Log Channel",    value: `\`${PREFIX}setlog #channel\`` },
      { name: "Set Reviews Channel",    value: `\`${PREFIX}setreviews #channel\`` },
      { name: "Set Transcripts Channel",value: `\`${PREFIX}settranscripts #channel\`` },
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━━━", value: "**🎫  Step 2 — Ticket System**" },
      { name: "Post Ticket Panel",      value: `\`${PREFIX}ticketpanel\`` },
      { name: "Add Staff Roles",        value: `\`${PREFIX}ticketrole add @role\`` },
      { name: "Enable AI Support",      value: `\`${PREFIX}ticketconfig ai on\`` },
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━━━", value: "**🛡️  Step 3 — Security**" },
      { name: "Anti-Raid",              value: `\`${PREFIX}antiraid enable\`  |  Config: \`${PREFIX}antiraid config <param> <val>\`` },
      { name: "Anti-Nuke",              value: `\`${PREFIX}antinuke enable\`  |  Config: \`${PREFIX}antinuke config <param> <val>\`` },
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━━━", value: "**📦  Step 4 — Orders**" },
      { name: "Order board auto-updates", value: "The order board updates in its channel every 3 hours automatically." },
      { name: "━━━━━━━━━━━━━━━━━━━━━━━━━━", value: "**💡  Tips**" },
      { name: "Full Command List",      value: `\`${PREFIX}help\`` },
      { name: "Bot Status",             value: `\`${PREFIX}status\`` },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}  •  Made with 💗 by ${BOT_OWNER}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ─────────────────────────────────────────────
//  Leveling
// ─────────────────────────────────────────────
async function handleXpGrant(message) {
  const lv  = getLeveling(message.author.id);
  const now = Date.now();
  if (now - lv.lastXpAt < XP_COOLDOWN_MS) return;
  lv.lastXpAt = now;
  lv.totalMessages = (lv.totalMessages || 0) + 1;
  const gained = XP_PER_MESSAGE + Math.floor(Math.random() * XP_VARIANCE * 2) - XP_VARIANCE;
  lv.xp += Math.max(1, gained);
  const needed = xpForLevel(lv.level);
  if (lv.xp >= needed) {
    lv.xp -= needed; lv.level++;
    saveData();
    try {
      const lvUpChannel = message.guild?.channels.cache.get(LEVELUP_CHANNEL_ID);
      const ch = lvUpChannel || message.channel;
      await ch.send({ content: `<@${message.author.id}>`, embeds: [new EmbedBuilder()
        .setColor(XP_COLOR).setTitle("🎉 Level Up!")
        .setDescription(`<@${message.author.id}> just reached **Level ${lv.level}**! Keep it up 🚀`)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: `Next level needs ${xpForLevel(lv.level)} XP` }).setTimestamp()] });
    } catch {}
  } else { saveData(); }
}

async function handleLevel(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user; try { user = await client.users.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  const lv = getLeveling(userId);
  const needed = xpForLevel(lv.level);
  const progress = Math.min(20, Math.floor((lv.xp / needed) * 20));
  const bar = "█".repeat(progress) + "░".repeat(20 - progress);
  await respond(message, { embeds: [new EmbedBuilder().setColor(XP_COLOR).setTitle(`📊 Level — ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "🏆 Level",    value: `${lv.level}`,          inline: true },
      { name: "✨ XP",       value: `${lv.xp} / ${needed}`, inline: true },
      { name: "💬 Messages", value: `${lv.totalMessages||0}`, inline: true },
      { name: "📈 Progress", value: `\`${bar}\` ${Math.floor((lv.xp / needed) * 100)}%` },
    ).setTimestamp()] });
}

async function handleLeaderboard(message) {
  const entries = Object.entries(data.leveling)
    .map(([id, d]) => ({ id, level: d.level || 1, xp: d.xp || 0 }))
    .sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp)
    .slice(0, 10);
  if (!entries.length) return respond(message, { embeds: [brandEmbed("📊 Leaderboard").setDescription("No data yet!")] });
  const medals = ["🥇", "🥈", "🥉"];
  const lines = await Promise.all(entries.map(async (e, i) => {
    let tag = `<@${e.id}>`;
    try { const u = await client.users.fetch(e.id); tag = u.username; } catch {}
    return `${medals[i] || `**${i + 1}.**`} ${tag} — Level **${e.level}** (${e.xp} XP)`;
  }));
  await respond(message, { embeds: [goldEmbed("🏆 Level Leaderboard").setDescription(lines.join("\n")).setTimestamp()] });
}

async function handleRank(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user; try { user = await client.users.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  const lv = getLeveling(userId);
  const eco = getEconomy(userId);
  const needed = xpForLevel(lv.level);
  const allUsers = Object.entries(data.leveling).sort((a, b) => b[1].level !== a[1].level ? b[1].level - a[1].level : b[1].xp - a[1].xp);
  const rank = allUsers.findIndex(([id]) => id === userId) + 1;
  await respond(message, { embeds: [new EmbedBuilder().setColor(XP_COLOR).setTitle(`🏅 Rank Card — ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: "🌍 Global Rank", value: rank > 0 ? `#${rank}` : "Unranked", inline: true },
      { name: "🏆 Level",       value: `${lv.level}`,                      inline: true },
      { name: "✨ XP",          value: `${lv.xp} / ${needed}`,             inline: true },
      { name: "💰 Coins",       value: `${eco.coins || 0}`,                inline: true },
      { name: "💬 Messages",    value: `${lv.totalMessages || 0}`,         inline: true },
      { name: "⚠️ Warnings",   value: `${(data.warns[userId] || []).length}`, inline: true },
    ).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Economy
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
  let user; try { user = await client.users.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  const eco = getEconomy(userId);
  await respond(message, { embeds: [goldEmbed(`💰 Balance — ${user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields({ name: "💰 Coins", value: `${eco.coins || 0} 🪙`, inline: true }, { name: "🎒 Inventory", value: `${(eco.inventory || []).length} item(s)`, inline: true })
    .setTimestamp()] });
}

async function handleWork(message) {
  const eco = getEconomy(message.author.id);
  const job = WORK_RESPONSES[Math.floor(Math.random() * WORK_RESPONSES.length)];
  const earned = Math.floor(Math.random() * (job.coins[1] - job.coins[0])) + job.coins[0];
  eco.coins = (eco.coins || 0) + earned;
  saveData();
  await respond(message, { embeds: [successEmbed("💼 Work Complete!")
    .setDescription(`> ${job.text}\n\nYou earned **${earned} 🪙 coins**!`)
    .addFields({ name: "💰 Balance", value: `${eco.coins} 🪙` }).setTimestamp()] });
}

async function handleShop(message) {
  await respond(message, { embeds: [goldEmbed("🛒 Coin Shop")
    .setDescription("Spend your coins on exclusive perks! Use `s!buy <item_id>` to purchase.")
    .addFields(SHOP_ITEMS.map(i => ({ name: `${i.name} — ${i.price} 🪙`, value: `${i.desc}\n\`ID: ${i.id}\`` })))
    .setTimestamp()] });
}

async function handleBuy(message, args) {
  const itemId = (args[0] || "").toLowerCase();
  if (!itemId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}buy <item_id>\``)] });
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return respond(message, { embeds: [errorEmbed("Item Not Found")] });
  const eco = getEconomy(message.author.id);
  if ((eco.coins || 0) < item.price) return respond(message, { embeds: [errorEmbed("Not Enough Coins").setDescription(`Need **${item.price} 🪙** but have **${eco.coins || 0} 🪙**.`)] });
  if ((eco.inventory || []).includes(item.id)) return respond(message, { embeds: [warnEmbed("Already Owned")] });
  eco.coins -= item.price;
  if (!eco.inventory) eco.inventory = [];
  eco.inventory.push(item.id);
  saveData();
  await respond(message, { embeds: [successEmbed("✅ Purchase Successful!").addFields({ name: "🛍️ Item", value: item.name }, { name: "📋 How to redeem", value: item.desc }).setTimestamp()] });
}

async function handleGiveCoins(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  const amount = parseInt(args[1], 10);
  if (!userId || !Number.isFinite(amount) || amount <= 0) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}givecoins @user <amount>\``)] });
  const eco = getEconomy(userId);
  eco.coins = (eco.coins || 0) + amount; saveData();
  await respond(message, { embeds: [successEmbed("💰 Coins Given").addFields({ name: "👤 User", value: `<@${userId}>`, inline: true }, { name: "➕ Given", value: `${amount} 🪙`, inline: true }, { name: "💰 Balance", value: `${eco.coins} 🪙`, inline: true }).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Invite Tracking
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
  const entries = Object.entries(guildInvites).map(([id, d]) => ({ id, invited: d.invited || 0, left: d.left || 0 })).sort((a, b) => (b.invited - b.left) - (a.invited - a.left)).slice(0, 10);
  if (!entries.length) return respond(message, { embeds: [brandEmbed("📊 Invite Leaderboard").setDescription("No data yet.")] });
  const lines = entries.map((e, i) => `**${i + 1}.** <@${e.id}> — **${e.invited - e.left}** net`);
  await respond(message, { embeds: [goldEmbed("📨 Invite Leaderboard").setDescription(lines.join("\n")).setTimestamp()] });
}

async function handleMyInvites(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  const inv = (data.invites[message.guild.id] || {})[userId] || { invited: 0, left: 0 };
  let user; try { user = await client.users.fetch(userId); } catch { user = null; }
  await respond(message, { embeds: [infoEmbed(`📨 Invites — ${user?.username || userId}`)
    .addFields({ name: "📬 Invited", value: `${inv.invited}`, inline: true }, { name: "🚪 Left", value: `${inv.left}`, inline: true }, { name: "✅ Net", value: `${inv.invited - inv.left}`, inline: true })
    .setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Sticky Messages
// ─────────────────────────────────────────────
async function refreshSticky(channel) {
  if (channel.id !== STICKY_CHANNEL_ID) return;
  const lastStickyId = data.stickyMessages[channel.id];
  if (lastStickyId) { try { await channel.messages.delete(lastStickyId); } catch {} }
  const embed = new EmbedBuilder().setColor(BRAND_COLOR).setDescription(STICKY_MESSAGE_TEXT).setFooter({ text: `${BOT_NAME} • Sticky Message` });
  const msg = await channel.send({ embeds: [embed] }).catch(() => null);
  if (msg) { data.stickyMessages[channel.id] = msg.id; saveData(); }
}

// ─────────────────────────────────────────────
//  Partnerships — FIXED
// ─────────────────────────────────────────────
async function handlePartner(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const subcommand = (args[0] || "").toLowerCase();

  if (!subcommand || subcommand === "help") {
    return respond(message, { embeds: [infoEmbed("🤝 Partnership System").addFields(
      { name: "Basic",    value: `\`${PREFIX}partner basic <invite> | <name> | <desc>\`` },
      { name: "Detailed", value: `\`${PREFIX}partner detailed <invite> | <name> | <desc> | <perks>\`` },
      { name: "Announce", value: `\`${PREFIX}partner announce <invite> | <name> | <about> | <what they offer> | <what we offer>\`` },
      { name: "Promo",    value: `\`${PREFIX}partner promo <invite> | <name> | <text>\`` },
      { name: "List",     value: `\`${PREFIX}partner list\`` },
      { name: "Remove",   value: `\`${PREFIX}partner remove <id>\`` },
    )] });
  }

  if (subcommand === "list") {
    const ps = data.partnerships.filter(p => p.guildId === message.guild.id);
    if (!ps.length) return respond(message, { embeds: [brandEmbed("🤝 Partnerships").setDescription("No active partnerships.")] });
    return respond(message, { embeds: [infoEmbed(`🤝 Partnerships — ${ps.length}`).setDescription(ps.map(p => `**#${p.id}** [${p.name || "Unnamed"}](${p.invite}) — ${p.addedBy}`).join("\n"))] });
  }

  if (subcommand === "remove") {
    if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("Admin Only")] });
    const id = parseInt(args[1], 10);
    const idx = data.partnerships.findIndex(p => p.id === id && p.guildId === message.guild.id);
    if (idx === -1) return respond(message, { embeds: [errorEmbed("Not Found")] });
    const removed = data.partnerships.splice(idx, 1)[0]; saveData();
    return respond(message, { embeds: [successEmbed("✅ Removed").setDescription(`**${removed.name || removed.invite}** removed.`)] });
  }

  // Build embed for a partnership type
  const rawContent = args.slice(1).join(" ");
  const parts = rawContent.split("|").map(s => s.trim());
  if (!parts[0]) return respond(message, { embeds: [errorEmbed("Missing Info")] });

  let invite = parts[0].trim();
  if (!invite.startsWith("http")) invite = "https://discord.gg/" + invite.replace(/^(discord\.gg\/)/i, "");
  const INVITE_RE = /^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\/.+$/i;
  if (!INVITE_RE.test(invite)) return respond(message, { embeds: [errorEmbed("Invalid Invite Link")] });

  const footerTag = message.author.tag;
  let embed;

  if (subcommand === "basic") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription("Format: `invite | name | description`")] });
    embed = new EmbedBuilder().setColor(INFO_COLOR).setTitle("🤝 New Partnership!")
      .setDescription("We're excited to welcome a new partner to the community! 🎉")
      .addFields(
        { name: "🏠 Server",  value: `**${parts[1]}**`, inline: true },
        { name: "🔗 Join",    value: `[Click here!](${invite})`, inline: true },
        { name: "📋 About",   value: parts[2] || "No description." },
      )
      .setFooter({ text: `Partnership • Posted by ${footerTag}` }).setTimestamp();

  } else if (subcommand === "detailed") {
    embed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle("🌟 Featured Partner")
      .setDescription("✨ Check out our awesome partner!")
      .addFields(
        { name: "🏠 Server", value: `**${parts[1] || "—"}**`, inline: true },
        { name: "🔗 Join",   value: `[${parts[1] || "Join"}](${invite})`, inline: true },
        { name: "📖 About",  value: parts[2] || "—" },
      );
    if (parts[3]) embed.addFields({ name: "🎁 Perks", value: parts[3].split(",").map(s => `• ${s.trim()}`).join("\n") });
    embed.setFooter({ text: `Partnership • ${footerTag}` }).setTimestamp();

  } else if (subcommand === "announce") {
    if (parts.length < 5) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription("Format: `invite | name | about | what they offer | what we offer`")] });
    embed = new EmbedBuilder().setColor(GOLD_COLOR).setTitle("🤝 Official Partnership Announcement")
      .setDescription(`We're thrilled to officially partner with **${parts[1]}**!`)
      .addFields(
        { name: "🏠 Server",          value: `**${parts[1]}**`, inline: true },
        { name: "🔗 Join",            value: `[Click here](${invite})`, inline: true },
        { name: "📋 About Them",      value: parts[2] || "—" },
        { name: "🎁 What They Offer", value: parts[3] || "—", inline: true },
        { name: "💜 What We Offer",   value: parts[4] || "—", inline: true },
      )
      .setFooter({ text: `Partnership • ${footerTag}` }).setTimestamp();

  } else if (subcommand === "promo") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Not Enough Info").setDescription("Format: `invite | name | text`")] });
    embed = new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(`📣 Shoutout — ${parts[1]}`)
      .setDescription(parts[2])
      .addFields({ name: "🔗 Join Server", value: invite })
      .setFooter({ text: `Promo by ${footerTag}` }).setTimestamp();

  } else {
    return respond(message, { embeds: [warnEmbed("Unknown Format").setDescription("Use `basic`, `detailed`, `announce`, or `promo`.")] });
  }

  // Save partnership record
  const maxId = data.partnerships.reduce((acc, p) => Math.max(acc, p.id || 0), 0);
  data.partnerships.push({
    id: maxId + 1,
    guildId: message.guild.id,
    invite,
    name: parts[1] || null,
    format: subcommand,
    addedBy: message.author.tag,
    addedAt: new Date().toISOString(),
  });
  saveData();

  try { await message.delete(); } catch {}
  await message.channel.send({ content: "@here — New partnership!", embeds: [embed], allowedMentions: { parse: ["everyone"] } });
}

// ─────────────────────────────────────────────
//  Announce — redesigned
// ─────────────────────────────────────────────
async function handleAnnounce(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  let targetChannel = message.channel;
  let textArgs = args;

  if (args[0]) {
    const channelId = parseChannelId(args[0]);
    if (channelId) {
      const ch = await message.guild.channels.fetch(channelId).catch(() => null);
      if (ch?.isTextBased()) { targetChannel = ch; textArgs = args.slice(1); }
    }
  }

  const raw = textArgs.join(" ").trim();
  if (!raw) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}announce [#channel] <message>\``)] });

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: `${BOT_NAME}  —  Announcement`, iconURL: client.user?.displayAvatarURL() })
    .setDescription(
      `\`\`\`\n📢  ANNOUNCEMENT\n\`\`\`\n` +
      `${raw}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .setFooter({ text: `Posted by ${message.author.tag}  •  ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  try { await message.delete(); } catch {}
  await targetChannel.send({ content: "@everyone", embeds: [embed], allowedMentions: { parse: ["everyone"] } });
}

// ─────────────────────────────────────────────
//  Order System — redesigned
// ─────────────────────────────────────────────
function hasOrdered(userId) { return data.orders.some(o => o.userId === userId); }

async function handleOrderInfo(message, args) {
  if (!args[0]) return respond(message, { embeds: [errorEmbed("Missing Argument").setDescription(`\`${PREFIX}orderinfo <id>\``)] });
  const order = findOrder(args[0]);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found").setDescription(`No order with ID **#${args[0]}**.`)] });
  const si = getOrderStatusInfo(order.status);
  const embed = new EmbedBuilder().setColor(si.color).setTitle(`📦  Order #${order.id}  —  ${si.label}`)
    .addFields(
      { name: "👤 Customer", value: `<@${order.userId}>`,                                                         inline: true },
      { name: "📊 Status",   value: si.label,                                                                      inline: true },
      { name: "📅 Created",  value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:F>`,            inline: false },
      { name: "🔄 Updated",  value: `<t:${Math.floor(new Date(order.updatedAt).getTime() / 1000)}:R>`,            inline: true },
      { name: "📝 Details",  value: order.details },
    );
  if (order.note) embed.addFields({ name: "📋 Staff Note", value: order.note });
  embed.setFooter({ text: `Use s!updateorder ${order.id} <status> to update` }).setTimestamp();
  await respond(message, { embeds: [embed] });
}

async function handleUpdateOrder(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const orderId   = args[0];
  const newStatus = (args[1] || "").toLowerCase().replace(/-/g, "_");
  const note      = args.slice(2).join(" ").trim() || null;

  if (!orderId || !newStatus) {
    const statusList = Object.entries(ORDER_STATUSES).map(([k, v]) => `\`${k}\` — ${v.label}`).join("\n");
    return respond(message, { embeds: [warnEmbed("Usage")
      .setDescription(`\`${PREFIX}updateorder <id> <status> [note]\``)
      .addFields({ name: "📋 Valid Statuses", value: statusList })
    ] });
  }

  const order = findOrder(orderId);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found").setDescription(`No order #${orderId}.`)] });
  if (!ORDER_STATUSES[newStatus]) {
    const statusList = Object.keys(ORDER_STATUSES).join(", ");
    return respond(message, { embeds: [errorEmbed("Invalid Status").setDescription(`Valid: ${statusList}`)] });
  }

  const oldStatus = order.status;
  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  if (note) order.note = note;
  if (newStatus === "completed") data.stats.ordersCompleted = (data.stats.ordersCompleted || 0) + 1;
  saveData();
  updateOrderChannel().catch(() => {});

  const si = getOrderStatusInfo(newStatus);
  const embed = new EmbedBuilder().setColor(si.color).setTitle(`✅  Order #${order.id} Updated`)
    .addFields(
      { name: "📊 Status",   value: `${getOrderStatusInfo(oldStatus).label} → ${si.label}` },
      { name: "👤 Customer", value: `<@${order.userId}>`, inline: true },
      { name: "🔄 Updated",  value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
    );
  if (note) embed.addFields({ name: "📝 Note", value: note });
  embed.setTimestamp();
  await respond(message, { embeds: [embed] });

  // Notify customer via DM
  try {
    const user = await client.users.fetch(order.userId);
    await user.send({ embeds: [new EmbedBuilder().setColor(si.color).setTitle(`📦  Order #${order.id} Updated`)
      .setDescription(`Your order status changed to **${si.label}**.${note ? `\n\n**📋 Staff Note:** ${note}` : ""}`)
      .setFooter({ text: BOT_NAME }).setTimestamp()] });
  } catch {}
}

async function handleAddOrder(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (args.length < 2) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}addorder @user <details>\``)] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [errorEmbed("Invalid User")] });
  const details = args.slice(1).join(" ").trim();
  if (!details) return respond(message, { embeds: [errorEmbed("Missing Details")] });
  const now = new Date().toISOString();
  const order = { id: data.nextOrderId++, userId, details, status: "not_started", createdAt: now, updatedAt: now, createdBy: message.author.id, note: null };
  data.orders.push(order);
  data.stats.ordersCreated = (data.stats.ordersCreated || 0) + 1;
  saveData();
  updateOrderChannel().catch(() => {});
  await respond(message, { embeds: [successEmbed(`✅  Order #${order.id} Created`).addFields({ name: "👤 Customer", value: `<@${order.userId}>` }, { name: "📝 Details", value: order.details }).setTimestamp()] });
}

async function handleComplete(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const order = findOrder(args[0]);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found")] });
  if (order.status === "completed") return respond(message, { embeds: [warnEmbed("Already Completed")] });
  order.status = "completed"; order.updatedAt = new Date().toISOString();
  data.stats.ordersCompleted = (data.stats.ordersCompleted || 0) + 1;
  saveData(); updateOrderChannel().catch(() => {});
  await respond(message, { embeds: [successEmbed(`✅  Order #${order.id} Marked Complete`).addFields({ name: "👤 Customer", value: `<@${order.userId}>` }).setTimestamp()] });
}

async function handleDiscount(message) {
  const ordered = hasOrdered(message.author.id);
  if (!ordered) return respond(message, { embeds: [infoEmbed("🎟️ Loyalty Discount").setDescription("No previous orders yet.\n\n**After your first order, you'll get a 5% discount on future orders!** 💗")] });
  return respond(message, { embeds: [successEmbed("🎟️ Loyalty Discount!")
    .setDescription("You qualify for a **5% discount** on your next commission!\n\n1. Open a ticket\n2. Mention your discount\n3. Staff will apply it.\n\nThank you for being a valued customer! 💗")
    .addFields({ name: "📊 Your Orders", value: `${data.orders.filter(o => o.userId === message.author.id).length} total` }).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Fun Commands
// ─────────────────────────────────────────────
async function handleCoinFlip(message) {
  const result = Math.random() < 0.5 ? "Heads" : "Tails";
  await respond(message, { embeds: [brandEmbed("🪙 Coin Flip").setDescription(`**${result}!** ${result === "Heads" ? "👑" : "🌊"}`)] });
}

async function handleRoll(message, args) {
  const max = parseInt(args[0], 10) || 6;
  if (max < 2 || max > 10000) return respond(message, { embeds: [errorEmbed("Invalid")] });
  await respond(message, { embeds: [brandEmbed("🎲 Dice Roll").setDescription(`You rolled a **${Math.floor(Math.random() * max) + 1}** (1–${max})`)] });
}

async function handleRPS(message, args) {
  const choices = ["rock", "paper", "scissors"];
  const emojis  = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const userChoice = (args[0] || "").toLowerCase();
  if (!choices.includes(userChoice)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}rps <rock|paper|scissors>\``)] });
  const botChoice = choices[Math.floor(Math.random() * 3)];
  let outcome;
  if (userChoice === botChoice) outcome = "🤝 Tie!";
  else if ((userChoice === "rock" && botChoice === "scissors") || (userChoice === "paper" && botChoice === "rock") || (userChoice === "scissors" && botChoice === "paper")) outcome = "🎉 You win!";
  else outcome = "🤖 I win!";
  await respond(message, { embeds: [brandEmbed("🎮 Rock Paper Scissors").addFields({ name: "Your Choice", value: `${emojis[userChoice]} ${userChoice}`, inline: true }, { name: "My Choice", value: `${emojis[botChoice]} ${botChoice}`, inline: true }, { name: "Result", value: outcome })] });
}

async function handlePoll(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const parts = args.join(" ").split("|").map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}poll <question> | <opt1> | <opt2>\``)] });
  const options = parts.slice(1).slice(0, 9);
  const numbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  const embed = new EmbedBuilder().setColor(INFO_COLOR).setTitle(`📊 Poll: ${parts[0]}`).setDescription(options.map((o, i) => `${numbers[i]} ${o}`).join("\n\n")).setFooter({ text: "React below to vote!" }).setTimestamp();
  try { await message.delete(); } catch {}
  const sent = await message.channel.send({ embeds: [embed] });
  for (let i = 0; i < options.length; i++) await sent.react(numbers[i]).catch(() => {});
}

async function handleTrivia(message) {
  const channelId = message.channel.id;
  if (data.triviaActive[channelId]) return respond(message, { embeds: [warnEmbed("Trivia Active").setDescription("Answer the current question first!")] });
  const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
  const rewardCoins = 50 + Math.floor(Math.random() * 50);
  data.triviaActive[channelId] = { question: q.q, answers: q.a, hint: q.hint, rewardCoins };
  saveData();
  await respond(message, { embeds: [infoEmbed("🧠 Trivia!").setDescription(`**${q.q}**\n\n*Hint: ${q.hint}*`).addFields({ name: "💰 Reward", value: `${rewardCoins} 🪙` }).setFooter({ text: "60 second timeout" })] });
  setTimeout(async () => {
    if (data.triviaActive[channelId]) {
      delete data.triviaActive[channelId]; saveData();
      await message.channel.send({ embeds: [warnEmbed("⏰ Trivia Expired").setDescription(`Answer was: **${q.a[0]}**`)] }).catch(() => {});
    }
  }, 60_000);
}

// ─────────────────────────────────────────────
//  Giveaway — FIXED
// ─────────────────────────────────────────────
async function handleGiveaway(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const raw = args.join(" ");
  const pipeIdx = raw.indexOf("|");
  if (pipeIdx < 0) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}giveaway <duration> | <prize>\`\nExample: \`${PREFIX}giveaway 24h | Discord Nitro\``)] });

  const ms    = parseDuration(raw.slice(0, pipeIdx).trim());
  const prize = raw.slice(pipeIdx + 1).trim();
  if (!ms)    return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Examples: `30m`, `2h`, `1d`")] });
  if (!prize) return respond(message, { embeds: [errorEmbed("Missing Prize")] });

  const endAt = Date.now() + ms;
  const embed = new EmbedBuilder().setColor(GOLD_COLOR).setTitle("🎉  GIVEAWAY!")
    .setDescription(`React with 🎉 to enter!\n\n**Prize:** ${prize}`)
    .addFields(
      { name: "⏰ Ends",  value: `<t:${Math.floor(endAt / 1000)}:R>`, inline: true },
      { name: "🎁 Prize", value: prize,                                inline: true },
      { name: "🏠 Host",  value: `<@${message.author.id}>`,           inline: true },
    )
    .setFooter({ text: "React with 🎉 to enter!" }).setTimestamp();

  let sent;
  try {
    sent = await message.channel.send({ content: "@here 🎉", embeds: [embed], allowedMentions: { parse: ["everyone"] } });
    await sent.react("🎉");
  } catch (err) {
    console.error("[Giveaway] Failed to send:", err.message);
    return respond(message, { embeds: [errorEmbed("Giveaway Failed").setDescription("Couldn't post the giveaway. Check bot permissions.")] });
  }

  data.giveaways[sent.id] = {
    prize,
    endAt,
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
    giveaway.ended = true; saveData();
    try {
      const guild = client.guilds.cache.get(giveaway.guildId);
      if (!guild) continue;
      const channel = await guild.channels.fetch(giveaway.channelId).catch(() => null);
      if (!channel) continue;
      const msg = await channel.messages.fetch(msgId).catch(() => null);
      if (!msg) continue;

      const reaction = msg.reactions.cache.get("🎉");
      let entrants = [];
      if (reaction) {
        let lastId;
        while (true) {
          const batch = await reaction.users.fetch({ limit: 100, ...(lastId ? { after: lastId } : {}) }).catch(() => null);
          if (!batch || batch.size === 0) break;
          entrants.push(...batch.filter(u => !u.bot).map(u => u.id));
          if (batch.size < 100) break;
          lastId = batch.last()?.id;
        }
      }

      if (!entrants.length) {
        await channel.send({ embeds: [warnEmbed("🎉 Giveaway Ended").setDescription(`**${giveaway.prize}** — No valid entries.`)] });
      } else {
        const winnerId = entrants[Math.floor(Math.random() * entrants.length)];
        await channel.send({
          content: `🎉 Congratulations <@${winnerId}>!`,
          embeds: [successEmbed("🎉 Giveaway Winner!").setDescription(`<@${winnerId}> won **${giveaway.prize}**!\nContact staff to claim your prize.`).addFields({ name: "📊 Entries", value: `${entrants.length}` }).setTimestamp()],
          allowedMentions: { users: [winnerId] },
        });
      }
    } catch (err) { console.error("Giveaway end failed:", err.message); }
  }
}

async function handleReminder(message, args) {
  const raw  = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}remindme <time> | <message>\``)] });
  const ms   = parseDuration(raw.slice(0, pipe).trim());
  const text = raw.slice(pipe + 1).trim();
  if (!ms || ms > 7 * TIME_UNITS.d) return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Max 7 days.")] });
  if (!text) return respond(message, { embeds: [errorEmbed("Missing Message")] });
  await respond(message, { embeds: [successEmbed("⏰ Reminder Set!").setDescription(`I'll ping you in **${formatDuration(ms)}**.\n> ${text}`)] });
  setTimeout(async () => {
    await message.channel.send({ content: `<@${message.author.id}>`, embeds: [brandEmbed("⏰ Reminder!").setDescription(`> ${text}`).setTimestamp()] }).catch(() => {});
  }, ms);
}

async function handleColor(message, args) {
  const hex = (args[0] || "").replace("#", "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}color <hex>\``)] });
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  await respond(message, { embeds: [new EmbedBuilder().setColor(parseInt(hex, 16)).setTitle(`🎨 Color #${hex.toUpperCase()}`)
    .addFields({ name: "HEX", value: `#${hex.toUpperCase()}`, inline: true }, { name: "RGB", value: `${r}, ${g}, ${b}`, inline: true }, { name: "INT", value: `${parseInt(hex, 16)}`, inline: true })
    .setImage(`https://singlecolorimage.com/get/${hex}/200x80`).setTimestamp()] });
}

async function handleEmbed(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const raw = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}embed <title> | <description>\``)] });
  const title = raw.slice(0, pipe).trim(), desc = raw.slice(pipe + 1).trim();
  if (!title || !desc) return respond(message, { embeds: [errorEmbed("Missing Fields")] });
  try { await message.delete(); } catch {}
  await message.channel.send({ embeds: [new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setDescription(desc).setTimestamp()] });
}

async function handleCalc(message, args) {
  const expr = args.join(" ").trim().replace(/[^0-9+\-*/.() %^]/g, "");
  if (!expr) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}calc <expression>\``)] });
  try {
    const result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("Invalid");
    await respond(message, { embeds: [brandEmbed("🧮 Calculator").addFields({ name: "Input", value: `\`${expr}\``, inline: true }, { name: "Result", value: `\`${result}\``, inline: true })] });
  } catch { await respond(message, { embeds: [errorEmbed("Invalid Expression")] }); }
}

async function handleServerIcon(message) {
  if (!message.guild.iconURL()) return respond(message, { embeds: [errorEmbed("No Icon")] });
  const url = message.guild.iconURL({ size: 1024, extension: "png" });
  await respond(message, { embeds: [brandEmbed(`🖼️ ${message.guild.name}`).setURL(url).setImage(url)] });
}

async function handleBanner(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user; try { user = await client.users.fetch(userId, { force: true }); } catch { return respond(message, { embeds: [errorEmbed("User Not Found")] }); }
  if (!user.bannerURL()) return respond(message, { embeds: [warnEmbed("No Banner")] });
  const url = user.bannerURL({ size: 1024, extension: "png" });
  await respond(message, { embeds: [brandEmbed(`🖼️ ${user.username}'s Banner`).setURL(url).setImage(url)] });
}

async function handleSlowmode(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageChannels)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const secs = parseInt(args[0], 10);
  if (!Number.isFinite(secs) || secs < 0 || secs > 21600) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}slowmode <0-21600>\``)] });
  await message.channel.setRateLimitPerUser(secs);
  await respond(message, { embeds: [successEmbed("🐢 Slowmode Updated").setDescription(secs === 0 ? "Disabled." : `Set to **${secs}s**.`)] });
}

async function handleLock(message) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageChannels)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
  await respond(message, { embeds: [errorEmbed("🔒 Channel Locked").setDescription("Only staff can send messages.").setTimestamp()] });
  await logMod(message.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🔒 Channel Locked").addFields({ name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "By", value: message.author.tag, inline: true }).setTimestamp());
}

async function handleUnlock(message) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageChannels)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
  await respond(message, { embeds: [successEmbed("🔓 Channel Unlocked").setTimestamp()] });
}

async function handleNick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageNicknames)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}nick @user [nickname]\``)] });
  const nick = args.slice(1).join(" ").trim() || null;
  let member; try { member = await message.guild.members.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); }
  if (!member.manageable) return respond(message, { embeds: [errorEmbed("Can't Edit")] });
  await member.setNickname(nick);
  await respond(message, { embeds: [successEmbed("✅ Nickname Updated").addFields({ name: "User", value: `<@${userId}>`, inline: true }, { name: "Nick", value: nick || "(cleared)", inline: true }).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  AI Commands
// ─────────────────────────────────────────────
const IMAGE_REQUEST_RE = /^(generate|draw|paint|create|make|design|imagine|show me|render)\s+(an?\s+)?(image|picture|pic|photo|art|artwork|illustration|wallpaper|logo|banner|portrait|landscape|sketch)/i;
const aiCooldowns = new Map();

async function handleAI(message, args) {
  if (!GROQ_API_KEY) return message.channel.send({ content: "❌ No `GROQ_API_KEY` configured.", allowedMentions: { users: [] } });
  const prompt = args.join(" ").trim();
  if (!prompt) return message.channel.send({ content: `-# 🤖 **Snuggles AI**\n\n**Usage:** \`${PREFIX}ai <your message>\`\n\nAsk me anything — coding, writing, math, creative ideas, or general chat.`, allowedMentions: { users: [] } });

  await message.channel.sendTyping().catch(() => {});

  if (IMAGE_REQUEST_RE.test(prompt)) {
    try {
      const seed = Math.floor(Math.random() * 999999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
      await message.channel.send({ content: `-# 🎨 **Snuggles AI**  •  image generation  •  asked by ${message.author.username}\n\n**Prompt:** ${prompt}\n${imageUrl}`, allowedMentions: { users: [] } });
    } catch { await message.channel.send({ content: "❌ Image generation failed.", allowedMentions: { users: [] } }); }
    return;
  }

  const sessionId = `ai_${message.author.id}`;
  if (!ticketConversations.has(sessionId)) ticketConversations.set(sessionId, []);
  const history = ticketConversations.get(sessionId);
  history.push({ role: "user", content: prompt });
  while (history.length > 30) history.shift();

  let aiText = null;
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model, max_tokens: 1200, temperature: 0.7, messages: [{ role: "system", content: AI_CHAT_PROMPT }, ...history] }),
      });
      if (!res.ok) { if (res.status === 429) continue; continue; }
      const result = await res.json();
      aiText = result.choices?.[0]?.message?.content?.trim() || null;
      if (aiText) { history.push({ role: "assistant", content: aiText }); break; }
    } catch { continue; }
  }

  if (!aiText) return message.channel.send({ content: "❌ All AI models are busy. Try again in a moment.", allowedMentions: { users: [] } });

  const chunks = [];
  let rem = aiText;
  while (rem.length > 0) { chunks.push(rem.slice(0, 1900)); rem = rem.slice(1900); }
  for (let i = 0; i < chunks.length; i++) {
    const header = i === 0 ? `-# 🤖 **Snuggles AI**  •  asked by ${message.author.username}\n\n` : "";
    await message.channel.send({ content: `${header}${chunks[i]}`, allowedMentions: { users: [] } });
  }
}

async function handleAIToggle(message, args, commandName) {
  const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
  if (!isStaff) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (!message.channel.name?.startsWith("ticket-")) return respond(message, { embeds: [warnEmbed("Ticket Channels Only")] });
  if (commandName === "aioff") {
    ticketAIDisabled.add(message.channel.id);
    return message.channel.send({ content: "🔇 Ticket AI **turned off** for this ticket.", allowedMentions: { users: [] } });
  } else {
    ticketAIDisabled.delete(message.channel.id);
    return message.channel.send({ content: "🔊 Ticket AI **turned on** for this ticket.", allowedMentions: { users: [] } });
  }
}

// ─────────────────────────────────────────────
//  Help — redesigned
// ─────────────────────────────────────────────
async function handleHelp(message, args) {
  const sub = (args[0] || "").toLowerCase();

  const categories = {
    general:     { emoji: "📌", name: "General",             commands: ["help [cat]", "info", "ping", "status", "rules", "uptime", "ai <msg>", "aioff / aion"] },
    commissions: { emoji: "💼", name: "Commissions",         commands: ["services", "prices", "pay", "orderinfo <id>", "discount", "ticket"] },
    portfolio:   { emoji: "🎨", name: "Portfolio",           commands: ["work [page]", "addwork <url> [title]", "removework <id>"] },
    scripting:   { emoji: "🔧", name: "Scripting",           commands: ["script <type>", "snippet", "docs", "debug", "tip"] },
    leveling:    { emoji: "📊", name: "Leveling & Economy",  commands: ["level [user]", "rank [user]", "leaderboard", "balance [user]", "dowork", "daily", "shop", "buy <id>"] },
    fun:         { emoji: "🎉", name: "Fun & Games",         commands: ["quote", "meme", "8ball <q>", "rate <thing>", "coinflip", "roll [max]", "rps <choice>", "trivia", "remindme <t> | <msg>", "color <hex>", "calc <expr>"] },
    info:        { emoji: "ℹ️", name: "Info",                commands: ["userinfo [user]", "serverinfo", "avatar [user]", "banner [user]", "servericon", "stats", "invites [user]", "inviteleaderboard"] },
    reviews:     { emoji: "⭐", name: "Reviews",             commands: ["review <1-5> <type> | <msg>", "vouch <text>"] },
    moderation:  { emoji: "🔨", name: "Moderation",          commands: ["ban @user <reason>", "kick @user [reason]", "mute @user <time>", "warn @user <reason>", "warns @user", "unwarn <id>", "purge <1-100>", "lock", "unlock", "slowmode <secs>", "nick @user [name]"] },
    admin:       { emoji: "⚙️", name: "Admin",               commands: ["announce [#ch] <msg>", "partner <format> ...", "poll <q> | <opts>", "giveaway <time> | <prize>", "embed <title> | <body>", "addorder @user <details>", "updateorder <id> <status> [note]", "complete <id>", "blacklist @user", "setlog [#ch]", "setreviews [#ch]", "settranscripts [#ch]", "ticketpanel", "ticketrole ...", "ticketconfig ...", "close <reason>", "addnote <text>", "givecoins @user <amt>", "say <msg>", "antiraid ...", "antinuke ..."] },
  };

  if (sub && categories[sub]) {
    const cat = categories[sub];
    return respond(message, { embeds: [new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`${cat.emoji}  ${cat.name} Commands`)
      .setDescription(cat.commands.map(c => `\`${PREFIX}${c}\``).join("\n"))
      .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}  •  s!help for all categories` })
      .setTimestamp()] });
  }

  await respond(message, { embeds: [new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧸  ${BOT_NAME}  —  Command Help`)
    .setDescription(
      `**Prefix:** \`${PREFIX}\`  |  **Version:** v${BOT_VERSION}\n` +
      `Use \`${PREFIX}help <category>\` to see commands in that category.\n\n` +
      `\`\`\`\n╔══════════════════════════════╗\n║    Select a category below   ║\n╚══════════════════════════════╝\n\`\`\``
    )
    .addFields(
      ...Object.entries(categories).map(([key, cat]) => ({
        name: `${cat.emoji}  ${cat.name}`,
        value: `\`${PREFIX}help ${key}\`  •  ${cat.commands.length} commands`,
        inline: true,
      })),
      { name: "\u200b", value: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" },
      { name: "🎫 Open a Ticket",   value: "Click the buttons in the ticket panel channel.", inline: true },
      { name: "💬 Need Help?",      value: "Open a General Inquiry ticket.",                inline: true },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}  •  Made with 💗 by ${BOT_OWNER}` })
    .setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Info commands
// ─────────────────────────────────────────────
async function handleInfo(message) {
  const up = Math.floor(process.uptime());
  const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = up % 60;
  await respond(message, { embeds: [brandEmbed(`🧸  ${BOT_NAME}`)
    .setDescription("A feature-rich scripting services bot for the Snuggles Scripting community.")
    .addFields(
      { name: "🤖 Bot Tag",  value: client.user?.tag || "Unknown", inline: true },
      { name: "📦 Version",  value: `v${BOT_VERSION}`,             inline: true },
      { name: "👑 Owner",    value: BOT_OWNER,                     inline: true },
      { name: "📚 Library",  value: "discord.js v14",              inline: true },
      { name: "⚙️ Runtime",  value: `Node.js ${process.version}`,  inline: true },
      { name: "🌐 Servers",  value: `${client.guilds.cache.size}`, inline: true },
      { name: "⏱️ Uptime",   value: `${h}h ${m}m ${s}s`,          inline: true },
      { name: "📋 Orders",   value: `${data.orders.length} total`, inline: true },
      { name: "⭐ Reviews",  value: `${data.reviews.length} total`, inline: true },
      { name: "🤖 AI",       value: GROQ_API_KEY ? "✅ Groq Connected" : "❌ No API Key", inline: true },
    ).setTimestamp()] });
}

async function handleStatus(message) {
  const wsPing = Math.max(0, Math.round(client.ws.ping));
  const sent = await message.channel.send({ embeds: [infoEmbed("🔍 Checking…")] });
  const apiLatency = sent.createdTimestamp - message.createdTimestamp;
  await sent.edit({ content: "", embeds: [successEmbed("🟢  All Systems Operational")
    .addFields(
      { name: "🤖 Bot",       value: "🟢 Online",                                          inline: true },
      { name: "📡 Gateway",   value: `${wsPing}ms`,                                       inline: true },
      { name: "🌐 API",       value: `${apiLatency}ms`,                                   inline: true },
      { name: "📋 Orders",    value: `🟢 ${data.orders.filter(o => o.status !== "completed").length} active`, inline: true },
      { name: "📊 Leveling",  value: `🟢 ${Object.keys(data.leveling).length} users`,    inline: true },
      { name: "💰 Economy",   value: `🟢 ${Object.keys(data.economy).length} accounts`,  inline: true },
      { name: "🤖 Ticket AI", value: GROQ_API_KEY ? "🟢 Groq Ready" : "🔴 No API Key", inline: true },
    ).setTimestamp()] });
}

async function handlePing(message) {
  await respond(message, { embeds: [successEmbed("🏓 Pong!").addFields({ name: "Gateway", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true })] });
}

async function handleRules(message) {
  await respond(message, { embeds: [brandEmbed("📜 Server Rules").setDescription(SERVER_RULES.join("\n\n")).setFooter({ text: "Please follow the rules to keep this community safe." }).setTimestamp()] });
}

async function handlePrices(message) {
  await respond(message, { embeds: [new EmbedBuilder().setTitle(PAYMENT_INFO.title).setDescription(PAYMENT_INFO.description).setColor(SUCCESS_COLOR)
    .addFields(...PAYMENT_INFO.methods.map(m => ({ name: m.name, value: m.value })), { name: "⚠️ Refund Policy", value: PAYMENT_INFO.note }).setTimestamp()] });
}

async function handleServices(message) {
  await respond(message, { embeds: [brandEmbed("🛍️ Services").setDescription("Here's everything we offer. Open a ticket to get started.").addFields(SERVICES).setTimestamp()] });
}

async function handleUptime(message) {
  await respond(message, { embeds: [brandEmbed("⏱️ Uptime").setDescription(`Online for **${formatDuration(client.uptime || 0)}**.`).setTimestamp()] });
}

async function handleScript(message, args) {
  const type = (args[0] || "").toLowerCase();
  const available = Object.keys(SCRIPT_EXAMPLES).join(", ");
  if (!type) return respond(message, { embeds: [warnEmbed("Missing Type").setDescription(`\`${PREFIX}script <${available}>\``)] });
  const example = SCRIPT_EXAMPLES[type];
  if (!example) return respond(message, { embeds: [errorEmbed("Unknown Type").setDescription(`Available: \`${available}\``)] });
  await respond(message, { embeds: [brandEmbed(`📜 ${example.title}`).setDescription("```lua\n" + example.code + "\n```").setTimestamp()] });
}

async function handleSnippet(message) {
  const s = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
  await respond(message, { embeds: [brandEmbed(`💡 ${s.title}`).setDescription("```lua\n" + s.code + "\n```")] });
}

async function handleDocs(message) {
  await respond(message, { embeds: [brandEmbed("📚 Resources").setDescription("Essential Roblox/Luau references.").addFields(DOCS.map(d => ({ name: d.name, value: d.value }))).setTimestamp()] });
}

async function handleDebug(message) {
  await respond(message, { embeds: [warnEmbed("🐛 Debug Template").setDescription("```\nWhat you're trying to do:\n<describe goal>\n\nWhat's happening:\n<describe issue>\n\nError (if any):\n<paste from Output>\n\nRelevant code:\n<paste broken section>\n\nWhat you've tried:\n<list attempts>\n```")] });
}

async function handleUserInfo(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let member = null, user = null;
  try { member = await message.guild.members.fetch(userId); user = member.user; }
  catch { try { user = await client.users.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); } }
  const embed = brandEmbed(`👤 ${user.tag}`).setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields({ name: "🆔 ID", value: user.id, inline: true }, { name: "🤖 Bot", value: user.bot ? "Yes" : "No", inline: true }, { name: "📅 Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` });
  if (member) {
    if (member.joinedTimestamp) embed.addFields({ name: "📥 Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` });
    const roles = member.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position).map(r => `<@&${r.id}>`).slice(0, 15);
    if (roles.length) embed.addFields({ name: `🎭 Roles (${roles.length})`, value: roles.join(" ") });
    const lv = getLeveling(userId), eco = getEconomy(userId);
    embed.addFields(
      { name: "🏆 Level",      value: `${lv.level}`,                          inline: true },
      { name: "💰 Coins",      value: `${eco.coins || 0} 🪙`,                 inline: true },
      { name: "⚠️ Warnings",  value: `${(data.warns[user.id] || []).length}`, inline: true },
      { name: "🚫 Blacklisted",value: data.blacklist.includes(user.id) ? "Yes" : "No", inline: true },
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
  await respond(message, { embeds: [brandEmbed(`🏠 ${guild.name}`).setThumbnail(guild.iconURL({ size: 256 }) || null)
    .addFields(
      { name: "🆔 ID",         value: guild.id,                                                          inline: true },
      { name: "👑 Owner",      value: owner ? owner.user.tag : "—",                                      inline: true },
      { name: "📅 Created",    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>` },
      { name: "👥 Members",    value: `${guild.memberCount}`,                                            inline: true },
      { name: "🎭 Roles",      value: `${guild.roles.cache.size}`,                                      inline: true },
      { name: "😄 Emojis",     value: `${guild.emojis.cache.size}`,                                     inline: true },
      { name: "💬 Text",       value: `${channels.filter(c => c.type === ChannelType.GuildText).size}`, inline: true },
      { name: "🔊 Voice",      value: `${channels.filter(c => c.type === ChannelType.GuildVoice).size}`,inline: true },
      { name: "✨ Boost Tier", value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)` },
    ).setTimestamp()] });
}

async function handleAvatar(message, args) {
  const userId = parseUserId(args[0]) || message.author.id;
  let user; try { user = await client.users.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); }
  const url = user.displayAvatarURL({ size: 1024, extension: "png" });
  await respond(message, { embeds: [brandEmbed(`🖼️ ${user.tag}`).setURL(url).setImage(url)] });
}

async function handleStats(message) {
  const stats = data.stats || {};
  const active    = data.orders.filter(o => o.status !== "completed" && o.status !== "cancelled").length;
  const completed = data.orders.filter(o => o.status === "completed").length;
  const total = data.reviews.length;
  const avg   = total ? (data.reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : "—";
  await respond(message, { embeds: [brandEmbed("📈 Bot Stats").addFields(
    { name: "📦 Active Orders",  value: `${active}`,                          inline: true },
    { name: "✅ Completed",      value: `${completed}`,                       inline: true },
    { name: "🎟️ Tickets Opened",value: `${stats.ticketsOpened || 0}`,        inline: true },
    { name: "⭐ Reviews",        value: `${total} (avg ${avg}⭐)`,            inline: true },
    { name: "🎨 Portfolio",      value: `${data.portfolio.length} entries`,   inline: true },
    { name: "📊 Level Users",    value: `${Object.keys(data.leveling).length}`, inline: true },
  ).setTimestamp()] });
}

async function handleReview(message, args) {
  const raw  = args.join(" ");
  const pipe = raw.indexOf("|");
  if (pipe < 0) return respond(message, { embeds: [warnEmbed("Format").setDescription(`\`${PREFIX}review <1-5> <type> | <message>\``)] });
  const left = raw.slice(0, pipe).trim().split(/\s+/);
  const reviewMessage = raw.slice(pipe + 1).trim();
  const rating = parseInt(left[0], 10);
  const commissionType = left.slice(1).join(" ").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return respond(message, { embeds: [errorEmbed("Invalid Rating")] });
  if (!commissionType || !reviewMessage) return respond(message, { embeds: [errorEmbed("Missing Fields")] });
  const review = { id: data.nextReviewId++, userId: message.author.id, username: message.author.tag, commissionType, rating, message: reviewMessage, at: new Date().toISOString() };
  data.reviews.push(review);
  data.stats.reviewsSubmitted = (data.stats.reviewsSubmitted || 0) + 1;
  saveData();
  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
  const embed = brandEmbed("⭐ New Review").setThumbnail(message.author.displayAvatarURL())
    .addFields({ name: "👤 From", value: message.author.tag, inline: true }, { name: "🛠️ Commission", value: commissionType, inline: true }, { name: "📊 Rating", value: `${stars} (${rating}/5)` }, { name: "💬 Review", value: reviewMessage })
    .setTimestamp();
  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    const target = await message.guild.channels.fetch(settings.reviewsChannelId).catch(() => null);
    if (target?.isTextBased()) { await target.send({ embeds: [embed] }); return respond(message, { embeds: [successEmbed("✅ Review Posted").setDescription(`Posted in <#${settings.reviewsChannelId}>!`)] }); }
  }
  return respond(message, { embeds: [embed] });
}

async function handleVouch(message, args) {
  const text = args.join(" ").trim();
  if (!text) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}vouch <note>\``)] });
  const embed = successEmbed("✅ Vouch").setDescription(`> ${text}`).setThumbnail(message.author.displayAvatarURL()).setFooter({ text: `by ${message.author.tag}` }).setTimestamp();
  const settings = getGuildSettings(message.guild.id);
  if (settings.reviewsChannelId) {
    const target = await message.guild.channels.fetch(settings.reviewsChannelId).catch(() => null);
    if (target?.isTextBased()) { await target.send({ embeds: [embed] }); return respond(message, { embeds: [successEmbed("✅ Posted!")] }); }
  }
  return respond(message, { embeds: [embed] });
}

async function handlePay(message) {
  await respond(message, { embeds: [brandEmbed("💸 Payment Details")
    .setDescription("Send payment using one of the methods below, then drop a screenshot in your ticket.")
    .addFields({ name: "💵 CashApp", value: "[$siahhispaid](https://cash.app/$siahhispaid)", inline: true }, { name: "🅿️ PayPal", value: "[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)", inline: true }, { name: "⚠️ Note", value: "**Friends & Family only.** All sales final — no refunds." })
    .setTimestamp()] });
}

async function handleQuote(message) {
  await respond(message, { embeds: [brandEmbed("💭 Motivation").setDescription(`*${QUOTES[Math.floor(Math.random() * QUOTES.length)]}*`).setFooter({ text: `${BOT_NAME} • Keep building 🧸` })] });
}

async function handleTip(message) {
  await respond(message, { embeds: [brandEmbed("💡 Scripting Tip").setDescription(TIPS[Math.floor(Math.random() * TIPS.length)])] });
}

async function handleMeme(message) {
  try {
    const res = await fetch("https://meme-api.com/gimme/wholesomememes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();
    if (m.nsfw || m.spoiler) throw new Error("filtered");
    await respond(message, { embeds: [brandEmbed(m.title || "Meme").setURL(m.postLink).setImage(m.url)] });
  } catch { await respond(message, { embeds: [errorEmbed("Meme Unavailable")] }); }
}

async function handle8Ball(message, args) {
  const question = args.join(" ").trim();
  if (!question) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}8ball <question>\``)] });
  await respond(message, { embeds: [brandEmbed("🎱 Magic 8-Ball").addFields({ name: "❓", value: question.slice(0, 1000) }, { name: "🎱", value: `**${EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)]}**` })] });
}

async function handleRate(message, args) {
  const thing = args.join(" ").trim();
  if (!thing) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}rate <thing>\``)] });
  const score = Math.floor(Math.random() * 11);
  const bar   = "█".repeat(score) + "░".repeat(10 - score);
  const emoji = score >= 8 ? "🔥" : score >= 5 ? "😊" : score >= 3 ? "😐" : "💀";
  await respond(message, { embeds: [brandEmbed("📊 Rating").setDescription(`${emoji} I rate **${thing}** a **${score}/10**\n\`${bar}\``)] });
}

async function handleDaily(message) {
  const userId = message.author.id;
  const last   = data.dailyClaims[userId] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < 86_400_000) {
    const remaining = 86_400_000 - elapsed;
    const h = Math.floor(remaining / 3_600_000), m = Math.floor((remaining % 3_600_000) / 60_000);
    return respond(message, { embeds: [warnEmbed("⏰ Already Claimed").setDescription(`Come back in **${h}h ${m}m**.`)] });
  }
  data.dailyClaims[userId] = Date.now();
  const reward = DAILY_REWARDS[Math.floor(Math.random() * DAILY_REWARDS.length)];
  getEconomy(userId).coins = (getEconomy(userId).coins || 0) + reward.coins;
  saveData();
  await respond(message, { embeds: [successEmbed("🎁 Daily Reward Claimed!").setDescription(`${reward.text}\n\n**+${reward.coins} 🪙 coins** added!`).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Ticket System
// ─────────────────────────────────────────────
async function handleTicket(message) {
  return respond(message, { embeds: [brandEmbed("🎫 Open a Ticket").setDescription("Please use the **ticket panel** in the designated channel.\n\n📦 **Order** — Commission a script\n🤝 **Partnership** — Partner with us\n❓ **Inquiry** — Questions & support\n\nIf no panel is visible, ask staff to post one with `s!ticketpanel`.")] });
}

async function handleTicketPanel(message) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageChannels))
    return respond(message, { embeds: [errorEmbed("No Permission")] });
  const settings = getGuildSettings(message.guild.id);
  settings.ticketPanelChannelId = message.channel.id;
  saveData();
  const { embed, row } = buildTicketPanelEmbed();
  const sent = await respond(message, { embeds: [embed], components: [row] });
  if (sent) { settings.ticketPanelMessageId = sent.id; saveData(); }
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
  const lines = [`Transcript: #${channel.name}`, `Generated: ${new Date().toISOString()}`, `Messages: ${all.length}`, "─".repeat(40), ""];
  for (const m of all) {
    let body = m.content || "";
    if (m.embeds?.length) body += ` [${m.embeds.length} embed(s)]`;
    if (m.attachments?.size) for (const a of m.attachments.values()) body += ` [Attachment: ${a.url}]`;
    lines.push(`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${body || "(no content)"}`);
  }
  return lines.join("\n");
}

async function handleClose(message) {
  if (!message.channel.name?.startsWith("ticket-"))
    return respond(message, { embeds: [errorEmbed("Wrong Channel").setDescription("Only works inside a ticket.")] });
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/).slice(1);
  const reason = args.join(" ").trim();
  if (!reason) return respond(message, { embeds: [warnEmbed("Provide a Reason").setDescription(`\`${PREFIX}close <reason>\``)] });
  await closeTicketChannel(message.channel, message.member || message.author, reason, message.guild);
}

async function closeTicketChannel(channel, closer, reason, guild) {
  let ownerId = null;
  for (const [id, overwrite] of channel.permissionOverwrites.cache) {
    if (overwrite.type === 1) { ownerId = id; break; }
  }
  let transcript = "";
  try { transcript = await buildTranscript(channel); }
  catch (err) { transcript = `Transcript failed: ${err.message}`; }

  const transcriptBuffer = Buffer.from(transcript, "utf8");
  const transcriptFile   = { attachment: transcriptBuffer, name: `${channel.name}-transcript.txt` };

  const settings = getGuildSettings(guild.id);
  const targetChannelId = settings.transcriptsChannelId || data.modLogChannels[guild.id];
  if (targetChannelId) {
    const target = await guild.channels.fetch(targetChannelId).catch(() => null);
    if (target?.isTextBased()) {
      await target.send({ embeds: [brandEmbed("🎟️ Ticket Closed").addFields({ name: "Channel", value: `#${channel.name}` }, { name: "Closed by", value: closer.user?.tag || closer.tag, inline: true }, { name: "Reason", value: reason, inline: true }).setTimestamp()], files: [transcriptFile] }).catch(() => {});
    }
  }

  if (ownerId) {
    try {
      const owner = await client.users.fetch(ownerId).catch(() => null);
      if (owner) await owner.send({ embeds: [brandEmbed("🎟️ Ticket Closed").setDescription(`Your ticket **#${channel.name}** was closed.\n**Reason:** ${reason}\n\nTranscript attached.`).setTimestamp()], files: [{ attachment: Buffer.from(transcript, "utf8"), name: `${channel.name}-transcript.txt` }] });
    } catch {}
  }

  ticketConversations.delete(channel.id);
  data.stats.ticketsClosed = (data.stats.ticketsClosed || 0) + 1;
  saveData();
  await channel.send({ embeds: [warnEmbed("🔒 Closing in 5 seconds…").setDescription(`**Reason:** ${reason}`)] });
  setTimeout(() => channel.delete(`Closed: ${reason}`).catch(() => {}), 5000);
}

async function handleAddNote(message, args) {
  if (!message.channel.name?.startsWith("ticket-")) return respond(message, { embeds: [errorEmbed("Wrong Channel")] });
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const text = args.join(" ").trim();
  if (!text) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}addnote <text>\``)] });
  await respond(message, { embeds: [new EmbedBuilder().setTitle("📝 Staff Note").setDescription(text).setColor(NOTE_COLOR).setFooter({ text: `by ${message.author.tag}` }).setTimestamp()] });
}

async function openTicketForUser(channel, member, ticketType, formAnswers) {
  const guild = channel.guild;
  if (!guild || !member) return { ok: false, error: "Tickets can only be created inside a server." };
  const safeName    = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "user";
  const channelName = `ticket-${safeName}`;
  const settings    = getGuildSettings(guild.id);
  const maxOpen     = settings.maxOpenTickets || 1;
  const userTickets = guild.channels.cache.filter(c => c.type === ChannelType.GuildText && c.name.startsWith("ticket-") && c.permissionOverwrites.cache.has(member.id));
  if (userTickets.size >= maxOpen) return { ok: false, error: `You already have **${userTickets.size}** open ticket(s). Max: ${maxOpen}.` };

  let finalChannelName = channelName;
  if (guild.channels.cache.find(c => c.name === finalChannelName)) finalChannelName = `${channelName}-${Date.now().toString(36).slice(-4)}`;

  const staffRoles = settings.ticketStaffRoles || [];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
  ];
  if (client.user) overwrites.push({ id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] });
  for (const roleId of staffRoles) overwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] });
  guild.roles.cache.forEach(role => {
    if (role.permissions.has(PermissionFlagsBits.ManageMessages) && !role.managed && !staffRoles.includes(role.id))
      overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });
  });

  const createOptions = { name: finalChannelName, type: ChannelType.GuildText, topic: `[${ticketType}] Ticket for ${member.user.tag}`, permissionOverwrites: overwrites, reason: `Ticket (${ticketType}) by ${member.user.tag}` };
  if (settings.ticketCategoryId) createOptions.parent = settings.ticketCategoryId;

  let created;
  try { created = await guild.channels.create(createOptions); }
  catch { return { ok: false, error: "Couldn't create ticket. Check bot permissions (**Manage Channels**)." }; }

  data.stats.ticketsOpened = (data.stats.ticketsOpened || 0) + 1;
  saveData();

  const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close_button").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"));

  let detailsEmbed, formContextText = "";
  if (ticketType === "order") {
    formContextText = [`Roblox Username: ${formAnswers.username}`, `Service: ${formAnswers.service}`, `Description: ${formAnswers.description}`, `Budget: ${formAnswers.budget}`, `Payment: ${formAnswers.payment}`].join("\n");
    detailsEmbed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle("📦 New Order Ticket")
      .addFields({ name: "👤 Roblox Username", value: formAnswers.username || "—" }, { name: "🛠️ Service Needed", value: formAnswers.service || "—" }, { name: "📝 Description", value: formAnswers.description || "—" }, { name: "💰 Budget", value: formAnswers.budget || "—", inline: true }, { name: "💳 Payment", value: formAnswers.payment || "—", inline: true })
      .setFooter({ text: `Order Ticket • ${member.user.tag}` }).setTimestamp();
  } else if (ticketType === "partnership") {
    formContextText = [`Server: ${formAnswers.serverName}`, `Invite: ${formAnswers.invite}`, `Members: ${formAnswers.memberCount}`, `Focus: ${formAnswers.focus}`, `Offering: ${formAnswers.offering}`].join("\n");
    detailsEmbed = new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🤝 New Partnership Ticket")
      .addFields({ name: "🏠 Server Name", value: formAnswers.serverName || "—" }, { name: "🔗 Invite", value: formAnswers.invite || "—" }, { name: "👥 Members", value: formAnswers.memberCount || "—", inline: true }, { name: "🎯 Focus", value: formAnswers.focus || "—", inline: true }, { name: "🤝 What They Offer", value: formAnswers.offering || "—" })
      .setFooter({ text: `Partnership Ticket • ${member.user.tag}` }).setTimestamp();
  } else {
    formContextText = [`Name: ${formAnswers.name}`, `Topic: ${formAnswers.topic}`, `Details: ${formAnswers.details}`, `Urgency: ${formAnswers.urgency || "Not specified"}`].join("\n");
    detailsEmbed = new EmbedBuilder().setColor(INFO_COLOR).setTitle("❓ General Inquiry Ticket")
      .addFields({ name: "👤 Name", value: formAnswers.name || "—" }, { name: "❓ Topic", value: formAnswers.topic || "—" }, { name: "📝 Details", value: formAnswers.details || "—" }, { name: "⚡ Urgency", value: formAnswers.urgency || "Not specified", inline: true })
      .setFooter({ text: `Inquiry Ticket • ${member.user.tag}` }).setTimestamp();
  }

  if (hasOrdered(member.id) && ticketType === "order") detailsEmbed.addFields({ name: "🎟️ Loyalty Discount", value: "✅ Returning customer — **5% off** applied!" });

  const greetingText = settings.ticketGreeting ? `\n\n> ${settings.ticketGreeting}` : "";
  await created.send({ content: `<@${member.id}> — Welcome to your ticket! 💗${greetingText}`, embeds: [detailsEmbed], components: [closeRow] });

  // AI greeting — non-blocking
  if (settings.ticketAI !== false && GROQ_API_KEY) {
    setImmediate(async () => {
      try {
        const aiGreeting = `A new ${ticketType} ticket has been opened. Here is what the user submitted:\n\n${formContextText}\n\nPlease greet them warmly and help them with their request.`;
        const aiResponse = await callTicketAI(created.id, aiGreeting, ticketType, formContextText);
        if (aiResponse) await created.send({ content: `-# 🤖 **Snuggles AI**  •  Support\n\n${aiResponse}`, allowedMentions: { users: [] } });
      } catch {}
    });
  }

  // Partnership flow — member count check + ad collection
  if (ticketType === "partnership") {
    setImmediate(async () => {
      try {
        const rawCount    = String(formAnswers.memberCount || "0").replace(/,/g, "").match(/\d+/);
        const memberCount = rawCount ? parseInt(rawCount[0], 10) : 0;
        const MIN_MEMBERS = 45;

        if (memberCount > 0 && memberCount < MIN_MEMBERS) {
          const declineEmbed = new EmbedBuilder().setColor(ERROR_COLOR).setTitle("❌ Partnership Declined")
            .setDescription(`Thank you for your interest in partnering with **${BOT_NAME}**! 💗\n\nUnfortunately we require a minimum of **${MIN_MEMBERS} members**. Your server has **${memberCount}** member(s). Feel free to apply again once you've grown! 🌸`)
            .setFooter({ text: `${BOT_NAME} • Partnership Requirements` }).setTimestamp();
          await created.send({ embeds: [declineEmbed] });
          setTimeout(async () => { try { await created.delete("Partnership declined: under minimum members"); } catch {} }, 10_000);
          return;
        }

        let pingContent = "", tierLabel = "";
        if (memberCount >= 120) { pingContent = "@everyone"; tierLabel = "🔥 Large Server (120+)"; }
        else if (memberCount >= 70) { pingContent = "@here"; tierLabel = "✨ Mid-Size Server (70–119)"; }
        else { pingContent = ""; tierLabel = "🌱 Small Server (45–69)"; }

        partnerAwaitingAd.set(created.id, { member, formAnswers, memberCount, pingContent, tierLabel });

        const adRequestPrompt = [
          `A partnership application was submitted. Details:`,
          `Server: ${formAnswers.serverName}, Members: ${formAnswers.memberCount} (Tier: ${tierLabel})`,
          `Focus: ${formAnswers.focus}, Offering: ${formAnswers.offering}, Invite: ${formAnswers.invite}`,
          `Their application meets our requirements! Now ask them to send their server ad text`,
          `(a short description to be posted in our partner channel) and optionally a banner image.`,
          `Be warm, professional, and exciting. 💗`,
        ].join("\n");

        const aiResponse = await callTicketAI(created.id, adRequestPrompt, "partnership", formContextText);
        if (aiResponse) await created.send({ content: `-# 🤖 **Snuggles AI**  •  Partnership Manager\n\n${aiResponse}`, allowedMentions: { users: [] } });
      } catch (err) { console.error("[Partner AI] Setup failed:", err.message); }
    });
  }

  return { ok: true, channel: created };
}

// ─────────────────────────────────────────────
//  Portfolio
// ─────────────────────────────────────────────
const IMAGE_EXT_RE   = /\.(png|jpe?g|gif|webp|bmp)(?:\?|$)/i;
const VIDEO_EXT_RE   = /\.(mov|mp4|webm|m4v|mkv)(?:\?|$)/i;
const GENERIC_URL_RE = /^https?:\/\/\S+$/i;
const MEDIA_HOSTS    = ["cdn.discordapp.com", "media.discordapp.net", "i.imgur.com", "imgur.com", "youtube.com", "youtu.be"];

function looksLikeMediaUrl(url) {
  if (!url) return false;
  if (IMAGE_EXT_RE.test(url) || VIDEO_EXT_RE.test(url)) return true;
  try { const u = new URL(url); return MEDIA_HOSTS.some(h => u.hostname.endsWith(h)); } catch { return false; }
}
function isVideoUrl(url) { return VIDEO_EXT_RE.test(url || ""); }

async function handlePortfolio(message, args) {
  if (!data.portfolio.length) return respond(message, { embeds: [brandEmbed("🎨 Portfolio").setDescription("No work added yet.")] });
  const total = data.portfolio.length;
  let page = parseInt(args[0], 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > total) page = total;
  const work  = [...data.portfolio].reverse()[page - 1];
  const embed = brandEmbed(`🎨 Portfolio — ${work.title || `Entry #${work.id}`}`).setURL(work.url)
    .addFields({ name: "🆔 ID", value: `#${work.id}`, inline: true }, { name: "📂 Type", value: isVideoUrl(work.url) ? "🎥 Video" : "🖼️ Image", inline: true })
    .setFooter({ text: `Page ${page} of ${total} • s!work <page>` });
  if (!isVideoUrl(work.url)) embed.setImage(work.url);
  else embed.setDescription(`[▶️ Open Video](${work.url})`);
  await respond(message, { content: isVideoUrl(work.url) ? work.url : undefined, embeds: [embed] });
}

async function handleAddWork(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  let url = null, title = "";
  if (args[0] && GENERIC_URL_RE.test(args[0])) { url = args[0]; title = args.slice(1).join(" ").trim(); }
  else { const a = message.attachments?.find(a => a.contentType?.startsWith("image/") || IMAGE_EXT_RE.test(a.url)); if (a) { url = a.url; title = args.join(" ").trim(); } }
  if (!url) return respond(message, { embeds: [warnEmbed("Missing URL").setDescription(`\`${PREFIX}addwork <url> [title]\``)] });
  if (!looksLikeMediaUrl(url)) return respond(message, { embeds: [errorEmbed("Invalid URL")] });
  const work = { id: data.nextWorkId++, url, title: title || null, addedBy: message.author.tag, addedById: message.author.id, timestamp: new Date().toISOString() };
  data.portfolio.push(work); saveData();
  const embed = successEmbed(`✅ Portfolio Entry #${work.id} Added`).setTimestamp();
  if (!isVideoUrl(work.url)) embed.setImage(work.url);
  await respond(message, { embeds: [embed] });
}

async function handleRemoveWork(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const id = Number(args[0]);
  if (!Number.isFinite(id)) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}removework <id>\``)] });
  const idx = data.portfolio.findIndex(w => w.id === id);
  if (idx === -1) return respond(message, { embeds: [errorEmbed("Not Found")] });
  const removed = data.portfolio.splice(idx, 1)[0]; saveData();
  await respond(message, { embeds: [warnEmbed(`🗑️ Removed #${removed.id}`).setDescription(removed.title || "(no title)").setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Moderation
// ─────────────────────────────────────────────
async function handleBan(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.BanMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}ban @user <reason>\``)] });
  if (userId === message.author.id || userId === client.user.id) return respond(message, { embeds: [errorEmbed("Error")] });
  const reason = args.slice(1).join(" ").trim() || "No reason provided";
  try { await message.guild.bans.create(userId, { reason: `By ${message.author.tag}: ${reason}` }); }
  catch { return respond(message, { embeds: [errorEmbed("Ban Failed")] }); }
  const embed = errorEmbed("🔨 Banned").addFields({ name: "User", value: `<@${userId}>`, inline: true }, { name: "Reason", value: reason }, { name: "By", value: message.author.tag, inline: true }).setTimestamp();
  await respond(message, { embeds: [embed] }); await logMod(message.guild, embed);
}

async function handleKick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.KickMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}kick @user [reason]\``)] });
  const reason = args.slice(1).join(" ").trim() || "No reason";
  let target; try { target = await message.guild.members.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); }
  if (!target.kickable) return respond(message, { embeds: [errorEmbed("Can't Kick")] });
  await target.kick(reason);
  const embed = warnEmbed("👢 Kicked").addFields({ name: "User", value: `<@${userId}>`, inline: true }, { name: "Reason", value: reason, inline: true }, { name: "By", value: message.author.tag, inline: true }).setTimestamp();
  await respond(message, { embeds: [embed] }); await logMod(message.guild, embed);
}

async function handleMute(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId || !args[1]) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}mute @user <time> [reason]\``)] });
  const ms = parseDuration(args[1]);
  if (!ms || ms > 28 * TIME_UNITS.d) return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Max 28 days.")] });
  const reason = args.slice(2).join(" ").trim() || "No reason";
  let target; try { target = await message.guild.members.fetch(userId); } catch { return respond(message, { embeds: [errorEmbed("Not Found")] }); }
  if (!target.moderatable) return respond(message, { embeds: [errorEmbed("Can't Mute")] });
  await target.timeout(ms, reason);
  const embed = warnEmbed("🔇 Muted").addFields({ name: "User", value: `<@${userId}>`, inline: true }, { name: "Duration", value: formatDuration(ms), inline: true }, { name: "Reason", value: reason, inline: true }, { name: "By", value: message.author.tag }).setTimestamp();
  await respond(message, { embeds: [embed] }); await logMod(message.guild, embed);
}

async function handleWarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  const reason = args.slice(1).join(" ").trim();
  if (!userId || !reason) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}warn @user <reason>\``)] });
  const warn = { id: data.nextWarnId++, reason, moderatorId: message.author.id, at: new Date().toISOString() };
  if (!data.warns[userId]) data.warns[userId] = [];
  data.warns[userId].push(warn); saveData();
  const embed = warnEmbed("⚠️ Warned").addFields({ name: "User", value: `<@${userId}>`, inline: true }, { name: "Warn #", value: `${warn.id}`, inline: true }, { name: "Total", value: `${data.warns[userId].length}`, inline: true }, { name: "Reason", value: reason }, { name: "By", value: message.author.tag }).setTimestamp();
  await respond(message, { embeds: [embed] }); await logMod(message.guild, embed);
  try { const u = await client.users.fetch(userId); await u.send({ embeds: [warnEmbed(`⚠️ Warned in ${message.guild.name}`).addFields({ name: "Reason", value: reason }).setTimestamp()] }); } catch {}
}

async function handleWarns(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}warns @user\``)] });
  const list = data.warns[userId] || [];
  const embed = new EmbedBuilder().setTitle(`⚠️ Warnings — ${list.length}`).setDescription(`<@${userId}>`).setColor(list.length ? WARN_COLOR : SUCCESS_COLOR);
  if (!list.length) embed.addFields({ name: "✅ Clean", value: "No warnings." });
  else list.slice(-10).forEach(w => embed.addFields({ name: `#${w.id}`, value: `**Reason:** ${w.reason || "—"}\n**By:** <@${w.moderatorId || "—"}>`, inline: true }));
  await respond(message, { embeds: [embed] });
}

async function handleUnwarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const id = Number(args[0]);
  let removed = null, removedFrom = null;
  for (const [uid, list] of Object.entries(data.warns)) {
    const idx = list.findIndex(w => w.id === id);
    if (idx !== -1) { removed = list[idx]; removedFrom = uid; list.splice(idx, 1); if (!list.length) delete data.warns[uid]; break; }
  }
  if (!removed) return respond(message, { embeds: [errorEmbed("Not Found")] });
  saveData();
  await respond(message, { embeds: [successEmbed("✅ Warning Removed").addFields({ name: "ID", value: `#${id}`, inline: true }, { name: "User", value: `<@${removedFrom}>`, inline: true }, { name: "Reason", value: removed.reason || "—" }).setTimestamp()] });
}

async function handlePurge(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const count = parseInt(args[0], 10);
  if (!Number.isFinite(count) || count < 1 || count > 100) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}purge <1-100>\``)] });
  try {
    const deleted = await message.channel.bulkDelete(count, true);
    const notice  = await message.channel.send({ embeds: [successEmbed("🧹 Purged").setDescription(`Deleted **${deleted.size}** messages.`)] });
    setTimeout(() => notice.delete().catch(() => {}), 5000);
    await logMod(message.guild, warnEmbed("🧹 Purge").addFields({ name: "Channel", value: `<#${message.channel.id}>`, inline: true }, { name: "Count", value: `${deleted.size}`, inline: true }, { name: "By", value: message.author.tag, inline: true }).setTimestamp());
  } catch { await respond(message, { embeds: [errorEmbed("Purge Failed").setDescription("Messages >14 days old can't be bulk deleted.")] }); }
}

// ─────────────────────────────────────────────
//  Admin commands
// ─────────────────────────────────────────────
async function handleBlacklist(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}blacklist @user\``)] });
  const idx = data.blacklist.indexOf(userId);
  if (idx === -1) data.blacklist.push(userId); else data.blacklist.splice(idx, 1);
  saveData();
  const added = idx === -1;
  await respond(message, { embeds: [new EmbedBuilder().setColor(added ? ERROR_COLOR : SUCCESS_COLOR).setTitle("🚫 Blacklist Updated").setDescription(`<@${userId}> ${added ? "added to" : "removed from"} blacklist.`).setTimestamp()] });
}

async function handleSetLog(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  if (!args[0]) { delete data.modLogChannels[message.guild.id]; saveData(); return respond(message, { embeds: [warnEmbed("Mod Log Disabled")] }); }
  const m = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d{17,20})$/);
  if (!m) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}setlog #channel\``)] });
  const ch = await message.guild.channels.fetch(m[1]).catch(() => null);
  if (!ch?.isTextBased()) return respond(message, { embeds: [errorEmbed("Invalid Channel")] });
  data.modLogChannels[message.guild.id] = m[1]; saveData();
  await respond(message, { embeds: [successEmbed("📓 Mod Log Set").setDescription(`Logging to <#${m[1]}>.`)] });
  await ch.send({ embeds: [successEmbed("✅ Mod Log Connected").setDescription(`This channel now receives mod logs from **${BOT_NAME}**.`)] });
}

async function handleSetReviews(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) { delete settings.reviewsChannelId; saveData(); return respond(message, { embeds: [successEmbed("✅ Cleared")] }); }
  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}setreviews #channel\``)] });
  settings.reviewsChannelId = channelId; saveData();
  return respond(message, { embeds: [successEmbed("✅ Reviews Channel Set").setDescription(`Reviews → <#${channelId}>`)] });
}

async function handleSetTranscripts(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const settings = getGuildSettings(message.guild.id);
  if (!args[0]) { delete settings.transcriptsChannelId; saveData(); return respond(message, { embeds: [successEmbed("✅ Cleared")] }); }
  const channelId = parseChannelId(args[0]);
  if (!channelId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}settranscripts #channel\``)] });
  settings.transcriptsChannelId = channelId; saveData();
  return respond(message, { embeds: [successEmbed("✅ Transcripts Channel Set").setDescription(`Transcripts → <#${channelId}>`)] });
}

async function handleSay(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const text = args.join(" ").trim();
  if (!text) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}say <message>\``)] });
  try { await message.delete(); } catch {}
  await message.channel.send({ content: text, allowedMentions: { users: [] } });
}

// ─────────────────────────────────────────────
//  Command map
// ─────────────────────────────────────────────
const commands = {
  ai: handleAI,
  aioff: (msg, args) => handleAIToggle(msg, args, "aioff"),
  aion:  (msg, args) => handleAIToggle(msg, args, "aion"),
  help: handleHelp, info: handleInfo, status: handleStatus, ping: handlePing,
  rules: handleRules, prices: handlePrices, uptime: handleUptime, discount: handleDiscount,
  services: handleServices, orderinfo: handleOrderInfo,
  updateorder: handleUpdateOrder, updateo: handleUpdateOrder,
  ticket: handleTicket, pay: handlePay, payment: handlePay,
  portfolio: handlePortfolio, work: handlePortfolio,
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
  ticketrole: handleTicketRole, ticketconfig: handleTicketConfig,
  addorder: handleAddOrder, complete: handleComplete, announce: handleAnnounce,
  partner: handlePartner, blacklist: handleBlacklist, setlog: handleSetLog,
  setreviews: handleSetReviews, settranscripts: handleSetTranscripts, say: handleSay,
  poll: handlePoll, giveaway: handleGiveaway, embed: handleEmbed,
  antiraid: handleAntiRaid, antinuke: handleAntiNuke,
  dowork: handleWork,
};

// ─────────────────────────────────────────────
//  messageCreate
// ─────────────────────────────────────────────
const ADMIN_BYPASS = new Set(["blacklist"]);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (alreadyHandled(message.id)) return;

  if (message.channel.id === STICKY_CHANNEL_ID) refreshSticky(message.channel).catch(() => {});

  // ── Ping SnugglesMcBear in ticket channels when a customer sends a message ──
  if (message.channel.name?.startsWith("ticket-") && !message.content.startsWith(PREFIX)) {
    const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
    const settings = getGuildSettings(message.guild.id);
    const hasStaffRole = settings.ticketStaffRoles?.some(r => message.member?.roles.cache.has(r));
    if (!isStaff && !hasStaffRole && message.author.id !== OWNER_ID) {
      // Ping owner silently then delete after 1 second
      try {
        const pingMsg = await message.channel.send({ content: `<@${OWNER_ID}>`, allowedMentions: { users: [OWNER_ID] } });
        setTimeout(() => pingMsg.delete().catch(() => {}), 1000);
      } catch {}
    }
  }

  // ── Partnership ad collection ──
  if (partnerAwaitingAd.has(message.channel.id)) {
    const adData  = partnerAwaitingAd.get(message.channel.id);
    const isOwner = message.author.id === adData.member.id;
    if (isOwner && message.content.trim().length >= 20) {
      partnerAwaitingAd.delete(message.channel.id);
      setImmediate(async () => {
        try {
          const { formAnswers, memberCount, pingContent, tierLabel } = adData;
          const adText = message.content.trim();
          const banner = message.attachments.first()?.url || null;

          const homeGuild = client.guilds.cache.get(HOME_GUILD_ID);
          if (!homeGuild) return;
          const partnerCh = await homeGuild.channels.fetch(PARTNER_AD_CHANNEL_ID).catch(() => null);
          if (!partnerCh?.isTextBased()) return;

          const adEmbed = new EmbedBuilder()
            .setColor(0x9b59b6)
            .setTitle(formAnswers.serverName || "New Partner")
            .setDescription(`${adText}\n\u200b`)
            .addFields(
              { name: "👥 Members",       value: formAnswers.memberCount || "—", inline: true },
              { name: "📊 Tier",          value: tierLabel,                      inline: true },
              { name: "🎯 Server Focus",  value: formAnswers.focus       || "—", inline: true },
              { name: "🤝 What We Offer", value: formAnswers.offering    || "—", inline: false },
              { name: "🔗 Join Server",   value: formAnswers.invite      || "—", inline: false },
            )
            .setFooter({ text: `${BOT_NAME} Partnerships  •  We're now partners! 💗` })
            .setTimestamp();
          if (banner) adEmbed.setImage(banner);

          const parseMention = pingContent ? ["everyone"] : [];
          await partnerCh.send({ content: pingContent || undefined, embeds: [adEmbed], allowedMentions: { parse: parseMention } });

          const confirmEmbed = new EmbedBuilder()
            .setColor(SUCCESS_COLOR).setTitle("✅ Partnership Approved & Posted!")
            .setDescription(`Your server ad has been published to <#${PARTNER_AD_CHANNEL_ID}>! 🎉\n\nWelcome to the **${BOT_NAME}** partner family! 💗\nThis ticket will close in **15 seconds**.`)
            .setFooter({ text: `${BOT_NAME} • Partnership Manager` }).setTimestamp();
          await message.channel.send({ embeds: [confirmEmbed] });
          setTimeout(() => message.channel.delete("Partnership ad posted — auto-close").catch(() => {}), 15_000);
        } catch (err) { console.error("[Partner Ad] Post failed:", err.message); }
      });
      return;
    }
  }

  // ── AI reply in support forum threads ──
  if (message.channel.isThread?.() && message.channel.parentId === FORUM_SUPPORT_CHANNEL_ID) {
    if (GROQ_API_KEY) {
      const cooldownKey = `forum:${message.channel.id}:${message.author.id}`;
      const lastAI = aiCooldowns.get(cooldownKey) || 0;
      if (Date.now() - lastAI >= 4000) {
        aiCooldowns.set(cooldownKey, Date.now());
        setImmediate(async () => {
          try {
            const aiResponse = await callTicketAI(`forum_${message.channel.id}`, message.content, "inquiry", null);
            if (aiResponse) await message.channel.send({ content: `-# 🤖 **Snuggles AI Support**  •  fully AI-managed\n\n${aiResponse}`, allowedMentions: { users: [] } });
          } catch {}
        });
      }
    }
    return;
  }

  // ── AI reply in ticket channels ──
  if (message.channel.name?.startsWith("ticket-") && !message.content.startsWith(PREFIX)) {
    const settings  = getGuildSettings(message.guild.id);
    const isStaff   = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
    if (!isStaff && settings.ticketAI !== false && GROQ_API_KEY && !ticketAIDisabled.has(message.channel.id)) {
      const cooldownKey = `${message.channel.id}:${message.author.id}`;
      const lastAI = aiCooldowns.get(cooldownKey) || 0;
      if (Date.now() - lastAI >= 8000) {
        aiCooldowns.set(cooldownKey, Date.now());
        const topicMatch = message.channel.topic?.match(/^\[(\w+)\]/);
        const ticketType = topicMatch ? topicMatch[1] : "inquiry";
        setImmediate(async () => {
          try {
            const aiResponse = await callTicketAI(message.channel.id, message.content, ticketType, null);
            if (aiResponse) await message.channel.send({ content: `-# 🤖 **Snuggles AI**  •  automated reply\n\n${aiResponse}`, allowedMentions: { users: [] } });
          } catch {}
        });
      }
    }
  }

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
        delete data.triviaActive[message.channel.id]; saveData();
        await message.reply({ embeds: [successEmbed("🧠 Correct!").setDescription(`**+${trivia.rewardCoins} 🪙 coins**!`).setTimestamp()] }).catch(() => {});
      }
    }
    return;
  }

  const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;
  const handler = commands[commandName];
  if (!handler) return;

  if (data.blacklist.includes(message.author.id)) {
    if (!(ADMIN_BYPASS.has(commandName) && isAdmin(message.member))) {
      await message.channel.send({ embeds: [errorEmbed("🚫 Blacklisted")] }).catch(() => {});
      return;
    }
  }

  if (COOLDOWNS_MS[commandName]) {
    const wait = checkCooldown(commandName, message.author.id);
    if (wait > 0) {
      await message.channel.send({ embeds: [warnEmbed("⏰ Cooldown").setDescription(`Use \`${PREFIX}${commandName}\` again in **${wait}s**.`)] }).catch(() => {});
      return;
    }
    consumeCooldown(commandName, message.author.id);
  }

  try { await handler(message, args); }
  catch (err) {
    console.error(`Error in ${PREFIX}${commandName}:`, err);
    await sendErrorLog(err, `Command: ${PREFIX}${commandName}`);
    await message.channel.send({ embeds: [errorEmbed("Something Went Wrong").setDescription("An unexpected error occurred.")] }).catch(() => {});
  }
});

// ─────────────────────────────────────────────
//  Forum Support — threadCreate
// ─────────────────────────────────────────────
client.on("threadCreate", async (thread) => {
  try {
    if (thread.parentId !== FORUM_SUPPORT_CHANNEL_ID) return;
    await thread.join().catch(() => {});
    const rulesEmbed = new EmbedBuilder()
      .setColor(BRAND_COLOR).setTitle("📜 Support Forum — Welcome!")
      .setDescription(
        "Welcome to **Snuggles Scripting Support**! 💗\n\n" +
        "**Please keep these in mind:**\n" +
        "**1.** Be respectful and patient\n**2.** Include screenshots, errors, and code snippets\n" +
        "**3.** Stay on topic — one issue per thread\n**4.** Mark your thread solved once resolved\n\n" +
        "📜 [Terms of Service](https://docs.google.com/document/d/13dYCdrmj9mU9jWmEYONExBDnfcwYlQfxR6UJdZRsP28/edit) • " +
        "🔒 [Privacy Policy](https://docs.google.com/document/d/16ppiOOtWtPkarJVjmxbsHBlObJFQg8IIrnMOaFhDcXk/edit)"
      )
      .setFooter({ text: `${BOT_NAME} • Support Forum` }).setTimestamp();
    await thread.send({ embeds: [rulesEmbed] });

    if (GROQ_API_KEY) {
      const aiGreeting = `A new community support thread was opened titled: "${thread.name}". You are the fully automated AI support agent. Greet the user warmly, introduce yourself as the AI support system, and encourage them to share as much detail as possible. 💗`;
      const aiResponse = await callTicketAI(`forum_${thread.id}`, aiGreeting, "inquiry", null);
      if (aiResponse) await thread.send({ content: `-# 🤖 **Snuggles AI Support**  •  fully AI-managed\n\n${aiResponse}`, allowedMentions: { users: [] } });
    }
  } catch (err) { console.error("[Forum] threadCreate error:", err.message); }
});

// ─────────────────────────────────────────────
//  Guild events
// ─────────────────────────────────────────────
client.on("guildCreate", async (guild) => {
  console.log(`Joined: ${guild.name}`);
  updateBotStatus();
  await sendSetupMessage(guild);
  await cacheInvites(guild).catch(() => {});
  try {
    const homeGuild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!homeGuild) return;
    const ch = await homeGuild.channels.fetch(GUILD_JOIN_LOG_CHANNEL).catch(() => null);
    if (!ch?.isTextBased()) return;
    const owner = await client.users.fetch(guild.ownerId).catch(() => null);
    await ch.send({ embeds: [successEmbed("✅ Joined New Server").setThumbnail(guild.iconURL({ size: 256 }) || null)
      .addFields({ name: "Server", value: guild.name, inline: true }, { name: "ID", value: guild.id, inline: true }, { name: "Owner", value: owner?.tag || guild.ownerId, inline: true }, { name: "Members", value: `${guild.memberCount}`, inline: true }, { name: "Total Servers", value: `${client.guilds.cache.size}`, inline: true })
      .setTimestamp()] });
  } catch {}
});

client.on("guildDelete", async (guild) => {
  console.log(`Left: ${guild.name}`);
  updateBotStatus();
  try {
    const homeGuild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!homeGuild) return;
    const ch = await homeGuild.channels.fetch(GUILD_LEAVE_LOG_CHANNEL).catch(() => null);
    if (!ch?.isTextBased()) return;
    await ch.send({ embeds: [errorEmbed("❌ Left Server").addFields({ name: "Server", value: guild.name, inline: true }, { name: "ID", value: guild.id, inline: true }, { name: "Total Servers", value: `${client.guilds.cache.size}`, inline: true }).setTimestamp()] });
  } catch {}
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
  if (data.inviteCache[invite.guild.id]) { delete data.inviteCache[invite.guild.id][invite.code]; saveData(); }
});

client.on("guildMemberAdd", async (member) => {
  try {
    await handleAntiRaidJoin(member);
    const guild = member.guild;
    const newInvites = await guild.invites.fetch().catch(() => null);
    if (newInvites) {
      const cached = data.inviteCache[guild.id] || {};
      let inviterId = null;
      newInvites.forEach(inv => { if ((inv.uses || 0) > (cached[inv.code] || 0)) inviterId = inv.inviter?.id; cached[inv.code] = inv.uses || 0; });
      data.inviteCache[guild.id] = cached;
      if (inviterId) {
        if (!data.invites[guild.id]) data.invites[guild.id] = {};
        if (!data.invites[guild.id][inviterId]) data.invites[guild.id][inviterId] = { invited: 0, left: 0 };
        data.invites[guild.id][inviterId].invited++;
      }
      saveData();
    }
    await logMod(guild, successEmbed("📥 Member Joined")
      .addFields({ name: "User", value: `<@${member.id}> (${member.user.tag})` }, { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` })
      .setThumbnail(member.user.displayAvatarURL()).setTimestamp());
  } catch {}
});

client.on("guildMemberRemove", async (member) => {
  try {
    if (data.invites[member.guild.id]) {
      for (const inv of Object.values(data.invites[member.guild.id])) { inv.left++; break; }
      saveData();
    }
    await logMod(member.guild, errorEmbed("📤 Member Left")
      .addFields({ name: "User", value: `<@${member.id}> (${member.user.tag})` })
      .setThumbnail(member.user.displayAvatarURL()).setTimestamp());
  } catch {}
});

// ─────────────────────────────────────────────
//  Extended logging — comprehensive
// ─────────────────────────────────────────────
client.on("messageDelete", async (message) => {
  try {
    if (!message.guild || message.author?.bot || message.partial || !message.content) return;
    await logMod(message.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🗑️ Message Deleted")
      .addFields(
        { name: "👤 Author",  value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
        { name: "💬 Channel", value: `<#${message.channel.id}>`,                        inline: true },
        { name: "📝 Content", value: message.content.slice(0, 1024) },
      ).setTimestamp());
  } catch {}
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    await logMod(newMessage.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("✏️ Message Edited")
      .addFields(
        { name: "👤 Author",  value: `<@${newMessage.author.id}> (${newMessage.author.tag})`, inline: true },
        { name: "💬 Channel", value: `<#${newMessage.channel.id}>`,                           inline: true },
        { name: "📝 Before",  value: (oldMessage.content || "—").slice(0, 1024) },
        { name: "📝 After",   value: (newMessage.content || "—").slice(0, 1024) },
        { name: "🔗 Jump",    value: `[Go to message](${newMessage.url})`, inline: true },
      ).setTimestamp());
  } catch {}
});

client.on("messageDeleteBulk", async (messages) => {
  try {
    const first = messages.first();
    if (!first?.guild) return;
    await logMod(first.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🗑️ Bulk Delete")
      .addFields({ name: "💬 Channel", value: `<#${first.channel.id}>`, inline: true }, { name: "🔢 Count", value: `${messages.size}`, inline: true })
      .setTimestamp());
  } catch {}
});

// Role events — comprehensive
client.on("roleCreate", async (role) => {
  try {
    await logMod(role.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🎭 Role Created")
      .addFields(
        { name: "📛 Name",   value: role.name,       inline: true },
        { name: "🆔 ID",     value: role.id,          inline: true },
        { name: "🎨 Color",  value: role.hexColor,    inline: true },
        { name: "👁️ Hoist", value: role.hoist ? "Yes" : "No", inline: true },
        { name: "🔔 Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
      ).setTimestamp());
  } catch {}
});

client.on("roleDelete", async (role) => {
  try {
    await logMod(role.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🎭 Role Deleted")
      .addFields({ name: "📛 Name", value: role.name, inline: true }, { name: "🆔 ID", value: role.id, inline: true }, { name: "🎨 Color", value: role.hexColor, inline: true })
      .setTimestamp());
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).catch(() => null);
    if (logs) { const entry = logs.entries.first(); if (entry) await checkAntiNuke(role.guild, entry.executor.id, "roleDelete"); }
  } catch {}
});

client.on("roleUpdate", async (oldRole, newRole) => {
  try {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`**Hoisted:** ${oldRole.hoist} → ${newRole.hoist}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionable:** ${oldRole.mentionable} → ${newRole.mentionable}`);
    const oldPerms = oldRole.permissions.toArray().sort().join(",");
    const newPerms = newRole.permissions.toArray().sort().join(",");
    if (oldPerms !== newPerms) changes.push(`**Permissions:** Updated`);
    if (!changes.length) return;
    await logMod(newRole.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("🎭 Role Updated")
      .addFields({ name: "🎭 Role", value: `<@&${newRole.id}>`, inline: true }, { name: "📝 Changes", value: changes.join("\n") })
      .setTimestamp());
  } catch {}
});

// Channel events
client.on("channelCreate", async (channel) => {
  if (!channel.guild) return;
  try {
    await logMod(channel.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("💬 Channel Created")
      .addFields({ name: "📛 Name", value: channel.name, inline: true }, { name: "🆔 ID", value: channel.id, inline: true }, { name: "📂 Type", value: String(channel.type), inline: true })
      .setTimestamp());
  } catch {}
});

client.on("channelDelete", async (channel) => {
  if (!channel.guild) return;
  try {
    await logMod(channel.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("💬 Channel Deleted")
      .addFields({ name: "📛 Name", value: channel.name, inline: true }, { name: "🆔 ID", value: channel.id, inline: true }, { name: "📂 Type", value: String(channel.type), inline: true })
      .setTimestamp());
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
    if (logs) { const entry = logs.entries.first(); if (entry) await checkAntiNuke(channel.guild, entry.executor.id, "channelDelete"); }
  } catch {}
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  try {
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
    if (oldChannel.topic !== newChannel.topic) changes.push(`**Topic:** ${(oldChannel.topic || "None").slice(0, 200)} → ${(newChannel.topic || "None").slice(0, 200)}`);
    if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`**NSFW:** ${oldChannel.nsfw} → ${newChannel.nsfw}`);
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
    if (!changes.length) return;
    await logMod(newChannel.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("💬 Channel Updated")
      .addFields({ name: "💬 Channel", value: `<#${newChannel.id}>` }, { name: "📝 Changes", value: changes.join("\n") })
      .setTimestamp());
  } catch {}
});

// Member update
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    const changes = [];
    if (oldMember.nickname !== newMember.nickname) changes.push(`**Nickname:** ${oldMember.nickname || "None"} → ${newMember.nickname || "None"}`);
    const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (addedRoles.size)   changes.push(`**Roles Added:** ${addedRoles.map(r => `<@&${r.id}>`).join(", ")}`);
    if (removedRoles.size) changes.push(`**Roles Removed:** ${removedRoles.map(r => `<@&${r.id}>`).join(", ")}`);
    if (!changes.length) return;
    await logMod(newMember.guild, new EmbedBuilder().setColor(INFO_COLOR).setTitle("👤 Member Updated")
      .addFields({ name: "👤 User", value: `<@${newMember.id}> (${newMember.user.tag})` }, { name: "📝 Changes", value: changes.join("\n") })
      .setTimestamp());
  } catch {}
});

// Bans
client.on("guildBanAdd", async (ban) => {
  try {
    await logMod(ban.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🔨 Member Banned")
      .addFields({ name: "👤 User", value: `${ban.user.tag} (${ban.user.id})` }, { name: "📋 Reason", value: ban.reason || "No reason" })
      .setTimestamp());
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
    if (logs) { const entry = logs.entries.first(); if (entry) await checkAntiNuke(ban.guild, entry.executor.id, "ban"); }
  } catch {}
});

client.on("guildBanRemove", async (ban) => {
  try {
    await logMod(ban.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🔓 Member Unbanned")
      .addFields({ name: "👤 User", value: `${ban.user.tag} (${ban.user.id})` }).setTimestamp());
  } catch {}
});

// Voice state
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    if (oldState.channelId === newState.channelId) return;
    let desc = "";
    if (!oldState.channelId && newState.channelId)      desc = `<@${newState.id}> joined **${newState.channel?.name}**`;
    else if (oldState.channelId && !newState.channelId) desc = `<@${oldState.id}> left **${oldState.channel?.name}**`;
    else                                                 desc = `<@${newState.id}> moved **${oldState.channel?.name}** → **${newState.channel?.name}**`;
    await logMod(newState.guild, new EmbedBuilder().setColor(NOTE_COLOR).setTitle("🔊 Voice Update").setDescription(desc).setTimestamp());
  } catch {}
});

// Emoji & sticker
client.on("emojiCreate", async (emoji) => { try { await logMod(emoji.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("😄 Emoji Created").addFields({ name: "Name", value: emoji.name, inline: true }, { name: "ID", value: emoji.id, inline: true }).setThumbnail(emoji.url).setTimestamp()); } catch {} });
client.on("emojiDelete", async (emoji) => { try { await logMod(emoji.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("😄 Emoji Deleted").addFields({ name: "Name", value: emoji.name, inline: true }, { name: "ID", value: emoji.id, inline: true }).setTimestamp()); } catch {} });
client.on("emojiUpdate", async (oldEmoji, newEmoji) => {
  if (oldEmoji.name === newEmoji.name) return;
  try { await logMod(newEmoji.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("😄 Emoji Updated").addFields({ name: "Old Name", value: oldEmoji.name, inline: true }, { name: "New Name", value: newEmoji.name, inline: true }).setTimestamp()); } catch {}
});

// Server updates
client.on("guildUpdate", async (oldGuild, newGuild) => {
  try {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push(`**Verification:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
    if (!changes.length) return;
    await logMod(newGuild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("🏠 Server Updated").addFields({ name: "📝 Changes", value: changes.join("\n") }).setTimestamp());
  } catch {}
});

// Webhook & invite for anti-nuke
client.on("webhooksUpdate", async (channel) => {
  try {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.WebhookDelete, limit: 1 }).catch(() => null);
    if (logs) { const entry = logs.entries.first(); if (entry && Date.now() - entry.createdTimestamp < 5000) await checkAntiNuke(channel.guild, entry.executor.id, "webhookDelete"); }
    await logMod(channel.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("🔗 Webhook Updated").addFields({ name: "💬 Channel", value: `<#${channel.id}>` }).setTimestamp());
  } catch {}
});

// ─────────────────────────────────────────────
//  Interactions
// ─────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    if (data.blacklist.includes(interaction.user.id)) {
      if (interaction.isRepliable()) await interaction.reply({ content: "🚫 Blacklisted.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.isButton()) {
      if (["ticket_order", "ticket_partnership", "ticket_inquiry"].includes(interaction.customId)) {
        const typeMap = { ticket_order: "order", ticket_partnership: "partnership", ticket_inquiry: "inquiry" };
        const type = typeMap[interaction.customId];
        let modal;
        if (type === "order") {
          modal = new ModalBuilder().setCustomId("ticket_form_order").setTitle("📦 Commission Order");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("username").setLabel("Your Roblox Username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("service").setLabel("Service Needed").setPlaceholder("Custom script, UI, datastore, etc.").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("description").setLabel("Description").setPlaceholder("Describe in detail what you need.").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("budget").setLabel("Budget").setPlaceholder("e.g. $25 USD, 5000 Robux").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setPlaceholder("Robux, USD (PayPal/CashApp), Giftcard").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
          );
        } else if (type === "partnership") {
          modal = new ModalBuilder().setCustomId("ticket_form_partnership").setTitle("🤝 Partnership Request");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("serverName").setLabel("Server Name").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("invite").setLabel("Server Invite Link").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("memberCount").setLabel("Member Count").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("focus").setLabel("Server Focus").setPlaceholder("e.g. Roblox dev, gaming...").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("offering").setLabel("What can you offer us?").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)),
          );
        } else {
          modal = new ModalBuilder().setCustomId("ticket_form_inquiry").setTitle("❓ General Inquiry");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Your Name / Username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("topic").setLabel("Question / Topic").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("details").setLabel("More Details").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("urgency").setLabel("Urgency Level").setPlaceholder("Not urgent / Few days / ASAP").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false)),
          );
        }
        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === "ticket_close_button") {
        const channel = interaction.channel;
        if (!channel?.name?.startsWith("ticket-")) return interaction.reply({ content: "❌ Only works in ticket channels.", flags: MessageFlags.Ephemeral });
        const isStaff   = isAdmin(interaction.member) || hasPerm(interaction.member, PermissionFlagsBits.ManageChannels);
        const settings  = getGuildSettings(interaction.guild.id);
        const hasStaffRole = settings.ticketStaffRoles?.some(r => interaction.member?.roles.cache.has(r));
        const isOwner   = channel.permissionOverwrites.cache.has(interaction.user.id);
        if (!isStaff && !hasStaffRole && !isOwner) return interaction.reply({ content: "❌ Only the ticket owner or staff can close this.", flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder().setCustomId("ticket_close_reason").setTitle("🔒 Close Ticket");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("close_reason").setLabel("Reason for closing").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)));
        await interaction.showModal(modal);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (["ticket_form_order", "ticket_form_partnership", "ticket_form_inquiry"].includes(interaction.customId)) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const typeMap    = { ticket_form_order: "order", ticket_form_partnership: "partnership", ticket_form_inquiry: "inquiry" };
        const ticketType = typeMap[interaction.customId];
        const formAnswers = {};
        if (ticketType === "order") {
          formAnswers.username    = interaction.fields.getTextInputValue("username");
          formAnswers.service     = interaction.fields.getTextInputValue("service");
          formAnswers.description = interaction.fields.getTextInputValue("description");
          formAnswers.budget      = interaction.fields.getTextInputValue("budget");
          formAnswers.payment     = interaction.fields.getTextInputValue("payment");
        } else if (ticketType === "partnership") {
          formAnswers.serverName  = interaction.fields.getTextInputValue("serverName");
          formAnswers.invite      = interaction.fields.getTextInputValue("invite");
          formAnswers.memberCount = interaction.fields.getTextInputValue("memberCount");
          formAnswers.focus       = interaction.fields.getTextInputValue("focus");
          formAnswers.offering    = interaction.fields.getTextInputValue("offering");
        } else {
          formAnswers.name    = interaction.fields.getTextInputValue("name");
          formAnswers.topic   = interaction.fields.getTextInputValue("topic");
          formAnswers.details = interaction.fields.getTextInputValue("details");
          formAnswers.urgency = interaction.fields.getTextInputValue("urgency");
        }
        const member = interaction.member ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
        const result = await openTicketForUser(interaction.channel, member, ticketType, formAnswers);
        if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });
        await interaction.editReply({ content: `✅ Ticket created: <#${result.channel.id}>` });
        return;
      }

      if (interaction.customId === "ticket_close_reason") {
        const reason  = interaction.fields.getTextInputValue("close_reason");
        const channel = interaction.channel;
        if (!channel?.name?.startsWith("ticket-")) return interaction.reply({ content: "❌ Not a ticket channel.", flags: MessageFlags.Ephemeral });
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
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred)
        await interaction.reply({ content: "❌ Something went wrong.", flags: MessageFlags.Ephemeral });
    } catch {}
  }
});

// ─────────────────────────────────────────────
//  Error handlers
// ─────────────────────────────────────────────
client.on("error", async err => { console.error("Client error:", err); await sendErrorLog(err, "Client error event"); });
process.on("unhandledRejection", async (err) => { console.error("Unhandled rejection:", err); await sendErrorLog(err, "Unhandled rejection"); });
process.on("uncaughtException",  async (err) => { console.error("Uncaught exception:",  err); await sendErrorLog(err, "Uncaught exception"); });

// ─────────────────────────────────────────────
//  Login
// ─────────────────────────────────────────────
client.login(TOKEN);

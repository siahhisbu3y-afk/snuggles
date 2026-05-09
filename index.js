"use strict";

const fs   = require("fs");
const path = require("path");
const {
  Client, GatewayIntentBits, Partials, ChannelType,
  PermissionFlagsBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, MessageFlags, AuditLogEvent, ActivityType,
  AttachmentBuilder, REST, Routes, SlashCommandBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require("discord.js");

require("dotenv").config();

// ─── ENV ─────────────────────────────────────────────────────────────────────
const TOKEN                 = (process.env.DISCORD_TOKEN          || "").trim();
const CLIENT_ID             = (process.env.CLIENT_ID              || "").trim();
const GROQ_API_KEY          = (process.env.GROQ_API_KEY           || "").trim();
const STABILITY_API_KEY     = (process.env.STABILITY_API_KEY      || "").trim();
const OPENAI_API_KEY        = (process.env.OPENAI_API_KEY         || "").trim();
const SPOTIFY_CLIENT_ID     = (process.env.SPOTIFY_CLIENT_ID      || "").trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET  || "").trim();

if (!TOKEN)     { console.error("❌ Missing DISCORD_TOKEN"); process.exit(1); }
if (!CLIENT_ID) { console.warn("⚠️  No CLIENT_ID — slash commands won't register"); }
if (!GROQ_API_KEY)      console.warn("⚠️  No GROQ_API_KEY — AI features disabled");
if (!STABILITY_API_KEY) console.warn("⚠️  No STABILITY_API_KEY — using Pollinations fallback");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PREFIX        = "s!";
const BOT_NAME      = "Snuggles Scripting";
const BOT_VERSION   = "8.0.0";
const BOT_OWNER     = "Snuggles";

const BRAND_COLOR   = 0xff8fb1;
const SUCCESS_COLOR = 0x57f287;
const WARN_COLOR    = 0xfee75c;
const ERROR_COLOR   = 0xed4245;
const NOTE_COLOR    = 0x9b59b6;
const INFO_COLOR    = 0x5865f2;
const GOLD_COLOR    = 0xf1c40f;
const XP_COLOR      = 0x2ecc71;
const AI_COLOR      = 0x7289da;
const MUSIC_COLOR   = 0x1db954;
const IMG_COLOR     = 0xe91e8c;

// ─── CHANNEL / GUILD IDS ─────────────────────────────────────────────────────
const HOME_GUILD_ID            = "1497048032661864649";
const ERROR_CHANNEL_ID         = "1497080858048462948";
const LEVELUP_CHANNEL_ID       = "1497080845406699580";
const STICKY_CHANNEL_ID        = "1497080844416975028";
const GUILD_JOIN_LOG_CHANNEL   = "1497080855913300144";
const GUILD_LEAVE_LOG_CHANNEL  = "1497080856941166703";
const ORDER_CHANNEL_ID         = "1500678617594593291";
const FORUM_SUPPORT_CHANNEL_ID = "1497080830323855370";
const PARTNER_AD_CHANNEL_ID    = "1497080839736131655";
const LOFI_VC_CHANNEL_ID       = "1497080833561854043";

// ─── AI MODELS ────────────────────────────────────────────────────────────────
const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile",  label: "Llama 3.3 70B" },
  { id: "llama-3.1-70b-versatile",  label: "Llama 3.1 70B" },
  { id: "llama-3.1-8b-instant",     label: "Llama 3.1 8B"  },
  { id: "mixtral-8x7b-32768",       label: "Mixtral 8×7B"  },
  { id: "gemma2-9b-it",             label: "Gemma 2 9B"    },
];

// ─── IMAGE STYLES ─────────────────────────────────────────────────────────────
const IMG_STYLES = {
  realistic: "ultra realistic, photographic, 8k, detailed",
  anime:     "anime style, vibrant, Studio Ghibli",
  cartoon:   "cartoon, colorful, bold outlines",
  fantasy:   "fantasy art, epic, magical, detailed",
  minimal:   "minimalist, clean, simple, elegant",
  pixel:     "pixel art, 16-bit, retro game style",
  oil:       "oil painting, impressionist, textured canvas",
  sketch:    "pencil sketch, detailed lineart, black and white",
};

// ─── LOFI STREAMS (reliable non-YouTube sources) ──────────────────────────────
// Using direct radio stream URLs that don't require bot verification
const LOFI_STREAMS = [
  { title: "Lofi Girl Radio",         url: "https://play.streamafrica.net/lofiradio" },
  { title: "Chillhop Radio",          url: "http://stream.zeno.fm/fyn8eh3h5f8uv"    },
  { title: "Lofi Hip Hop Radio",      url: "http://stream.zeno.fm/0r0xa792kwzuv"    },
  { title: "Coffee Shop Lofi",        url: "http://stream.zeno.fm/mvh4yxm7rk8uv"    },
  { title: "Chill Study Beats",       url: "http://stream.zeno.fm/yn65fujiutzuv"    },
  { title: "Synthwave Radio",         url: "http://stream.zeno.fm/n3rv5emtfmzuv"    },
];

// ─── ECONOMY / XP ─────────────────────────────────────────────────────────────
const XP_PER_MSG       = 15;
const XP_COOLDOWN_MS   = 60_000;
const XP_VARIANCE      = 10;
const BASE_XP_REQUIRED = 100;
const XP_SCALING       = 1.35;
const COINS_PER_MSG    = 5;
const COINS_CD_MS      = 30_000;
const WORK_CD_MS       = 3_600_000;

function xpForLevel(lv) { return Math.floor(BASE_XP_REQUIRED * Math.pow(XP_SCALING, lv - 1)); }

const SHOP_ITEMS = [
  { id: "role_color",     name: "🎨 Custom Role Color",   price: 500,  desc: "Request a custom role color (staff applies it)." },
  { id: "code_review",    name: "🔍 Code Review Voucher", price: 300,  desc: "Get a free in-depth code review from staff." },
  { id: "priority_queue", name: "⚡ Priority Queue",      price: 750,  desc: "Your next commission is bumped to the front." },
  { id: "vip_ping",       name: "🔔 VIP Ping",            price: 1000, desc: "Get pinged for exclusive announcements." },
  { id: "og_badge",       name: "🏅 OG Badge",            price: 2000, desc: "Exclusive OG server member badge." },
  { id: "ai_image",       name: "🖼️ AI Image Pack",       price: 150,  desc: "5 AI-generated images via /imagine." },
];

const WORK_RESPONSES = [
  { text: "You debugged a gnarly script for a client",      coins: [80,  200] },
  { text: "You built a datastore system from scratch",      coins: [100, 250] },
  { text: "You fixed a RemoteEvent security bug",           coins: [60,  150] },
  { text: "You optimized a client-side UI",                 coins: [50,  180] },
  { text: "You wrote an admin command system",              coins: [120, 280] },
  { text: "You helped a beginner in the support channel",   coins: [30,  80]  },
  { text: "You reviewed and refactored legacy Lua code",    coins: [90,  220] },
  { text: "You built a matchmaking system",                 coins: [150, 350] },
  { text: "You created a custom UI framework",              coins: [110, 260] },
  { text: "You wrote an anti-exploit detection system",     coins: [130, 300] },
];

const ORDER_STATUSES = {
  not_started:        { label: "🔴 Not Started",        color: 0xed4245 },
  in_progress:        { label: "🔵 In Progress",         color: 0x5865f2 },
  almost_complete:    { label: "🟠 Almost Complete",     color: 0xffa500 },
  partially_complete: { label: "🟡 Partially Complete", color: 0xfee75c },
  completed:          { label: "🟢 Completed",           color: 0x57f287 },
  cancelled:          { label: "⚪ Cancelled",           color: 0x95a5a6 },
  on_hold:            { label: "⏸️ On Hold",             color: 0x9b59b6 },
  revision:           { label: "🔄 In Revision",         color: 0xf1c40f },
};

// ─── STATIC CONTENT ───────────────────────────────────────────────────────────
const SERVER_RULES = [
  "**1.** Be respectful — no harassment, hate speech, or personal attacks.",
  "**2.** No spam, advertising, or unsolicited self-promotion.",
  "**3.** Keep content SFW. No NSFW or graphic material.",
  "**4.** Use the correct channels for the correct topics.",
  "**5.** No scams, phishing links, or malicious files.",
  "**6.** Listen to staff — their decisions are final.",
  "**7.** Follow Discord's Terms of Service and Community Guidelines.",
];

const SERVICES = [
  { name: "🛠️ Roblox Scripts",  value: "Custom Lua — gameplay systems, tools, weapons, vehicles, and more." },
  { name: "📋 Commissions",      value: "Full commissioned work from small features to complete game systems. Open a ticket!" },
  { name: "⚙️ Custom Systems",   value: "Inventory, shop, datastore, leaderboard, party, matchmaking, anti-exploit, admin." },
  { name: "🐛 Scripting Help",   value: "Stuck on a bug? Use `/debug` to format your issue and get help." },
  { name: "🔍 Code Reviews",     value: "Feedback on your scripts — performance, structure, and best practices." },
];

const PAYMENT_INFO = {
  methods: [
    { name: "💵 USD",        value: "PayPal (F&F) or CashApp" },
    { name: "🎮 Robux",      value: "Group payouts only — buyer covers 30% tax" },
    { name: "🎁 Gift Cards", value: "Amazon, Roblox, Visa, Mastercard" },
  ],
  note: "⚠️ All sales are **FINAL** — NO REFUNDS under any circumstances.",
};

const DOCS = [
  { name: "📖 Creator Docs",       value: "https://create.roblox.com/docs" },
  { name: "📚 API Reference",      value: "https://create.roblox.com/docs/reference/engine" },
  { name: "🌙 Luau Reference",     value: "https://luau-lang.org/" },
  { name: "💬 DevForum Scripting", value: "https://devforum.roblox.com/c/help-and-feedback/scripting-support/55" },
  { name: "✏️ Style Guide",        value: "https://roblox.github.io/lua-style-guide/" },
];

const TIPS = [
  "Use `task.wait()` instead of deprecated `wait()` — faster and more accurate.",
  "Cache `:GetService()` calls at the top — lookup costs add up in hot loops.",
  "Parent UI to `PlayerGui` AFTER setting all properties — fewer layout recalculations.",
  "RemoteEvents fire-and-forget; RemoteFunctions block — only use them when you need a return.",
  "DataStore writes are rate-limited — batch updates and prefer `:UpdateAsync` to avoid races.",
  "Use `Vector3.zero` / `Vector3.one` — fewer object allocations.",
  "Anchor parts you don't want physics on — the engine thanks you.",
  "Validate ALL client input on the server. Never. Trust. The. Client.",
  "`UDim2.fromScale` and `UDim2.fromOffset` make UI math crystal-clear.",
  "`:Destroy()` instances you're done with — connections clean up automatically.",
  "Profile before optimizing — the MicroProfiler is your best friend.",
  "Use `pcall` / `xpcall` around any code that could fail at runtime.",
];

const QUOTES = [
  "Code is poetry — write it like someone you respect will read it.",
  "The best script is the one you can read six months from now.",
  "Clean code beats clever code. Always.",
  "Every bug is a lesson disguised as frustration.",
  "Comment the WHY, not the WHAT.",
  "Naming is half the design.",
  "If you can't test it, you don't understand it.",
  "Refactor like a chef cleans as they cook.",
  "Your future self is your most demanding user.",
];

const EIGHT_BALL = [
  "It is certain.", "Without a doubt.", "Yes — definitely.", "You may rely on it.",
  "As I see it, yes.", "Most likely.", "Outlook good.", "Signs point to yes.",
  "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.",
  "Don't count on it.", "My reply is no.", "Outlook not so good.", "Very doubtful.",
];

const DAILY_REWARDS = [
  { text: "🎁 Free **code review tip** — comment your trickiest function and tag staff!", coins: 50  },
  { text: "🎁 **5% off** voucher on your next commission — DM staff with code `SNUGSAVE5`.", coins: 75  },
  { text: "🎁 **Scripting snippet** unlocked — try `/snippet` for inspiration.", coins: 60  },
  { text: "🎁 **Priority queue** — your next ticket gets a faster first response.", coins: 100 },
  { text: "🎁 **Double XP** on community engagement today (good vibes only).", coins: 80  },
  { text: "🎁 **AI Image token** — use `/imagine` to generate a free image!", coins: 55  },
];

const TRIVIA_QUESTIONS = [
  { q: "What Lua function replaces `wait()` in modern Roblox?",        a: ["task.wait","task wait"], hint: "It's in the `task` library." },
  { q: "What does `pcall` stand for in Lua?",                          a: ["protected call","pcall"], hint: "It prevents crashes on errors." },
  { q: "What service handles player data saving in Roblox?",           a: ["datastoreservice","datastore service"], hint: "`game:GetService()` call." },
  { q: "What event fires when a player joins a Roblox game?",          a: ["playeradded","players.playeradded"], hint: "On the `Players` service." },
  { q: "What does SOLID stand for in software design?",                a: ["single responsibility open closed liskov substitution interface segregation dependency inversion"], hint: "Five OOP design principles." },
  { q: "What Roblox class is used to create GUI buttons?",             a: ["textbutton","imagebutton"], hint: "Found under ScreenGui." },
];

const SCRIPT_EXAMPLES = {
  ui: { title: "Basic ScreenGui",
    code: `local Players = game:GetService("Players")
local player = Players.LocalPlayer
local gui = Instance.new("ScreenGui")
gui.Name = "ExampleGui"
gui.Parent = player:WaitForChild("PlayerGui")
local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(240, 120)
frame.Position = UDim2.fromScale(0.5, 0.5)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
frame.Parent = gui
local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.Text = "Hello, " .. player.Name
label.TextColor3 = Color3.new(1, 1, 1)
label.Font = Enum.Font.GothamMedium
label.TextSize = 18
label.Parent = frame` },
  datastore: { title: "Safe DataStore",
    code: `local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local store = DataStoreService:GetDataStore("PlayerData_v1")

local function load(player)
    local ok, data = pcall(store.GetAsync, store, player.UserId)
    return ok and data or { coins = 0 }
end

local function save(player, data)
    pcall(store.SetAsync, store, player.UserId, data)
end

Players.PlayerAdded:Connect(function(player)
    local data = load(player)
    print(player.Name, "loaded with", data.coins, "coins")
end)` },
  remote: { title: "RemoteEvent Pattern",
    code: `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local event = Instance.new("RemoteEvent")
event.Name = "GiveCoins"
event.Parent = ReplicatedStorage

-- Server-side handler
event.OnServerEvent:Connect(function(player, amount)
    amount = math.clamp(tonumber(amount) or 0, 0, 100)
    print(player.Name, "requested", amount, "coins")
end)` },
  movement: { title: "Movement Tweaks",
    code: `local Players = game:GetService("Players")

local function applyMovement(character)
    local humanoid = character:WaitForChild("Humanoid")
    humanoid.WalkSpeed = 24
    humanoid.JumpPower = 60
    humanoid.UseJumpPower = true
end

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(applyMovement)
    if player.Character then applyMovement(player.Character) end
end)` },
  admin: { title: "Admin Command System",
    code: `local Players = game:GetService("Players")
local ADMINS = { ["YourUsername"] = true }
local PREFIX = "/"

local commands = {}
commands.kick = function(speaker, args)
    local target = Players:FindFirstChild(args[1] or "")
    if target then target:Kick("Kicked by admin") end
end
commands.speed = function(speaker, args)
    local char = speaker.Character
    if char then char.Humanoid.WalkSpeed = tonumber(args[1]) or 16 end
end

Players.PlayerAdded:Connect(function(player)
    player.Chatted:Connect(function(msg)
        if not ADMINS[player.Name] then return end
        local parts = msg:sub(2):split(" ")
        local cmd = commands[parts[1]:lower()]
        if cmd then cmd(player, {table.unpack(parts, 2)}) end
    end)
end)` },
};

const SNIPPETS = [
  { title: "WaitForChild safely",  code: `local part = workspace:WaitForChild("MyPart", 5)\nif not part then warn("MyPart never appeared") end` },
  { title: "Tween a part",         code: `local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(1, Enum.EasingStyle.Quad)\nlocal tween = TweenService:Create(part, info, {Position = part.Position + Vector3.new(0,5,0)})\ntween:Play()` },
  { title: "Loop all players",     code: `for _, player in ipairs(game.Players:GetPlayers()) do\n    print(player.Name, player.UserId)\nend` },
  { title: "Safe HTTP request",    code: `local ok, result = pcall(function()\n    return game:GetService("HttpService"):GetAsync("https://example.com/api")\nend)\nif not ok then warn("Request failed:", result) end` },
  { title: "Debounce touch event", code: `local debounce = false\npart.Touched:Connect(function(hit)\n    if debounce then return end\n    debounce = true\n    print(hit.Name, "touched")\n    task.wait(1)\n    debounce = false\nend)` },
  { title: "Lerp a value",         code: `local function lerp(a, b, t) return a + (b - a) * t end\nfor i = 0, 1, 0.05 do\n    part.CFrame = CFrame.new(lerp(0, 10, i), 0, 0)\n    task.wait()\nend` },
];

// ═══════════════════════════════════════════════════════════════════════════
//  AI SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const AI_TICKET_SYSTEM = `You are **Snuggles AI** — the fully automated AI for **Snuggles Scripting**, a professional Roblox scripting services Discord server run by **SnugglesMcBear**. You handle ALL interactions — tickets, support, partnerships — completely on your own. You ARE the support. No staff involvement is needed or expected.

## About Snuggles Scripting
- Professional custom Roblox/Luau scripting: game systems, UI, datastores, admin panels, anti-exploit, matchmaking, weapons, vehicles, leaderboards, animations, and more
- Owned by SnugglesMcBear — quality, reliability, fast turnaround
- Payment: USD via PayPal F&F or CashApp, Robux group payout (buyer covers 30% tax), gift cards (Amazon, Roblox, Visa, Mastercard)
- ALL sales FINAL — no refunds under any circumstances
- Pricing by complexity: simple scripts $5–25, UI/GUIs $20–60, full game systems $60–250+

## Policies
- ToS: https://docs.google.com/document/d/13dYCdrmj9mU9jWmEYONExBDnfcwYlQfxR6UJdZRsP28/edit
- Privacy: https://docs.google.com/document/d/16ppiOOtWtPkarJVjmxbsHBlObJFQg8IIrnMOaFhDcXk/edit

## Behavior Rules
- Warm, professional, genuine — you represent the brand 💗
- Fully resolve ALL questions yourself — NEVER say "wait for staff" or "a team member will assist" — you ARE the team
- You CAN give price ranges — always be helpful and confident
- Share Lua code snippets when helpful
- For refunds: explain all sales are final and reference ToS
- If rude: "Let's keep things respectful 💗"
- Returning customers with prior orders: mention their 5% loyalty discount
- End your VERY FIRST message with a warm call-to-action`;

const AI_CHAT_SYSTEM = `You are **Snuggles AI** — a smart, capable, friendly AI assistant built into the Snuggles Scripting Discord bot. You can help with absolutely anything: coding in any language, writing, math, creative projects, analysis, explanations, ideas, or just chatting.

Be conversational, accurate, and genuinely useful. Use formatting (bullets, code blocks, bold) when it improves clarity. You are NOT limited to any topic — answer freely and naturally.

When writing code, always use proper formatting with code blocks and include comments.`;

const AI_IMAGE_SYSTEM = `You are an expert image prompt engineer. When asked to generate an image, enhance and expand the user's description into a detailed, high-quality image generation prompt. Include: subject details, style, lighting, mood, color palette, composition, and technical quality descriptors. Keep enhanced prompts under 200 words. Output ONLY the enhanced prompt, nothing else.`;

// ═══════════════════════════════════════════════════════════════════════════
//  DATA PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    nextOrderId: 1, nextWarnId: 1, nextWorkId: 1, nextReviewId: 1,
    orders: [], blacklist: [], warns: {}, modLogChannels: {},
    portfolio: [], reviews: [], dailyClaims: {}, settings: {},
    stats: { ticketsOpened:0, ticketsClosed:0, ordersCreated:0, ordersCompleted:0, reviewsSubmitted:0, imagesGenerated:0 },
    leveling: {}, economy: {}, invites: {}, inviteCache: {},
    stickyMessages: {}, partnerships: [], triviaActive: {}, giveaways: {},
    antiRaid: {}, antiNuke: {}, reviewConfig: {}, aiImageCooldowns: {},
  };
}

function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultData();
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const base   = defaultData();
    const merged = {};
    for (const key of Object.keys(base)) {
      if (Array.isArray(base[key]))   merged[key] = Array.isArray(parsed[key]) ? parsed[key] : base[key];
      else if (isObj(base[key]))      merged[key] = isObj(parsed[key]) ? { ...base[key], ...parsed[key] } : base[key];
      else                            merged[key] = parsed[key] ?? base[key];
    }
    return merged;
  } catch (err) {
    console.error("Failed to load data.json — starting fresh:", err.message);
    return defaultData();
  }
}

let saveTimer = null;
function saveData() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
    catch (err) { console.error("Save failed:", err.message); }
  }, 500);
}

const data = loadData();

// ─── Accessor helpers ─────────────────────────────────────────────────────────
function getSettings(guildId) {
  if (!data.settings[guildId]) data.settings[guildId] = {};
  return data.settings[guildId];
}
function getEco(userId) {
  if (!data.economy[userId]) data.economy[userId] = { coins:0, lastCoinAt:0, inventory:[] };
  return data.economy[userId];
}
function getLv(userId) {
  if (!data.leveling[userId]) data.leveling[userId] = { xp:0, level:1, lastXpAt:0, totalMessages:0 };
  return data.leveling[userId];
}
function getReviewCfg(guildId) {
  if (!data.reviewConfig[guildId]) data.reviewConfig[guildId] = {
    enabled:true, minRating:1, maxRating:5, requireType:true,
    minLength:10, channelId:null, pingRole:null, allowedTypes:[],
    blockedWords:[], cooldownMs:60_000, requireOrder:false,
    autoPost:true, embedColor:BRAND_COLOR, showAvatar:true, dmConfirm:false,
  };
  return data.reviewConfig[guildId];
}
function getAntiRaid(guildId) {
  if (!data.antiRaid[guildId]) data.antiRaid[guildId] = {
    enabled:false, threshold:8, window:10_000, action:"kick",
    minAccountAge:0, autoUnlock:30_000, whitelistedRoles:[], whitelistedUsers:[],
    notifyChannel:null, dmOnAction:true, logJoins:false, alertOwner:false,
  };
  return data.antiRaid[guildId];
}
function getAntiNuke(guildId) {
  if (!data.antiNuke[guildId]) data.antiNuke[guildId] = {
    enabled:false, channelDeleteThreshold:3, banThreshold:5,
    roleDeleteThreshold:3, webhookDeleteThreshold:3, kickThreshold:5,
    window:10_000, action:"ban", trustedRoles:[], trustedUsers:[],
    notifyChannel:null, lockOnTrigger:false, alertOwner:false,
  };
  return data.antiNuke[guildId];
}

// ═══════════════════════════════════════════════════════════════════════════
//  DISCORD CLIENT
// ═══════════════════════════════════════════════════════════════════════════

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
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
});

// ═══════════════════════════════════════════════════════════════════════════
//  SLASH COMMAND DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const slashCommands = [
  // General
  new SlashCommandBuilder().setName("help").setDescription("Show all commands"),
  new SlashCommandBuilder().setName("info").setDescription("Bot information"),
  new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),
  new SlashCommandBuilder().setName("status").setDescription("Systems overview"),
  new SlashCommandBuilder().setName("rules").setDescription("Server rules"),
  new SlashCommandBuilder().setName("uptime").setDescription("Bot uptime"),
  // AI
  new SlashCommandBuilder().setName("ai").setDescription("Chat with Snuggles AI")
    .addStringOption(o=>o.setName("message").setDescription("Your message").setRequired(true)),
  new SlashCommandBuilder().setName("ai-reset").setDescription("Clear your AI conversation history"),
  new SlashCommandBuilder().setName("imagine").setDescription("Generate an AI image")
    .addStringOption(o=>o.setName("prompt").setDescription("What to generate").setRequired(true))
    .addStringOption(o=>o.setName("style").setDescription("Art style").addChoices(
      ...Object.keys(IMG_STYLES).map(s=>({name:s,value:s}))
    )),
  // Music
  new SlashCommandBuilder().setName("play").setDescription("Play music from YouTube, Spotify, Apple Music, or search")
    .addStringOption(o=>o.setName("query").setDescription("Song name, URL, or search query").setRequired(true)),
  new SlashCommandBuilder().setName("skip").setDescription("Skip current track"),
  new SlashCommandBuilder().setName("stop").setDescription("Stop music and leave voice channel"),
  new SlashCommandBuilder().setName("queue").setDescription("View music queue"),
  new SlashCommandBuilder().setName("volume").setDescription("Set music volume")
    .addIntegerOption(o=>o.setName("level").setDescription("0–100").setMinValue(0).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName("pause").setDescription("Pause music"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume music"),
  new SlashCommandBuilder().setName("loop").setDescription("Toggle loop mode"),
  new SlashCommandBuilder().setName("nowplaying").setDescription("Show currently playing track"),
  new SlashCommandBuilder().setName("lofi").setDescription("24/7 lofi radio info"),
  // Commissions
  new SlashCommandBuilder().setName("services").setDescription("What we offer"),
  new SlashCommandBuilder().setName("prices").setDescription("Pricing & payment info"),
  new SlashCommandBuilder().setName("pay").setDescription("Payment details"),
  new SlashCommandBuilder().setName("orderinfo").setDescription("Check order status")
    .addIntegerOption(o=>o.setName("id").setDescription("Order ID").setRequired(true)),
  new SlashCommandBuilder().setName("discount").setDescription("Check your loyalty discount"),
  new SlashCommandBuilder().setName("ticket").setDescription("How to open a ticket"),
  // Portfolio
  new SlashCommandBuilder().setName("work").setDescription("Browse portfolio")
    .addIntegerOption(o=>o.setName("page").setDescription("Page number")),
  // Scripting
  new SlashCommandBuilder().setName("script").setDescription("Example Lua scripts")
    .addStringOption(o=>o.setName("type").setDescription("Script type").setRequired(true).addChoices(
      {name:"UI",value:"ui"},{name:"DataStore",value:"datastore"},{name:"RemoteEvent",value:"remote"},{name:"Movement",value:"movement"},{name:"Admin",value:"admin"}
    )),
  new SlashCommandBuilder().setName("snippet").setDescription("Random Lua code snippet"),
  new SlashCommandBuilder().setName("docs").setDescription("Documentation links"),
  new SlashCommandBuilder().setName("debug").setDescription("Bug report template"),
  new SlashCommandBuilder().setName("tip").setDescription("Random scripting tip"),
  // Economy / Leveling
  new SlashCommandBuilder().setName("level").setDescription("Check level and XP")
    .addUserOption(o=>o.setName("user").setDescription("User to check")),
  new SlashCommandBuilder().setName("rank").setDescription("Detailed stats card")
    .addUserOption(o=>o.setName("user").setDescription("User to check")),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Top 10 XP leaderboard"),
  new SlashCommandBuilder().setName("balance").setDescription("Check coin balance")
    .addUserOption(o=>o.setName("user").setDescription("User to check")),
  new SlashCommandBuilder().setName("dowork").setDescription("Earn coins (1hr cooldown)"),
  new SlashCommandBuilder().setName("daily").setDescription("Claim daily reward"),
  new SlashCommandBuilder().setName("shop").setDescription("Coin shop"),
  new SlashCommandBuilder().setName("buy").setDescription("Purchase a shop item")
    .addStringOption(o=>o.setName("item").setDescription("Item ID").setRequired(true)),
  // Reviews
  new SlashCommandBuilder().setName("review").setDescription("Submit a review")
    .addIntegerOption(o=>o.setName("rating").setDescription("1–5 stars").setMinValue(1).setMaxValue(5).setRequired(true))
    .addStringOption(o=>o.setName("type").setDescription("Commission type").setRequired(true))
    .addStringOption(o=>o.setName("message").setDescription("Your review").setRequired(true)),
  new SlashCommandBuilder().setName("vouch").setDescription("Quick vouch")
    .addStringOption(o=>o.setName("text").setDescription("Your vouch").setRequired(true)),
  // Fun
  new SlashCommandBuilder().setName("quote").setDescription("Motivational quote"),
  new SlashCommandBuilder().setName("meme").setDescription("Random wholesome meme"),
  new SlashCommandBuilder().setName("8ball").setDescription("Magic 8-ball")
    .addStringOption(o=>o.setName("question").setDescription("Your question").setRequired(true)),
  new SlashCommandBuilder().setName("rate").setDescription("Rate something")
    .addStringOption(o=>o.setName("thing").setDescription("What to rate").setRequired(true)),
  new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
  new SlashCommandBuilder().setName("roll").setDescription("Roll a dice")
    .addIntegerOption(o=>o.setName("max").setDescription("Max value (default 6)").setMinValue(2).setMaxValue(10000)),
  new SlashCommandBuilder().setName("rps").setDescription("Rock paper scissors")
    .addStringOption(o=>o.setName("choice").setDescription("Your pick").setRequired(true).addChoices(
      {name:"Rock 🪨",value:"rock"},{name:"Paper 📄",value:"paper"},{name:"Scissors ✂️",value:"scissors"}
    )),
  new SlashCommandBuilder().setName("trivia").setDescription("Scripting trivia for coins"),
  new SlashCommandBuilder().setName("remindme").setDescription("Set a reminder")
    .addStringOption(o=>o.setName("time").setDescription("Duration e.g. 10m, 1h").setRequired(true))
    .addStringOption(o=>o.setName("message").setDescription("Reminder message").setRequired(true)),
  new SlashCommandBuilder().setName("color").setDescription("Preview a hex color")
    .addStringOption(o=>o.setName("hex").setDescription("Hex code e.g. FF8FB1").setRequired(true)),
  new SlashCommandBuilder().setName("calc").setDescription("Calculator")
    .addStringOption(o=>o.setName("expression").setDescription("Math expression").setRequired(true)),
  // Info
  new SlashCommandBuilder().setName("userinfo").setDescription("User details")
    .addUserOption(o=>o.setName("user").setDescription("User to inspect")),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Server details"),
  new SlashCommandBuilder().setName("avatar").setDescription("Get user avatar")
    .addUserOption(o=>o.setName("user").setDescription("User")),
  new SlashCommandBuilder().setName("banner").setDescription("Get user banner")
    .addUserOption(o=>o.setName("user").setDescription("User")),
  new SlashCommandBuilder().setName("servericon").setDescription("Get server icon"),
  new SlashCommandBuilder().setName("stats").setDescription("Bot statistics"),
  new SlashCommandBuilder().setName("invites").setDescription("Check invite count")
    .addUserOption(o=>o.setName("user").setDescription("User")),
  new SlashCommandBuilder().setName("inviteleaderboard").setDescription("Top inviters"),
  // Mod
  new SlashCommandBuilder().setName("ban").setDescription("Ban a member")
    .addUserOption(o=>o.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason")),
  new SlashCommandBuilder().setName("kick").setDescription("Kick a member")
    .addUserOption(o=>o.setName("user").setDescription("User to kick").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason")),
  new SlashCommandBuilder().setName("mute").setDescription("Timeout a member")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("duration").setDescription("e.g. 10m, 1h, 1d").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason")),
  new SlashCommandBuilder().setName("warn").setDescription("Warn a member")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true)),
  new SlashCommandBuilder().setName("warns").setDescription("View warnings")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder().setName("unwarn").setDescription("Remove a warning")
    .addIntegerOption(o=>o.setName("id").setDescription("Warning ID").setRequired(true)),
  new SlashCommandBuilder().setName("purge").setDescription("Bulk delete messages")
    .addIntegerOption(o=>o.setName("count").setDescription("1–100").setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName("lock").setDescription("Lock current channel"),
  new SlashCommandBuilder().setName("unlock").setDescription("Unlock current channel"),
  new SlashCommandBuilder().setName("slowmode").setDescription("Set slowmode")
    .addIntegerOption(o=>o.setName("seconds").setDescription("0–21600").setMinValue(0).setMaxValue(21600).setRequired(true)),
  new SlashCommandBuilder().setName("nick").setDescription("Set nickname")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o=>o.setName("name").setDescription("New nickname (leave blank to clear)")),
  // Admin
  new SlashCommandBuilder().setName("announce").setDescription("Send an announcement")
    .addStringOption(o=>o.setName("message").setDescription("Announcement text").setRequired(true))
    .addChannelOption(o=>o.setName("channel").setDescription("Target channel")),
  new SlashCommandBuilder().setName("say").setDescription("Send a message as the bot")
    .addStringOption(o=>o.setName("message").setDescription("Message").setRequired(true)),
  new SlashCommandBuilder().setName("embed").setDescription("Send a custom embed")
    .addStringOption(o=>o.setName("title").setDescription("Embed title").setRequired(true))
    .addStringOption(o=>o.setName("body").setDescription("Embed body").setRequired(true)),
  new SlashCommandBuilder().setName("poll").setDescription("Create a poll")
    .addStringOption(o=>o.setName("question").setDescription("Poll question").setRequired(true))
    .addStringOption(o=>o.setName("options").setDescription("Options separated by | e.g. Yes | No | Maybe").setRequired(true)),
  new SlashCommandBuilder().setName("giveaway").setDescription("Start a giveaway")
    .addStringOption(o=>o.setName("duration").setDescription("e.g. 1h, 1d").setRequired(true))
    .addStringOption(o=>o.setName("prize").setDescription("Prize description").setRequired(true)),
  new SlashCommandBuilder().setName("addorder").setDescription("Add an order (admin)")
    .addUserOption(o=>o.setName("user").setDescription("Customer").setRequired(true))
    .addStringOption(o=>o.setName("details").setDescription("Order details").setRequired(true)),
  new SlashCommandBuilder().setName("updateorder").setDescription("Update order status (admin)")
    .addIntegerOption(o=>o.setName("id").setDescription("Order ID").setRequired(true))
    .addStringOption(o=>o.setName("status").setDescription("New status").setRequired(true).addChoices(
      ...Object.keys(ORDER_STATUSES).map(s=>({name:ORDER_STATUSES[s].label,value:s}))
    ))
    .addStringOption(o=>o.setName("note").setDescription("Optional note")),
  new SlashCommandBuilder().setName("complete").setDescription("Mark order as complete (admin)")
    .addIntegerOption(o=>o.setName("id").setDescription("Order ID").setRequired(true)),
  new SlashCommandBuilder().setName("blacklist").setDescription("Toggle user blacklist (admin)")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)),
  new SlashCommandBuilder().setName("setlog").setDescription("Set mod log channel (admin)")
    .addChannelOption(o=>o.setName("channel").setDescription("Channel (leave blank to disable)")),
  new SlashCommandBuilder().setName("setreviews").setDescription("Set reviews channel (admin)")
    .addChannelOption(o=>o.setName("channel").setDescription("Channel")),
  new SlashCommandBuilder().setName("settranscripts").setDescription("Set transcripts channel (admin)")
    .addChannelOption(o=>o.setName("channel").setDescription("Channel")),
  new SlashCommandBuilder().setName("ticketpanel").setDescription("Post ticket panel (admin)"),
  new SlashCommandBuilder().setName("close").setDescription("Close a ticket")
    .addStringOption(o=>o.setName("reason").setDescription("Reason").setRequired(true)),
  new SlashCommandBuilder().setName("addnote").setDescription("Add staff note to ticket")
    .addStringOption(o=>o.setName("text").setDescription("Note text").setRequired(true)),
  new SlashCommandBuilder().setName("givecoins").setDescription("Give coins to a user (admin)")
    .addUserOption(o=>o.setName("user").setDescription("User").setRequired(true))
    .addIntegerOption(o=>o.setName("amount").setDescription("Amount").setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName("aioff").setDescription("Disable AI in this ticket (staff)"),
  new SlashCommandBuilder().setName("aion").setDescription("Enable AI in this ticket (staff)"),
].map(c => c.toJSON());

// ─── Register slash commands ──────────────────────────────────────────────────
async function registerSlashCommands() {
  if (!CLIENT_ID || !TOKEN) return;
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    console.log("📡 Registering slash commands globally…");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
    console.log(`✅ Registered ${slashCommands.length} slash commands!`);
  } catch (err) {
    console.error("Failed to register slash commands:", err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AI — GROQ CALLER
// ═══════════════════════════════════════════════════════════════════════════

const ticketConvos    = new Map();
const ticketAIOff     = new Set();
const partnerAwaitAd  = new Map();
const aiCooldowns     = new Map();
const userChatHistory = new Map();

async function callGroq(messages, systemPrompt, opts = {}) {
  if (!GROQ_API_KEY) return { text: null, model: null };
  const maxTokens = opts.maxTokens || 800;
  const temp      = opts.temperature ?? 0.7;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: model.id,
          max_tokens: maxTokens,
          temperature: temp,
          messages: [{ role:"system", content: systemPrompt }, ...messages],
        }),
      });
      if (!res.ok) { if (res.status === 429) continue; console.error(`[AI] ${model.id} → ${res.status}`); continue; }
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content?.trim() || null;
      if (text) return { text, model: model.label };
    } catch (err) { console.error(`[AI] ${model.id} error:`, err.message); }
  }
  return { text: null, model: null };
}

async function callTicketAI(channelId, userMsg, ticketType, formCtx) {
  if (!ticketConvos.has(channelId)) ticketConvos.set(channelId, []);
  const history = ticketConvos.get(channelId);
  history.push({ role:"user", content: userMsg });
  while (history.length > 24) history.shift();
  const sys = AI_TICKET_SYSTEM + (formCtx ? `\n\n## Ticket Context\nType: ${ticketType}\n${formCtx}` : "");
  const result = await callGroq(history, sys, { maxTokens: 700 });
  if (result.text) history.push({ role:"assistant", content: result.text });
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
//  IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function enhanceImagePrompt(userPrompt) {
  const { text } = await callGroq(
    [{ role:"user", content:`Enhance this image prompt: "${userPrompt}"` }],
    AI_IMAGE_SYSTEM, { maxTokens: 200, temperature: 0.8 }
  );
  return text || userPrompt;
}

async function generateImageStability(prompt, style) {
  const fullPrompt = style ? `${prompt}, ${IMG_STYLES[style] || ""}` : prompt;
  const res = await fetch("https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${STABILITY_API_KEY}`, "Accept":"application/json" },
    body: JSON.stringify({
      text_prompts: [{ text: fullPrompt, weight: 1 }, { text: "blurry, bad quality, distorted, ugly, nsfw", weight: -1 }],
      cfg_scale: 7, height: 1024, width: 1024, steps: 30, samples: 1,
    }),
  });
  if (!res.ok) throw new Error(`Stability API: ${res.status}`);
  const json = await res.json();
  const b64  = json.artifacts?.[0]?.base64;
  if (!b64) throw new Error("No image in response");
  return { buffer: Buffer.from(b64, "base64"), ext: "png", source: "Stability AI SDXL" };
}

async function generateImageDALLE(prompt) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model:"dall-e-3", prompt, n:1, size:"1024x1024", response_format:"b64_json" }),
  });
  if (!res.ok) throw new Error(`DALL-E: ${res.status}`);
  const json = await res.json();
  const b64  = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No DALL-E image");
  return { buffer: Buffer.from(b64, "base64"), ext: "png", source: "OpenAI DALL-E 3" };
}

async function generateImagePollinations(prompt, style) {
  const styleTag = style ? `, ${IMG_STYLES[style]}` : "";
  const encoded  = encodeURIComponent(`${prompt}${styleTag}`);
  const seed     = Math.floor(Math.random() * 999_999);
  const url      = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true`;
  const res      = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations: ${res.status}`);
  const buffer   = Buffer.from(await res.arrayBuffer());
  return { buffer, ext: "png", source: "Pollinations AI (free)" };
}

async function generateImage(prompt, style) {
  if (STABILITY_API_KEY) {
    try { return await generateImageStability(prompt, style); } catch (err) { console.warn("[ImgGen] Stability failed:", err.message); }
  }
  if (OPENAI_API_KEY) {
    try { return await generateImageDALLE(prompt); } catch (err) { console.warn("[ImgGen] DALL-E failed:", err.message); }
  }
  return await generateImagePollinations(prompt, style);
}

// ═══════════════════════════════════════════════════════════════════════════
//  MUSIC SYSTEM — uses play-dl (no bot detection issues)
// ═══════════════════════════════════════════════════════════════════════════

const guildMusic = new Map();
function getGuildMusic(guildId) {
  if (!guildMusic.has(guildId)) guildMusic.set(guildId, {
    queue: [], current: null, connection: null, player: null,
    volume: 0.5, loop: false, textChannel: null,
  });
  return guildMusic.get(guildId);
}

// ─── Resolve query using play-dl ──────────────────────────────────────────────
async function resolveQuery(query) {
  try {
    const play = require("play-dl");

    // Spotify
    if (query.includes("spotify.com")) {
      const spotifyData = await play.spotify(query).catch(() => null);
      if (!spotifyData) return [{ title: query, searchQuery: query, source: "Search 🔍" }];
      if (spotifyData.type === "track") {
        return [{ title: `${spotifyData.name} — ${spotifyData.artists[0].name}`, searchQuery: `${spotifyData.name} ${spotifyData.artists[0].name}`, source: "Spotify 🎧" }];
      }
      if (spotifyData.type === "playlist" || spotifyData.type === "album") {
        const tracks = await play.spotify(query);
        return tracks.tracks.slice(0, 30).map(t => ({
          title: `${t.name} — ${t.artists[0].name}`,
          searchQuery: `${t.name} ${t.artists[0].name}`,
          source: "Spotify 🎧",
        }));
      }
    }

    // YouTube URL
    if (query.match(/youtu(?:\.be|be\.com)/)) {
      const info = await play.video_info(query).catch(() => null);
      if (info) return [{ title: info.video_details.title, url: query, source: "YouTube ▶️" }];
    }

    // Search
    const results = await play.search(query, { limit: 1 });
    if (results?.length) {
      return [{ title: results[0].title, url: results[0].url, source: "YouTube ▶️" }];
    }
  } catch (err) {
    console.warn("[Music] resolveQuery error:", err.message);
  }
  return [{ title: query, searchQuery: query, source: "Search 🔍" }];
}

async function getYouTubeStream(track) {
  const play = require("play-dl");
  let url = track.url;
  if (!url && track.searchQuery) {
    const results = await play.search(track.searchQuery, { limit: 1 });
    url = results?.[0]?.url;
  }
  if (!url) throw new Error("No URL found for track");
  const stream = await play.stream(url, { quality: 2 });
  return stream;
}

async function playNextTrack(guildId) {
  const m = getGuildMusic(guildId);
  if (!m.queue.length && !m.loop) { m.current = null; return; }
  const track = m.loop && m.current ? m.current : m.queue.shift();
  m.current = track;
  try {
    const { createAudioResource, AudioPlayerStatus, StreamType } = require("@discordjs/voice");
    const stream   = await getYouTubeStream(track);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });
    resource.volume?.setVolume(m.volume);
    m.player.play(resource);
    if (m.textChannel) {
      await m.textChannel.send({ embeds:[new EmbedBuilder().setColor(MUSIC_COLOR).setTitle("🎵 Now Playing")
        .setDescription(`**${track.title}**`)
        .addFields(
          {name:"Source",value:track.source||"—",inline:true},
          {name:"🔊 Volume",value:`${Math.round(m.volume*100)}%`,inline:true},
          {name:"🔁 Loop",value:m.loop?"On":"Off",inline:true},
        ).setTimestamp()] }).catch(()=>{});
    }
  } catch (err) {
    console.error("[Music] playNextTrack error:", err.message);
    if (m.textChannel) await m.textChannel.send({content:`❌ Failed to play **${track.title}**: ${err.message}`}).catch(()=>{});
    setTimeout(() => playNextTrack(guildId), 2000);
  }
}

// ─── 24/7 Lofi VC — uses direct radio streams (no bot detection) ──────────────
let lofiConnection   = null;
let lofiPlayer       = null;
let lofiCurrentTrack = null;
let lofiRetry        = null;

async function startLofiVC() {
  clearTimeout(lofiRetry);
  try {
    const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection, StreamType } = require("@discordjs/voice");

    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) { console.warn("[Lofi] Home guild not found"); return; }
    const vc = guild.channels.cache.get(LOFI_VC_CHANNEL_ID);
    if (!vc) { console.warn("[Lofi] VC not found:", LOFI_VC_CHANNEL_ID); return; }

    const existing = getVoiceConnection(HOME_GUILD_ID);
    if (existing) existing.destroy();

    const conn = joinVoiceChannel({
      channelId: LOFI_VC_CHANNEL_ID,
      guildId: HOME_GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
    });
    lofiConnection = conn;

    conn.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("[Lofi] Disconnected — retrying in 8s");
      lofiRetry = setTimeout(startLofiVC, 8000);
    });
    conn.on("error", err => {
      console.error("[Lofi] Connection error:", err.message);
      lofiRetry = setTimeout(startLofiVC, 10_000);
    });

    const player = createAudioPlayer();
    lofiPlayer = player;
    conn.subscribe(player);

    const playStream = async () => {
      const track = LOFI_STREAMS[Math.floor(Math.random() * LOFI_STREAMS.length)];
      lofiCurrentTrack = track;
      console.log("[Lofi] ▶", track.title, track.url);
      try {
        // Use play-dl for stream if available, fallback to direct HTTP fetch
        let resource;
        try {
          const play = require("play-dl");
          // For direct radio streams, use createAudioResource with the URL directly
          const { default: fetch } = await import("node-fetch").catch(() => ({ default: global.fetch }));
          resource = createAudioResource(track.url, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
          });
        } catch {
          resource = createAudioResource(track.url, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
          });
        }
        resource.volume?.setVolume(0.35);
        player.play(resource);
      } catch (err) {
        console.error("[Lofi] Stream error:", err.message);
        setTimeout(playStream, 5000);
      }
    };

    player.on(AudioPlayerStatus.Idle, () => setTimeout(playStream, 2000));
    player.on("error", err => {
      console.error("[Lofi] Player error:", err.message);
      setTimeout(playStream, 5000);
    });

    await playStream();
    console.log("🎵 24/7 Lofi VC started!");
  } catch (err) {
    console.warn("[Lofi] Not available (install @discordjs/voice):", err.message);
  }
}

// ─── Spotify token ────────────────────────────────────────────────────────────
let spotifyToken = null, spotifyExp = 0;
async function getSpotifyToken() {
  if (spotifyToken && Date.now() < spotifyExp) return spotifyToken;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null;
  try {
    const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const res   = await fetch("https://accounts.spotify.com/api/token", {
      method:"POST",
      headers:{"Authorization":`Basic ${creds}`,"Content-Type":"application/x-www-form-urlencoded"},
      body:"grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const json   = await res.json();
    spotifyToken = json.access_token;
    spotifyExp   = Date.now() + (json.expires_in - 60) * 1000;
    return spotifyToken;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
//  BOT STATUS CYCLE
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CYCLE = [
  n => ({ name:`over ${n} server${n!==1?"s":""} 💗`,      type:ActivityType.Watching  }),
  n => ({ name:`lofi beats 24/7 🎵`,                       type:ActivityType.Listening }),
  n => ({ name:`${n} Roblox scripter${n!==1?"s":""} ✨`,  type:ActivityType.Watching  }),
  n => ({ name:`/help — ${BOT_NAME}`,                       type:ActivityType.Playing   }),
  n => ({ name:`commissions open! 💗`,                      type:ActivityType.Playing   }),
];
let _statusIdx = 0;
function updateStatus() {
  const n = client.guilds.cache.size;
  const s = STATUS_CYCLE[_statusIdx++ % STATUS_CYCLE.length](n);
  client.user?.setActivity(s.name, { type:s.type });
}

// ═══════════════════════════════════════════════════════════════════════════
//  READY
// ═══════════════════════════════════════════════════════════════════════════

client.once("clientReady", async () => {
  console.log(`✅  ${BOT_NAME} v${BOT_VERSION} — ${client.user.tag}`);
  console.log(`🤖  AI: ${GROQ_API_KEY ? "Groq Enabled" : "Disabled"}`);
  console.log(`🖼️   Image Gen: ${STABILITY_API_KEY ? "Stability AI" : OPENAI_API_KEY ? "DALL-E 3" : "Pollinations (free)"}`);
  console.log(`🎵  Music: play-dl (no bot detection issues)`);

  await registerSlashCommands();
  for (const [, g] of client.guilds.cache) await cacheInvites(g).catch(()=>{});
  updateStatus();
  setInterval(updateStatus,      5  * 60_000);
  setInterval(checkGiveaways,    10_000);
  setInterval(updateOrderBoard,  3  * 60 * 60_000);
  setInterval(repostTicketPanel, 24 * 60 * 60_000);
  setTimeout(updateOrderBoard,   6_000);
  setTimeout(repostTicketPanel,  12_000);
  setTimeout(startLofiVC,        10_000);
});

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function isAdmin(m)    { return !!(m?.permissions?.has(PermissionFlagsBits.Administrator)); }
function hasPerm(m, f) { return !!(m?.permissions?.has(f)); }

function parseUserId(s)    { if(!s)return null; const m=s.match(/^(?:<@!?)?(\d{17,20})>?$/); return m?m[1]:null; }
function parseChannelId(s) { if(!s)return null; const m=s.match(/^<#(\d+)>$/)||s.match(/^(\d{15,21})$/); return m?m[1]:null; }
function parseRoleId(s)    { if(!s)return null; const m=s.match(/^<@&(\d+)>$/)||s.match(/^(\d{15,21})$/); return m?m[1]:null; }
function findOrder(id)     { const n=Number(id); return Number.isFinite(n)?(data.orders.find(o=>o.id===n)||null):null; }
function hasOrdered(uid)   { return data.orders.some(o=>o.userId===uid); }
function getOrderStatus(s) { return ORDER_STATUSES[s]||{label:s,color:BRAND_COLOR}; }

const TIME = { s:1000, m:60_000, h:3_600_000, d:86_400_000 };
function parseDuration(str) {
  const m=String(str||"").trim().toLowerCase().match(/^(\d+)\s*(s|m|h|d)?$/);
  if(!m) return null;
  const ms=parseInt(m[1],10)*(TIME[m[2]||"m"]);
  return(Number.isFinite(ms)&&ms>0)?ms:null;
}
function fmtDuration(ms) {
  const d=Math.floor(ms/TIME.d),h=Math.floor((ms%TIME.d)/TIME.h),m=Math.floor((ms%TIME.h)/TIME.m),s=Math.floor((ms%TIME.m)/TIME.s);
  return [d&&`${d}d`,h&&`${h}h`,m&&`${m}m`,(!d&&!h)&&s&&`${s}s`].filter(Boolean).join(" ")||"0s";
}

async function logMod(guild, embed) {
  const id=data.modLogChannels[guild?.id]; if(!id)return;
  const ch=await guild.channels.fetch(id).catch(()=>null);
  if(ch?.isTextBased()) await ch.send({embeds:[embed]}).catch(()=>{});
}

async function sendErrorLog(err, ctx="") {
  try {
    const g=client.guilds.cache.get(HOME_GUILD_ID); if(!g)return;
    const ch=await g.channels.fetch(ERROR_CHANNEL_ID).catch(()=>null); if(!ch?.isTextBased())return;
    await ch.send({embeds:[new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🚨 Bot Error")
      .addFields({name:"Context",value:ctx||"—"},{name:"Error",value:`\`\`\`${String(err?.message||err).slice(0,900)}\`\`\``})
      .setTimestamp()]});
  } catch {}
}

const _cds = new Map();
const CD_CONFIG = {
  review:86_400_000/24, meme:8_000, "8ball":3_000, rate:5_000,
  quote:5_000, tip:5_000, daily:86_400_000, pay:10_000, stats:8_000,
  snippet:5_000, dowork:WORK_CD_MS, trivia:5_000, coinflip:3_000,
  roll:3_000, rps:3_000, serverinfo:5_000, imagine:30_000,
};
function checkCD(cmd, uid) { const ms=CD_CONFIG[cmd]; if(!ms)return 0; const r=(_cds.get(`${cmd}:${uid}`)||0)-Date.now(); return r>0?Math.ceil(r/1000):0; }
function useCD(cmd, uid)   { const ms=CD_CONFIG[cmd]; if(ms) _cds.set(`${cmd}:${uid}`,Date.now()+ms); }

const _handled = new Map();
function alreadyHandled(id) {
  const now=Date.now();
  for(const [k,t]of _handled) if(now-t>60_000)_handled.delete(k);
  if(_handled.has(id))return true;
  _handled.set(id,now); return false;
}

const E = {
  brand:   t=>new EmbedBuilder().setColor(BRAND_COLOR).setTitle(t||""),
  success: t=>new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(t||""),
  error:   t=>new EmbedBuilder().setColor(ERROR_COLOR).setTitle(t||""),
  warn:    t=>new EmbedBuilder().setColor(WARN_COLOR).setTitle(t||""),
  info:    t=>new EmbedBuilder().setColor(INFO_COLOR).setTitle(t||""),
  gold:    t=>new EmbedBuilder().setColor(GOLD_COLOR).setTitle(t||""),
  ai:      t=>new EmbedBuilder().setColor(AI_COLOR).setTitle(t||""),
  music:   t=>new EmbedBuilder().setColor(MUSIC_COLOR).setTitle(t||""),
  img:     t=>new EmbedBuilder().setColor(IMG_COLOR).setTitle(t||""),
  xp:      t=>new EmbedBuilder().setColor(XP_COLOR).setTitle(t||""),
};

function aiFooter(modelLabel, username) {
  return `\n\n-# 🤖 **Snuggles AI**  •  ${modelLabel||"AI"}  •  asked by **${username}**`;
}

// ─── Safe interaction reply helper ───────────────────────────────────────────
async function reply(interaction, payload, ephemeral = false) {
  try {
    const opt = typeof payload === "string"
      ? { content: payload, flags: ephemeral ? MessageFlags.Ephemeral : undefined }
      : { ...payload, flags: ephemeral ? MessageFlags.Ephemeral : undefined };
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(opt);
    }
    return await interaction.reply(opt);
  } catch (err) {
    console.error("[reply]", err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANTI-RAID v3
// ═══════════════════════════════════════════════════════════════════════════

const raidTrackers  = new Map();
const raidLockdowns = new Map();
const nukeTrackers  = new Map();

async function handleAntiRaidJoin(member) {
  const s = getAntiRaid(member.guild.id);
  if(!s.enabled) return;
  if(s.whitelistedUsers?.includes(member.id)) return;
  if(s.whitelistedRoles?.some(r=>member.roles.cache.has(r))) return;

  if(!raidTrackers.has(member.guild.id)) raidTrackers.set(member.guild.id,{joins:[],locked:false,actioned:new Set()});
  const t=raidTrackers.get(member.guild.id), now=Date.now();
  t.joins=t.joins.filter(j=>now-j<s.window); t.joins.push(now);

  if(s.minAccountAge>0){
    const age=now-member.user.createdTimestamp;
    if(age<s.minAccountAge*TIME.d){
      if(s.dmOnAction) await member.user.send({content:`🛡️ **${member.guild.name}** — Your account is too new (min age: **${s.minAccountAge}d**). Try again later.`}).catch(()=>{});
      await(s.action==="ban"?member.ban({reason:"Anti-Raid: account too new"}):member.kick("Anti-Raid: account too new")).catch(()=>{});
      return;
    }
  }

  if(t.joins.length>=s.threshold&&!t.locked){
    t.locked=true;
    if(s.alertOwner){const o=await member.guild.fetchOwner().catch(()=>null);if(o)await o.send({content:`🚨 **RAID DETECTED** in **${member.guild.name}**!`}).catch(()=>{});}
    if(s.action==="lockdown"){
      for(const[,ch]of member.guild.channels.cache.filter(c=>c.type===ChannelType.GuildText)){
        await ch.permissionOverwrites.edit(member.guild.roles.everyone,{SendMessages:false}).catch(()=>{});
      }
      raidLockdowns.set(member.guild.id,{at:now});
      if(s.autoUnlock>0) setTimeout(async()=>{ await liftLockdown(member.guild,s); },s.autoUnlock);
    }
    if(s.autoUnlock>0&&s.action!=="lockdown") setTimeout(()=>{if(raidTrackers.has(member.guild.id)){raidTrackers.get(member.guild.id).locked=false;raidTrackers.get(member.guild.id).actioned.clear();}},s.autoUnlock);
  }

  if(t.locked&&["kick","ban"].includes(s.action)&&!t.actioned.has(member.id)){
    t.actioned.add(member.id);
    if(s.dmOnAction) await member.user.send({content:`🛡️ **${member.guild.name}** — You were ${s.action==="ban"?"banned":"removed"} by the anti-raid system.`}).catch(()=>{});
    await(s.action==="ban"?member.ban({reason:"Anti-Raid: raid in progress"}):member.kick("Anti-Raid: raid in progress")).catch(()=>{});
  }
}

async function liftLockdown(guild, s) {
  raidLockdowns.delete(guild.id);
  if(raidTrackers.has(guild.id)){raidTrackers.get(guild.id).locked=false;raidTrackers.get(guild.id).actioned.clear();}
  for(const[,ch]of guild.channels.cache.filter(c=>c.type===ChannelType.GuildText)){
    await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:null}).catch(()=>{});
  }
}

async function checkNuke(guild, userId, type) {
  const s=getAntiNuke(guild.id); if(!s.enabled)return;
  if(userId===client.user?.id)return;
  if(s.trustedUsers?.includes(userId))return;
  const key=`${guild.id}:${userId}`;
  if(!nukeTrackers.has(key)) nukeTrackers.set(key,{channelDeletes:[],bans:[],roleDeletes:[],webhookDeletes:[],kicks:[]});
  const t=nukeTrackers.get(key), now=Date.now();
  const map={
    channelDelete:{arr:"channelDeletes",th:s.channelDeleteThreshold,label:"channel deletions"},
    ban:          {arr:"bans",          th:s.banThreshold,           label:"bans"},
    roleDelete:   {arr:"roleDeletes",   th:s.roleDeleteThreshold,    label:"role deletions"},
    webhookDelete:{arr:"webhookDeletes",th:s.webhookDeleteThreshold, label:"webhook deletions"},
    kick:         {arr:"kicks",         th:s.kickThreshold,          label:"kicks"},
  };
  const c=map[type]; if(!c)return;
  t[c.arr]=t[c.arr].filter(x=>now-x<s.window); t[c.arr].push(now);
  if(t[c.arr].length>=c.th){ t[c.arr]=[]; await triggerNuke(guild,userId,`${c.th} ${c.label} in ${s.window/1000}s`,s); }
}

async function triggerNuke(guild, userId, reason, s) {
  const member=await guild.members.fetch(userId).catch(()=>null); if(!member)return;
  if(member.permissions.has(PermissionFlagsBits.Administrator))return;
  if(s.trustedRoles?.some(r=>member.roles.cache.has(r)))return;
  try {
    if(s.action==="ban")          { await member.ban({reason:`Anti-Nuke: ${reason}`}); }
    else if(s.action==="kick")    { await member.kick(`Anti-Nuke: ${reason}`); }
    else if(s.action==="strip_roles"){ for(const[,r]of member.roles.cache.filter(r=>r.id!==guild.id&&r.manageable)) await member.roles.remove(r).catch(()=>{}); }
    await member.user.send({content:`🚨 **${guild.name}** — Anti-Nuke triggered. Reason: ${reason}`}).catch(()=>{});
  } catch {}
  if(s.alertOwner){ const o=await guild.fetchOwner().catch(()=>null); if(o)await o.send({content:`🚨 Anti-Nuke triggered in **${guild.name}**! User: **${member.user.tag}**`}).catch(()=>{}); }
}

// ═══════════════════════════════════════════════════════════════════════════
//  TICKET SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function buildTicketPanel() {
  const embed=new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`🧸 ${BOT_NAME} — Open a Ticket`)
    .setDescription("**Need help or want to commission something?**\nChoose below — our AI handles everything 24/7!\n\n╔══════════════════════════════╗\n║  📦 **Order** — Commission a script/system\n║  🤝 **Partnership** — Partner with our server\n║  ❓ **Inquiry** — Questions & support\n╚══════════════════════════════╝\n\n*All tickets are handled by **Snuggles AI** — instant, available 24/7!* 💗")
    .setFooter({text:`${BOT_NAME} v${BOT_VERSION} • AI-Powered • 24/7 Support`}).setTimestamp();
  const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_order").setLabel("Order").setStyle(ButtonStyle.Primary).setEmoji("📦"),
    new ButtonBuilder().setCustomId("ticket_partner").setLabel("Partnership").setStyle(ButtonStyle.Success).setEmoji("🤝"),
    new ButtonBuilder().setCustomId("ticket_inquiry").setLabel("Inquiry").setStyle(ButtonStyle.Secondary).setEmoji("❓"),
  );
  return { embed, row };
}

async function repostTicketPanel() {
  for(const [gid,s] of Object.entries(data.settings)){
    if(!s.ticketPanelChannelId)continue;
    try {
      const g=client.guilds.cache.get(gid); if(!g)continue;
      const ch=await g.channels.fetch(s.ticketPanelChannelId).catch(()=>null); if(!ch?.isTextBased())continue;
      if(s.ticketPanelMsgId){try{await ch.messages.delete(s.ticketPanelMsgId);}catch{}}
      const {embed,row}=buildTicketPanel();
      const sent=await ch.send({embeds:[embed],components:[row]});
      s.ticketPanelMsgId=sent.id; saveData();
    } catch {}
  }
}

async function openTicket(guildOrInteraction, member, ticketType, formAnswers) {
  const guild = guildOrInteraction.guild || guildOrInteraction;
  if(!guild||!member) return {ok:false,error:"Must be used in a server."};
  const s         = getSettings(guild.id);
  const safeName  = member.user.username.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,16)||"user";
  let   chanName  = `ticket-${safeName}`;
  const maxOpen   = s.maxOpenTickets||1;
  const existing  = guild.channels.cache.filter(c=>c.type===ChannelType.GuildText&&c.name.startsWith("ticket-")&&c.permissionOverwrites.cache.has(member.id));
  if(existing.size>=maxOpen) return {ok:false,error:`You already have **${existing.size}** open ticket(s). (Max: ${maxOpen})`};
  if(guild.channels.cache.find(c=>c.name===chanName)) chanName+=`-${Date.now().toString(36).slice(-4)}`;

  const staffRoles=s.ticketStaffRoles||[];
  const overwrites=[
    {id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},
    {id:member.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]},
    {id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ManageChannels,PermissionFlagsBits.ReadMessageHistory]},
  ];
  for(const r of staffRoles) overwrites.push({id:r,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles,PermissionFlagsBits.ManageMessages]});
  guild.roles.cache.forEach(r=>{if(r.permissions.has(PermissionFlagsBits.ManageMessages)&&!r.managed&&!staffRoles.includes(r.id))overwrites.push({id:r.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]});});

  let created;
  try {
    created=await guild.channels.create({name:chanName,type:ChannelType.GuildText,topic:`[${ticketType}] ${member.user.tag}`,permissionOverwrites:overwrites,parent:s.ticketCategoryId||undefined,reason:`Ticket by ${member.user.tag}`});
  } catch { return {ok:false,error:"Failed to create channel. Check **Manage Channels** permission."}; }

  data.stats.ticketsOpened=(data.stats.ticketsOpened||0)+1; saveData();

  const closeRow=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close_btn").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"));

  let detailEmbed, formCtx="";
  if(ticketType==="order"){
    formCtx=`Roblox: ${formAnswers.username}\nService: ${formAnswers.service}\nDesc: ${formAnswers.description}\nBudget: ${formAnswers.budget}\nPayment: ${formAnswers.payment}`;
    detailEmbed=new EmbedBuilder().setColor(BRAND_COLOR).setTitle("📦 Order Ticket")
      .addFields({name:"👤 Roblox Username",value:formAnswers.username||"—"},{name:"🛠️ Service",value:formAnswers.service||"—"},{name:"📝 Description",value:formAnswers.description||"—"},{name:"💰 Budget",value:formAnswers.budget||"—",inline:true},{name:"💳 Payment",value:formAnswers.payment||"—",inline:true})
      .setFooter({text:`Order • ${member.user.tag}`}).setTimestamp();
  } else if(ticketType==="partnership"){
    formCtx=`Server: ${formAnswers.serverName}\nInvite: ${formAnswers.invite}\nMembers: ${formAnswers.memberCount}\nFocus: ${formAnswers.focus}\nOffering: ${formAnswers.offering}`;
    detailEmbed=new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🤝 Partnership Ticket")
      .addFields({name:"🏠 Server",value:formAnswers.serverName||"—"},{name:"🔗 Invite",value:formAnswers.invite||"—"},{name:"👥 Members",value:formAnswers.memberCount||"—",inline:true},{name:"🎯 Focus",value:formAnswers.focus||"—",inline:true},{name:"🤝 Offering",value:formAnswers.offering||"—"})
      .setFooter({text:`Partnership • ${member.user.tag}`}).setTimestamp();
  } else {
    formCtx=`Name: ${formAnswers.name}\nTopic: ${formAnswers.topic}\nDetails: ${formAnswers.details}\nUrgency: ${formAnswers.urgency||"—"}`;
    detailEmbed=new EmbedBuilder().setColor(INFO_COLOR).setTitle("❓ Inquiry Ticket")
      .addFields({name:"👤 Name",value:formAnswers.name||"—"},{name:"❓ Topic",value:formAnswers.topic||"—"},{name:"📝 Details",value:formAnswers.details||"—"},{name:"⚡ Urgency",value:formAnswers.urgency||"Not specified",inline:true})
      .setFooter({text:`Inquiry • ${member.user.tag}`}).setTimestamp();
  }
  if(hasOrdered(member.id)&&ticketType==="order") detailEmbed.addFields({name:"🎟️ Loyalty Discount",value:"✅ Returning customer — **5% off** applied!"});

  await created.send({content:`<@${member.id}> Welcome to your ticket! 💗${s.ticketGreeting?`\n\n> ${s.ticketGreeting}`:""}`,embeds:[detailEmbed],components:[closeRow]});

  setImmediate(async()=>{
    try {
      const aiPrompt=`A new ${ticketType} ticket just opened:\n\n${formCtx}\n\nGreet the user warmly, address their ${ticketType} request directly, and resolve it completely on your own. 💗`;
      const {text,model}=await callTicketAI(created.id,aiPrompt,ticketType,formCtx);
      if(text) await created.send({content:`${text}${aiFooter(model,member.user.username)}`,allowedMentions:{users:[]}});
    } catch(err){ console.error("[TicketAI]",err.message); }
  });

  if(ticketType==="partnership"){
    setImmediate(async()=>{
      try {
        const count=parseInt(String(formAnswers.memberCount||"0").replace(/,/g,"").match(/\d+/)?.[0]||"0",10);
        if(count>0&&count<45){
          await created.send({embeds:[new EmbedBuilder().setColor(ERROR_COLOR).setTitle("❌ Partnership Declined").setDescription(`We require a minimum of **45 members**. You have **${count}**. Feel free to apply again once you've grown! 🌸`).setTimestamp()]});
          setTimeout(()=>created.delete("Partnership declined").catch(()=>{}),12_000);
          return;
        }
        const tier=count>=120?"🔥 Large (120+)":count>=70?"✨ Mid-Size (70–119)":"🌱 Small (45–69)";
        const ping=count>=120?"@everyone":count>=70?"@here":"";
        partnerAwaitAd.set(created.id,{member,formAnswers,count,ping,tier});
        const prompt=`Partnership application approved! Details: Server=${formAnswers.serverName}, Members=${count} (${tier}). Ask them to send their server ad text and optionally a banner image. Be warm! 💗`;
        const {text,model}=await callTicketAI(created.id,prompt,"partnership",formCtx);
        if(text) await created.send({content:`${text}${aiFooter(model,"Snuggles AI")}`,allowedMentions:{users:[]}});
      } catch(err){ console.error("[PartnerAI]",err.message); }
    });
  }
  return {ok:true,channel:created};
}

async function closeTicket(channel, closer, reason, guild) {
  let ownerId=null;
  for(const [id,o] of channel.permissionOverwrites.cache){if(o.type===1){ownerId=id;break;}}
  const msgs=[]; let lastId;
  for(let i=0;i<10;i++){
    const b=await channel.messages.fetch({limit:100,...(lastId?{before:lastId}:{})});
    if(!b.size)break; msgs.push(...b.values()); lastId=b.last().id; if(b.size<100)break;
  }
  msgs.sort((a,b)=>a.createdTimestamp-b.createdTimestamp);
  const transcript=[`Transcript: #${channel.name}`,`Closed: ${new Date().toISOString()}`,`Messages: ${msgs.length}`,"─".repeat(40),"",
    ...msgs.map(m=>`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content||""}${m.embeds.length?` [${m.embeds.length} embed(s)]`:""}`)
  ].join("\n");
  const file={attachment:Buffer.from(transcript,"utf8"),name:`${channel.name}-transcript.txt`};
  const s=getSettings(guild.id); const tcId=s.transcriptsChannelId||data.modLogChannels[guild.id];
  if(tcId){const tc=await guild.channels.fetch(tcId).catch(()=>null);if(tc?.isTextBased())await tc.send({embeds:[E.brand("🎟️ Ticket Closed").addFields({name:"Channel",value:`#${channel.name}`},{name:"Closed By",value:closer.user?.tag||closer.tag||"—",inline:true},{name:"Reason",value:reason,inline:true}).setTimestamp()],files:[file]}).catch(()=>{});}
  if(ownerId){try{const u=await client.users.fetch(ownerId);await u.send({embeds:[E.brand("🎟️ Ticket Closed").setDescription(`**#${channel.name}** closed.\n**Reason:** ${reason}`)],files:[{attachment:Buffer.from(transcript,"utf8"),name:`${channel.name}-transcript.txt`}]});}catch{}}
  ticketConvos.delete(channel.id); ticketAIOff.delete(channel.id); partnerAwaitAd.delete(channel.id);
  data.stats.ticketsClosed=(data.stats.ticketsClosed||0)+1; saveData();
  await channel.send({embeds:[E.warn("🔒 Closing in 5 seconds…").setDescription(`**Reason:** ${reason}`)]});
  setTimeout(()=>channel.delete(`Closed: ${reason}`).catch(()=>{}),5000);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER BOARD
// ═══════════════════════════════════════════════════════════════════════════

async function updateOrderBoard() {
  try {
    const g=client.guilds.cache.get(HOME_GUILD_ID); if(!g)return;
    const ch=await g.channels.fetch(ORDER_CHANNEL_ID).catch(()=>null); if(!ch?.isTextBased())return;
    const active=data.orders.filter(o=>o.status!=="completed"&&o.status!=="cancelled");
    const doneToday=data.orders.filter(o=>o.status==="completed"&&Date.now()-new Date(o.updatedAt).getTime()<86_400_000);
    const emb=new EmbedBuilder().setColor(BRAND_COLOR).setTitle("📋 Commission Order Board")
      .setDescription(`**Updated:** <t:${Math.floor(Date.now()/1000)}:R> | **Active:** ${active.length} | **Done Today:** ${doneToday.length}\n\n> Open a ticket to commission! 💗`)
      .setFooter({text:`${BOT_NAME} • Updates every 3 hours`}).setTimestamp();
    if(!active.length) emb.addFields({name:"✅ Queue Clear",value:"No active orders!"});
    else for(const o of active.slice(0,10)){const si=getOrderStatus(o.status);emb.addFields({name:`${si.label} — #${o.id}`,value:`**Customer:** <@${o.userId}>\n**Details:** ${o.details.slice(0,100)}${o.details.length>100?"...":""}\n**Updated:** <t:${Math.floor(new Date(o.updatedAt).getTime()/1000)}:R>`});}
    if(active.length>10) emb.addFields({name:`+${active.length-10} more`,value:"Use `/orderinfo <id>`"});
    const s=getSettings(HOME_GUILD_ID);
    if(s.orderBoardMsgId){try{await ch.messages.delete(s.orderBoardMsgId);}catch{}}
    const sent=await ch.send({embeds:[emb]}); s.orderBoardMsgId=sent.id; saveData();
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  LEVELING
// ═══════════════════════════════════════════════════════════════════════════

async function grantXP(msg) {
  const lv=getLv(msg.author.id), now=Date.now();
  if(now-lv.lastXpAt<XP_COOLDOWN_MS)return;
  lv.lastXpAt=now; lv.totalMessages=(lv.totalMessages||0)+1;
  lv.xp+=Math.max(1,XP_PER_MSG+Math.floor(Math.random()*XP_VARIANCE*2)-XP_VARIANCE);
  const needed=xpForLevel(lv.level);
  if(lv.xp>=needed){lv.xp-=needed;lv.level++;saveData();
    const ch=msg.guild?.channels.cache.get(LEVELUP_CHANNEL_ID)||msg.channel;
    await ch.send({content:`<@${msg.author.id}>`,embeds:[E.xp("🎉 Level Up!").setDescription(`<@${msg.author.id}> reached **Level ${lv.level}**! 🚀`).setThumbnail(msg.author.displayAvatarURL()).setFooter({text:`Next level: ${xpForLevel(lv.level)} XP`}).setTimestamp()]}).catch(()=>{});
  } else saveData();
}

async function grantCoins(msg) {
  const eco=getEco(msg.author.id), now=Date.now();
  if(now-eco.lastCoinAt<COINS_CD_MS)return;
  eco.lastCoinAt=now; eco.coins=(eco.coins||0)+COINS_PER_MSG; saveData();
}

// ═══════════════════════════════════════════════════════════════════════════
//  INVITE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

async function cacheInvites(guild) {
  try {
    const inv=await guild.invites.fetch();
    if(!data.inviteCache[guild.id])data.inviteCache[guild.id]={};
    inv.forEach(i=>{data.inviteCache[guild.id][i.code]=i.uses||0;});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  STICKY MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

const STICKY_TEXT="✨ **Want to leave a review?**\n\nUse `/review <1-5> <type> <message>` to share your experience!\n\nYour feedback means the world to us 💗";

async function refreshSticky(channel) {
  if(channel.id!==STICKY_CHANNEL_ID)return;
  const prev=data.stickyMessages[channel.id];
  if(prev){try{await channel.messages.delete(prev);}catch{}}
  const sent=await channel.send({embeds:[E.brand("").setDescription(STICKY_TEXT).setFooter({text:`${BOT_NAME} • Sticky`})]}).catch(()=>null);
  if(sent){data.stickyMessages[channel.id]=sent.id;saveData();}
}

// ═══════════════════════════════════════════════════════════════════════════
//  GIVEAWAYS
// ═══════════════════════════════════════════════════════════════════════════

async function checkGiveaways() {
  const now=Date.now();
  for(const [msgId,ga] of Object.entries(data.giveaways)){
    if(ga.ended||ga.endAt>now)continue;
    ga.ended=true; saveData();
    try {
      const g=client.guilds.cache.get(ga.guildId); if(!g)continue;
      const ch=await g.channels.fetch(ga.channelId).catch(()=>null); if(!ch)continue;
      const msg=await ch.messages.fetch(msgId).catch(()=>null); if(!msg)continue;
      const rxn=msg.reactions.cache.get("🎉");
      let entrants=[]; if(rxn){let last;while(true){const b=await rxn.users.fetch({limit:100,...(last?{after:last}:{})}).catch(()=>null);if(!b||!b.size)break;entrants.push(...b.filter(u=>!u.bot).map(u=>u.id));if(b.size<100)break;last=b.last().id;}}
      if(!entrants.length){await ch.send({embeds:[E.warn("🎉 Giveaway Ended").setDescription(`**${ga.prize}** — No valid entries.`)]});}
      else{const w=entrants[Math.floor(Math.random()*entrants.length)];await ch.send({content:`🎉 <@${w}>`,embeds:[E.success("🎉 Giveaway Winner!").setDescription(`<@${w}> won **${ga.prize}**!\nContact us to claim.`).addFields({name:"Entries",value:`${entrants.length}`}).setTimestamp()],allowedMentions:{users:[w]}});}
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SLASH COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleSlashCommand(interaction) {
  const { commandName } = interaction;
  const guild  = interaction.guild;
  const member = interaction.member;
  const user   = interaction.user;

  // Blacklist check
  if (data.blacklist.includes(user.id) && commandName !== "blacklist") {
    return reply(interaction, { embeds:[E.error("🚫 You are blacklisted.")] }, true);
  }

  // Cooldown check
  if (CD_CONFIG[commandName]) {
    const w = checkCD(commandName, user.id);
    if (w > 0) return reply(interaction, { embeds:[E.warn("⏰ Cooldown").setDescription(`Try again in **${w}s**.`)] }, true);
    useCD(commandName, user.id);
  }

  switch (commandName) {
    // ── GENERAL ──────────────────────────────────────────────────────────
    case "help": {
      const emb = new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`🧸 ${BOT_NAME} — Commands`)
        .setDescription(`**Version:** v${BOT_VERSION} | **AI:** ${GROQ_API_KEY?"✅ Enabled":"❌ Disabled"}\n\nAll commands are slash (/) commands!`)
        .addFields(
          {name:"🤖 AI",          value:"`/ai` `/ai-reset` `/imagine`",               inline:true},
          {name:"🎵 Music",       value:"`/play` `/skip` `/stop` `/queue` `/volume`",  inline:true},
          {name:"💼 Commissions", value:"`/services` `/prices` `/orderinfo` `/ticket`",inline:true},
          {name:"⭐ Reviews",     value:"`/review` `/vouch`",                          inline:true},
          {name:"📊 Leveling",    value:"`/level` `/rank` `/leaderboard` `/balance`",  inline:true},
          {name:"💰 Economy",     value:"`/dowork` `/daily` `/shop` `/buy`",           inline:true},
          {name:"🎉 Fun",         value:"`/8ball` `/rate` `/coinflip` `/trivia`",      inline:true},
          {name:"ℹ️ Info",        value:"`/userinfo` `/serverinfo` `/stats`",          inline:true},
          {name:"🔨 Moderation",  value:"`/ban` `/kick` `/mute` `/warn` `/purge`",     inline:true},
          {name:"⚙️ Admin",       value:"`/announce` `/addorder` `/ticketpanel`",      inline:true},
          {name:"🎫 Open a Ticket",value:"Use the **ticket panel** to get support!",  inline:false},
        )
        .setFooter({text:`${BOT_NAME} v${BOT_VERSION} • Made with 💗 by ${BOT_OWNER}`}).setTimestamp();
      return reply(interaction, { embeds:[emb] });
    }

    case "info": {
      const up=process.uptime(),h=Math.floor(up/3600),m=Math.floor((up%3600)/60),s=Math.floor(up%60);
      return reply(interaction, { embeds:[E.brand(`🧸 ${BOT_NAME} v${BOT_VERSION}`)
        .addFields(
          {name:"🤖 Tag",       value:client.user?.tag||"—",                           inline:true},
          {name:"📦 Version",   value:`v${BOT_VERSION}`,                               inline:true},
          {name:"👑 Owner",     value:BOT_NAME,                                        inline:true},
          {name:"🌐 Servers",   value:`${client.guilds.cache.size}`,                   inline:true},
          {name:"⏱️ Uptime",   value:`${h}h ${m}m ${s}s`,                            inline:true},
          {name:"📋 Orders",    value:`${data.orders.length}`,                         inline:true},
          {name:"🤖 AI",        value:GROQ_API_KEY?"✅ Groq Enabled":"❌ Disabled",     inline:true},
          {name:"🖼️ Img Engine",value:STABILITY_API_KEY?"Stability AI":OPENAI_API_KEY?"DALL-E 3":"Pollinations",inline:true},
          {name:"🎵 Music",     value:lofiCurrentTrack?`▶️ ${lofiCurrentTrack.title}`:"Starting…",inline:true},
        ).setTimestamp()] });
    }

    case "ping": {
      const sent = await interaction.reply({ embeds:[E.info("🏓 Pinging…")], fetchReply:true });
      const latency = sent.createdTimestamp - interaction.createdTimestamp;
      return interaction.editReply({ embeds:[E.success("🏓 Pong!")
        .addFields(
          {name:"⏱️ Round-trip",value:`${latency}ms`,inline:true},
          {name:"💓 Gateway",   value:`${Math.round(client.ws.ping)}ms`,inline:true},
        )] });
    }

    case "status": {
      await interaction.deferReply();
      return reply(interaction, { embeds:[E.success("🟢 All Systems Operational")
        .addFields(
          {name:"🤖 Bot",      value:"🟢 Online",                                        inline:true},
          {name:"📡 Gateway",  value:`${Math.round(client.ws.ping)}ms`,                  inline:true},
          {name:"📋 Orders",   value:`🟢 ${data.orders.filter(o=>o.status!=="completed").length} active`,inline:true},
          {name:"📊 Leveling", value:`🟢 ${Object.keys(data.leveling).length} users`,    inline:true},
          {name:"🤖 AI",       value:GROQ_API_KEY?"🟢 Groq Ready":"🔴 No key",           inline:true},
          {name:"🎵 Lofi VC",  value:lofiCurrentTrack?`🟢 ${lofiCurrentTrack.title}`:"🟡 Starting",inline:true},
        ).setTimestamp()] });
    }

    case "rules":
      return reply(interaction, { embeds:[E.brand("📜 Server Rules").setDescription(SERVER_RULES.join("\n\n"))] });

    case "uptime": {
      const up = process.uptime();
      return reply(interaction, { embeds:[E.brand("⏱️ Uptime").setDescription(`Online for **${fmtDuration(Math.floor(up*1000))}**`)] });
    }

    // ── AI ────────────────────────────────────────────────────────────────
    case "ai": {
      if (!GROQ_API_KEY) return reply(interaction, { embeds:[E.error("AI Disabled").setDescription("No GROQ_API_KEY configured.")] }, true);
      const prompt = interaction.options.getString("message");
      await interaction.deferReply();
      const uid = user.id;
      if (!userChatHistory.has(uid)) userChatHistory.set(uid, []);
      const hist = userChatHistory.get(uid);
      hist.push({ role:"user", content:prompt });
      while (hist.length > 30) hist.shift();
      const { text, model } = await callGroq(hist, AI_CHAT_SYSTEM, { maxTokens:1500, temperature:0.75 });
      if (!text) return reply(interaction, { content:"❌ AI is busy, try again." });
      hist.push({ role:"assistant", content:text });
      const footer = aiFooter(model, user.username);
      const full = text + footer;
      if (full.length <= 2000) return reply(interaction, { content:full, allowedMentions:{users:[]} });
      await reply(interaction, { content:text.slice(0,1900), allowedMentions:{users:[]} });
      for (let i=1900; i<text.length; i+=1900)
        await interaction.followUp({ content:text.slice(i,i+1900), allowedMentions:{users:[]} }).catch(()=>{});
      break;
    }

    case "ai-reset":
      userChatHistory.delete(user.id);
      return reply(interaction, { embeds:[E.success("✅ AI Memory Cleared")] }, true);

    case "aioff":
    case "aion": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageMessages))
        return reply(interaction, { embeds:[E.error("Staff only.")] }, true);
      if (!interaction.channel.name?.startsWith("ticket-"))
        return reply(interaction, { embeds:[E.warn("Only works in ticket channels.")] }, true);
      if (commandName === "aioff") ticketAIOff.add(interaction.channel.id);
      else ticketAIOff.delete(interaction.channel.id);
      return reply(interaction, { content:`${commandName==="aioff"?"🔇 AI Off":"🔊 AI On"} for this ticket.` });
    }

    case "imagine": {
      const w = checkCD("imagine", user.id);
      if (w > 0) return reply(interaction, { embeds:[E.warn("⏰ Cooldown").setDescription(`Try again in **${w}s**.`)] }, true);
      useCD("imagine", user.id);
      const prompt = interaction.options.getString("prompt");
      const style  = interaction.options.getString("style") || null;
      await interaction.deferReply();
      try {
        const enhanced = await enhanceImagePrompt(`${prompt}${style?`, ${IMG_STYLES[style]}`:""}`);
        const { buffer, ext, source } = await generateImage(enhanced, style);
        const attachment = new AttachmentBuilder(buffer, { name:`snuggles-ai-${Date.now()}.${ext}` });
        data.stats.imagesGenerated=(data.stats.imagesGenerated||0)+1; saveData();
        return reply(interaction, { embeds:[new EmbedBuilder().setColor(IMG_COLOR).setTitle("🎨 Image Generated!")
          .setDescription(`**Prompt:** ${prompt}${style?`\n**Style:** \`${style}\``:""}\n*Enhanced with AI*`)
          .setImage(`attachment://snuggles-ai-${Date.now()}.${ext}`)
          .addFields({name:"🔧 Engine",value:source,inline:true},{name:"📐 Resolution",value:"1024×1024",inline:true})
          .setFooter({text:`Snuggles AI • Image Gen • ${user.username}`}).setTimestamp()], files:[attachment] });
      } catch (err) {
        return reply(interaction, { embeds:[E.error("Generation Failed").setDescription(err.message)] });
      }
    }

    // ── MUSIC ─────────────────────────────────────────────────────────────
    case "play": {
      let voiceModule;
      try { voiceModule = require("@discordjs/voice"); } catch {
        return reply(interaction, { embeds:[E.error("Music Unavailable").setDescription("Run:\n```\nnpm install @discordjs/voice play-dl\n```")] }, true);
      }
      try { require("play-dl"); } catch {
        return reply(interaction, { embeds:[E.error("play-dl Missing").setDescription("Run:\n```\nnpm install play-dl\n```")] }, true);
      }
      if (!member?.voice?.channelId)
        return reply(interaction, { embeds:[E.error("❌ Join a voice channel first!")] }, true);

      const query = interaction.options.getString("query");
      await interaction.deferReply();

      const tracks = await resolveQuery(query);
      if (!tracks?.length) return reply(interaction, { embeds:[E.error("No results found.")] });

      const m = getGuildMusic(guild.id);
      m.textChannel = interaction.channel;
      m.queue.push(...tracks);

      if (!m.connection) {
        const { joinVoiceChannel, createAudioPlayer, AudioPlayerStatus } = voiceModule;
        const vc = member.voice.channel;
        const conn = joinVoiceChannel({ channelId:vc.id, guildId:guild.id, adapterCreator:guild.voiceAdapterCreator, selfDeaf:true });
        m.connection = conn;
        const player = createAudioPlayer();
        m.player = player;
        conn.subscribe(player);
        player.on(AudioPlayerStatus.Idle, () => playNextTrack(guild.id));
        player.on("error", err => { console.error("[Music]", err.message); playNextTrack(guild.id); });
        await playNextTrack(guild.id);
      }

      return reply(interaction, { embeds:[E.music("🎵 Added to Queue")
        .setDescription(tracks.slice(0,5).map(t=>`• ${t.title}`).join("\n")+(tracks.length>5?`\n+${tracks.length-5} more`:""))
        .addFields({name:"Source",value:tracks[0].source||"—",inline:true},{name:"Queue",value:`${m.queue.length} track(s)`,inline:true})
        .setTimestamp()] });
    }

    case "skip": {
      const m = getGuildMusic(guild?.id);
      if (!m?.player || !m.current) return reply(interaction, { embeds:[E.warn("Nothing playing.")] }, true);
      m.player.stop();
      return reply(interaction, { embeds:[E.success("⏭️ Skipped!")] });
    }

    case "stop": {
      const m = getGuildMusic(guild?.id);
      if (m) {
        m.queue = []; m.current = null; m.loop = false;
        m.player?.stop(); m.connection?.destroy(); m.connection = null; m.player = null;
        guildMusic.delete(guild.id);
      }
      return reply(interaction, { embeds:[E.success("⏹️ Stopped.")] });
    }

    case "queue": {
      const m = getGuildMusic(guild?.id);
      const emb = E.music("🎵 Music Queue");
      if (m?.current) emb.addFields({ name:"🎧 Now Playing", value:m.current.title });
      emb.setDescription(m?.queue?.length ? m.queue.slice(0,10).map((t,i)=>`**${i+1}.** ${t.title}`).join("\n") : "Queue is empty.");
      if (m?.queue?.length > 10) emb.setFooter({ text:`+${m.queue.length-10} more tracks` });
      return reply(interaction, { embeds:[emb] });
    }

    case "nowplaying": {
      const m = getGuildMusic(guild?.id);
      if (!m?.current) return reply(interaction, { embeds:[E.warn("Nothing playing.")] }, true);
      return reply(interaction, { embeds:[E.music("🎵 Now Playing").setDescription(`**${m.current.title}**`).addFields({name:"Source",value:m.current.source||"—",inline:true})] });
    }

    case "volume": {
      const v = interaction.options.getInteger("level");
      const m = getGuildMusic(guild?.id);
      if (m) {
        m.volume = v / 100;
        try { m.player?.state?.resource?.volume?.setVolume(m.volume); } catch {}
      }
      return reply(interaction, { embeds:[E.success(`🔊 Volume → **${v}%**`)] });
    }

    case "pause": {
      const m = getGuildMusic(guild?.id);
      m?.player?.pause();
      return reply(interaction, { embeds:[E.warn("⏸️ Paused")] });
    }

    case "resume": {
      const m = getGuildMusic(guild?.id);
      m?.player?.unpause();
      return reply(interaction, { embeds:[E.success("▶️ Resumed")] });
    }

    case "loop": {
      const m = getGuildMusic(guild?.id);
      if (m) m.loop = !m.loop;
      return reply(interaction, { embeds:[E.info(`🔁 Loop: **${m?.loop?"On":"Off"}**`)] });
    }

    case "lofi":
      return reply(interaction, { embeds:[E.music("🎵 24/7 Lofi Radio")
        .setDescription(`Chill lofi music plays 24/7 in <#${LOFI_VC_CHANNEL_ID}>!\n\n**Now Playing:** ${lofiCurrentTrack?.title||"Starting…"}\n\nJoin and vibe! 🎧💗`)
        .setTimestamp()] });

    // ── COMMISSIONS ───────────────────────────────────────────────────────
    case "services":
      return reply(interaction, { embeds:[E.brand("🛍️ Services").addFields(SERVICES).setTimestamp()] });

    case "prices":
      return reply(interaction, { embeds:[new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("💳 Payment Methods")
        .addFields(...PAYMENT_INFO.methods,{name:"⚠️ Refund Policy",value:PAYMENT_INFO.note}).setTimestamp()] });

    case "pay":
      return reply(interaction, { embeds:[E.brand("💸 Payment Details")
        .addFields({name:"💵 CashApp",value:"[$siahhispaid](https://cash.app/$siahhispaid)",inline:true},{name:"🅿️ PayPal",value:"[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)",inline:true},{name:"⚠️ Note",value:"**F&F only** — All sales final, no refunds."})
      ] });

    case "orderinfo": {
      const id  = interaction.options.getInteger("id");
      const o   = findOrder(id);
      if (!o) return reply(interaction, { embeds:[E.error("Order not found.")] }, true);
      const si  = getOrderStatus(o.status);
      const emb = new EmbedBuilder().setColor(si.color).setTitle(`📦 Order #${o.id}`)
        .addFields({name:"📊 Status",value:si.label,inline:true},{name:"👤 Customer",value:`<@${o.userId}>`,inline:true},{name:"📝 Details",value:o.details},{name:"📅 Created",value:`<t:${Math.floor(new Date(o.createdAt).getTime()/1000)}:f>`,inline:true},{name:"🔄 Updated",value:`<t:${Math.floor(new Date(o.updatedAt).getTime()/1000)}:R>`,inline:true});
      if (o.note) emb.addFields({ name:"📋 Note", value:o.note });
      return reply(interaction, { embeds:[emb.setTimestamp()] });
    }

    case "discount": {
      if (!hasOrdered(user.id))
        return reply(interaction, { embeds:[E.info("🎟️ Loyalty Discount").setDescription("No orders yet! After your first order, you'll get **5% off** future commissions. 💗")] });
      return reply(interaction, { embeds:[E.success("🎟️ Loyalty Discount!").setDescription("You qualify for **5% off** your next commission!\n\nOpen a ticket and mention the discount 💗").addFields({name:"Your Orders",value:`${data.orders.filter(o=>o.userId===user.id).length} total`}).setTimestamp()] });
    }

    case "ticket":
      return reply(interaction, { embeds:[E.brand("🎫 Open a Ticket").setDescription("Use the **ticket panel** in the designated channel!\n\n📦 **Order** — Commission a script\n🤝 **Partnership** — Partner with us\n❓ **Inquiry** — Questions & support")] });

    // ── PORTFOLIO ─────────────────────────────────────────────────────────
    case "work": {
      if (!data.portfolio.length) return reply(interaction, { embeds:[E.brand("🎨 Portfolio").setDescription("No work added yet.")] });
      const total = data.portfolio.length;
      let page = interaction.options.getInteger("page") || 1;
      if (page > total) page = total;
      const work = [...data.portfolio].reverse()[page-1];
      const isVid = /\.(mov|mp4|webm)(?:\?|$)/i.test(work.url||"");
      const emb = E.brand(`🎨 ${work.title||`Entry #${work.id}`}`).setURL(work.url).addFields({name:"🆔 ID",value:`#${work.id}`,inline:true},{name:"Type",value:isVid?"🎥 Video":"🖼️ Image",inline:true}).setFooter({text:`Page ${page}/${total}`});
      if (!isVid) emb.setImage(work.url);
      return reply(interaction, { embeds:[emb] });
    }

    // ── SCRIPTING ─────────────────────────────────────────────────────────
    case "script": {
      const t = interaction.options.getString("type");
      const ex = SCRIPT_EXAMPLES[t];
      if (!ex) return reply(interaction, { embeds:[E.error("Unknown script type.")] }, true);
      return reply(interaction, { embeds:[E.brand(`📜 ${ex.title}`).setDescription("```lua\n"+ex.code+"\n```")] });
    }

    case "snippet": {
      const s = SNIPPETS[Math.floor(Math.random()*SNIPPETS.length)];
      return reply(interaction, { embeds:[E.brand(`💡 ${s.title}`).setDescription("```lua\n"+s.code+"\n```")] });
    }

    case "docs":
      return reply(interaction, { embeds:[E.brand("📚 Resources").addFields(DOCS.map(d=>({name:d.name,value:d.value})))] });

    case "debug":
      return reply(interaction, { embeds:[E.warn("🐛 Debug Template").setDescription("```\nGoal:\n<what you're trying to do>\n\nIssue:\n<what's happening>\n\nError:\n<paste from Output>\n\nCode:\n<broken section>\n\nAttempted:\n<what you've tried>\n```")] });

    case "tip":
      return reply(interaction, { embeds:[E.brand("💡 Scripting Tip").setDescription(TIPS[Math.floor(Math.random()*TIPS.length)])] });

    // ── LEVELING / ECONOMY ────────────────────────────────────────────────
    case "level": {
      const target = interaction.options.getUser("user") || user;
      const lv = getLv(target.id), needed = xpForLevel(lv.level);
      const prog = Math.min(20, Math.floor((lv.xp/needed)*20));
      return reply(interaction, { embeds:[E.xp(`📊 Level — ${target.username}`).setThumbnail(target.displayAvatarURL())
        .addFields({name:"🏆 Level",value:`${lv.level}`,inline:true},{name:"✨ XP",value:`${lv.xp}/${needed}`,inline:true},{name:"💬 Messages",value:`${lv.totalMessages||0}`,inline:true},{name:"📈 Progress",value:`\`${"█".repeat(prog)}${"░".repeat(20-prog)}\` ${Math.floor((lv.xp/needed)*100)}%`}).setTimestamp()] });
    }

    case "rank": {
      const target = interaction.options.getUser("user") || user;
      const lv = getLv(target.id), eco = getEco(target.id), needed = xpForLevel(lv.level);
      const sorted = Object.entries(data.leveling).sort((a,b)=>b[1].level!==a[1].level?b[1].level-a[1].level:b[1].xp-a[1].xp);
      const rank = sorted.findIndex(([id])=>id===target.id)+1;
      return reply(interaction, { embeds:[E.xp(`🏅 Rank — ${target.username}`).setThumbnail(target.displayAvatarURL())
        .addFields({name:"🌍 Rank",value:rank>0?`#${rank}`:"Unranked",inline:true},{name:"🏆 Level",value:`${lv.level}`,inline:true},{name:"✨ XP",value:`${lv.xp}/${needed}`,inline:true},{name:"💰 Coins",value:`${eco.coins||0}`,inline:true},{name:"💬 Messages",value:`${lv.totalMessages||0}`,inline:true},{name:"⚠️ Warns",value:`${(data.warns[target.id]||[]).length}`,inline:true}).setTimestamp()] });
    }

    case "leaderboard": {
      await interaction.deferReply();
      const top = Object.entries(data.leveling).map(([id,d])=>({id,level:d.level||1,xp:d.xp||0})).sort((a,b)=>b.level!==a.level?b.level-a.level:b.xp-a.xp).slice(0,10);
      if (!top.length) return reply(interaction, { embeds:[E.brand("📊 Leaderboard").setDescription("No data yet!")] });
      const medals = ["🥇","🥈","🥉"];
      const lines = await Promise.all(top.map(async(e,i)=>{let tag=`<@${e.id}>`;try{const u=await client.users.fetch(e.id);tag=u.username;}catch{}return `${medals[i]||`**${i+1}.**`} ${tag} — Lv **${e.level}** (${e.xp} XP)`;}));
      return reply(interaction, { embeds:[E.gold("🏆 Leaderboard").setDescription(lines.join("\n")).setTimestamp()] });
    }

    case "balance": {
      const target = interaction.options.getUser("user") || user;
      const eco = getEco(target.id);
      return reply(interaction, { embeds:[E.gold(`💰 Balance — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields({name:"💰 Coins",value:`${eco.coins||0} 🪙`,inline:true},{name:"🎒 Items",value:`${(eco.inventory||[]).length}`,inline:true}).setTimestamp()] });
    }

    case "dowork": {
      const eco = getEco(user.id);
      const job = WORK_RESPONSES[Math.floor(Math.random()*WORK_RESPONSES.length)];
      const earned = Math.floor(Math.random()*(job.coins[1]-job.coins[0]))+job.coins[0];
      eco.coins = (eco.coins||0)+earned; saveData();
      return reply(interaction, { embeds:[E.success("💼 Work Complete!").setDescription(`> ${job.text}\n\n**+${earned} 🪙**!`).addFields({name:"💰 Balance",value:`${eco.coins} 🪙`}).setTimestamp()] });
    }

    case "daily": {
      const uid = user.id, last = data.dailyClaims[uid]||0, elapsed = Date.now()-last;
      if (elapsed < 86_400_000) {
        const r = 86_400_000-elapsed;
        return reply(interaction, { embeds:[E.warn("⏰ Already Claimed").setDescription(`Come back in **${Math.floor(r/3_600_000)}h ${Math.floor((r%3_600_000)/60_000)}m**.`)] }, true);
      }
      data.dailyClaims[uid] = Date.now();
      const reward = DAILY_REWARDS[Math.floor(Math.random()*DAILY_REWARDS.length)];
      getEco(uid).coins = (getEco(uid).coins||0)+reward.coins; saveData();
      return reply(interaction, { embeds:[E.success("🎁 Daily Reward!").setDescription(`${reward.text}\n\n**+${reward.coins} 🪙**`).setTimestamp()] });
    }

    case "shop":
      return reply(interaction, { embeds:[E.gold("🛒 Coin Shop").setDescription(`Use \`/buy <id>\` to purchase.`).addFields(SHOP_ITEMS.map(i=>({name:`${i.name} — ${i.price} 🪙`,value:`${i.desc}\n\`ID: ${i.id}\``}))).setTimestamp()] });

    case "buy": {
      const id = interaction.options.getString("item").toLowerCase();
      const item = SHOP_ITEMS.find(i=>i.id===id);
      if (!item) return reply(interaction, { embeds:[E.error("Item not found.")] }, true);
      const eco = getEco(user.id);
      if ((eco.coins||0) < item.price) return reply(interaction, { embeds:[E.error("Not Enough Coins").setDescription(`Need **${item.price} 🪙**, have **${eco.coins||0} 🪙**.`)] }, true);
      if ((eco.inventory||[]).includes(id)) return reply(interaction, { embeds:[E.warn("Already owned.")] }, true);
      eco.coins -= item.price; if(!eco.inventory) eco.inventory=[]; eco.inventory.push(id); saveData();
      return reply(interaction, { embeds:[E.success("✅ Purchased!").addFields({name:"Item",value:item.name},{name:"Redeem",value:item.desc}).setTimestamp()] });
    }

    // ── REVIEWS ───────────────────────────────────────────────────────────
    case "review": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      const cfg = getReviewCfg(guild.id);
      if (!cfg.enabled) return reply(interaction, { embeds:[E.warn("Reviews Disabled.")] }, true);
      const rating  = interaction.options.getInteger("rating");
      const type    = interaction.options.getString("type");
      const txt     = interaction.options.getString("message");
      if (txt.length < cfg.minLength) return reply(interaction, { embeds:[E.error(`Review must be at least ${cfg.minLength} chars.`)] }, true);
      if (cfg.blockedWords?.some(w=>txt.toLowerCase().includes(w))) return reply(interaction, { embeds:[E.error("Review contains a blocked word.")] }, true);
      const ck = `review_guild:${user.id}:${guild.id}`, last = _cds.get(ck)||0;
      if (Date.now()-last < cfg.cooldownMs && last!==0) return reply(interaction, { embeds:[E.warn("⏰ Review Cooldown").setDescription(`Wait **${fmtDuration(cfg.cooldownMs-(Date.now()-last))}**`)] }, true);
      _cds.set(ck, Date.now());
      const rev = {id:data.nextReviewId++,userId:user.id,username:user.tag,commissionType:type,rating,message:txt,at:new Date().toISOString()};
      data.reviews.push(rev); data.stats.reviewsSubmitted=(data.stats.reviewsSubmitted||0)+1; saveData();
      const stars = "⭐".repeat(rating)+"☆".repeat(cfg.maxRating-rating);
      const emb = new EmbedBuilder().setColor(cfg.embedColor||BRAND_COLOR).setTitle("⭐ New Review");
      if (cfg.showAvatar) emb.setThumbnail(user.displayAvatarURL());
      emb.addFields({name:"👤 From",value:user.tag,inline:true},{name:"🛠️ Commission",value:type||"—",inline:true},{name:"📊 Rating",value:`${stars} (${rating}/5)`},{name:"💬 Review",value:txt}).setTimestamp();
      const s = getSettings(guild.id), chId = cfg.channelId||s.reviewsChannelId;
      if (cfg.autoPost && chId) {
        const ch = await guild.channels.fetch(chId).catch(()=>null);
        if (ch?.isTextBased()) await ch.send({content:cfg.pingRole?`<@&${cfg.pingRole}>`:undefined,embeds:[emb],allowedMentions:cfg.pingRole?{roles:[cfg.pingRole]}:{}});
        return reply(interaction, { embeds:[E.success("✅ Review Posted!").setDescription(`Posted in <#${chId}>! 💗`)] });
      }
      return reply(interaction, { embeds:[emb] });
    }

    case "vouch": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      const t   = interaction.options.getString("text");
      const s   = getSettings(guild.id);
      const emb = E.success("✅ Vouch").setDescription(`> ${t}`).setThumbnail(user.displayAvatarURL()).setFooter({text:`by ${user.tag}`}).setTimestamp();
      if (s.reviewsChannelId) {
        const ch = await guild.channels.fetch(s.reviewsChannelId).catch(()=>null);
        if (ch?.isTextBased()) { await ch.send({embeds:[emb]}); return reply(interaction, { embeds:[E.success("✅ Vouch Posted!")] }); }
      }
      return reply(interaction, { embeds:[emb] });
    }

    // ── FUN ───────────────────────────────────────────────────────────────
    case "quote":
      return reply(interaction, { embeds:[E.brand("💭 Quote").setDescription(`*${QUOTES[Math.floor(Math.random()*QUOTES.length)]}*`).setFooter({text:`${BOT_NAME} 🧸`})] });

    case "meme": {
      try {
        const r = await fetch("https://meme-api.com/gimme/wholesomememes");
        const m = await r.json();
        if (m.nsfw || m.spoiler) throw new Error();
        return reply(interaction, { embeds:[E.brand(m.title||"Meme").setURL(m.postLink).setImage(m.url)] });
      } catch { return reply(interaction, { embeds:[E.error("Meme unavailable.")] }); }
    }

    case "8ball": {
      const q = interaction.options.getString("question");
      return reply(interaction, { embeds:[E.brand("🎱 Magic 8-Ball").addFields({name:"❓",value:q.slice(0,1000)},{name:"🎱",value:`**${EIGHT_BALL[Math.floor(Math.random()*EIGHT_BALL.length)]}**`})] });
    }

    case "rate": {
      const t = interaction.options.getString("thing");
      const s = Math.floor(Math.random()*11), e = s>=8?"🔥":s>=5?"😊":s>=3?"😐":"💀";
      return reply(interaction, { embeds:[E.brand("📊 Rating").setDescription(`${e} **${t}** — **${s}/10**\n\`${"█".repeat(s)}${"░".repeat(10-s)}\``)] });
    }

    case "coinflip": {
      const r = Math.random() < .5 ? "Heads" : "Tails";
      return reply(interaction, { embeds:[E.brand("🪙 Coin Flip").setDescription(`**${r}!** ${r==="Heads"?"👑":"🌊"}`)] });
    }

    case "roll": {
      const max = interaction.options.getInteger("max") || 6;
      return reply(interaction, { embeds:[E.brand("🎲 Roll").setDescription(`You rolled **${Math.floor(Math.random()*max)+1}** (1–${max})`)] });
    }

    case "rps": {
      const pick = interaction.options.getString("choice");
      const choices = ["rock","paper","scissors"], emoji = {rock:"🪨",paper:"📄",scissors:"✂️"};
      const bot = choices[Math.floor(Math.random()*3)];
      const outcome = pick===bot?"🤝 Tie!":((pick==="rock"&&bot==="scissors")||(pick==="paper"&&bot==="rock")||(pick==="scissors"&&bot==="paper"))?"🎉 You win!":"🤖 I win!";
      return reply(interaction, { embeds:[E.brand("🎮 Rock Paper Scissors").addFields({name:"You",value:`${emoji[pick]} ${pick}`,inline:true},{name:"Me",value:`${emoji[bot]} ${bot}`,inline:true},{name:"Result",value:outcome})] });
    }

    case "trivia": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      if (data.triviaActive[interaction.channel.id]) return reply(interaction, { embeds:[E.warn("Trivia already active!")] }, true);
      const q = TRIVIA_QUESTIONS[Math.floor(Math.random()*TRIVIA_QUESTIONS.length)];
      const coins = 50+Math.floor(Math.random()*50);
      data.triviaActive[interaction.channel.id] = {q:q.q, answers:q.a, coins}; saveData();
      await reply(interaction, { embeds:[E.info("🧠 Trivia!").setDescription(`**${q.q}**\n\n*Hint: ${q.hint}*`).addFields({name:"💰 Reward",value:`${coins} 🪙`}).setFooter({text:"60 second timeout"})] });
      setTimeout(async()=>{
        if(data.triviaActive[interaction.channel.id]){
          delete data.triviaActive[interaction.channel.id]; saveData();
          await interaction.channel.send({embeds:[E.warn("⏰ Trivia Expired").setDescription(`Answer: **${q.a[0]}**`)]}).catch(()=>{});
        }
      }, 60_000);
      break;
    }

    case "remindme": {
      const timeStr = interaction.options.getString("time");
      const text    = interaction.options.getString("message");
      const ms = parseDuration(timeStr);
      if (!ms || ms > 7*TIME.d) return reply(interaction, { embeds:[E.error("Invalid duration (max 7d).")] }, true);
      await reply(interaction, { embeds:[E.success("⏰ Reminder Set!").setDescription(`Pinging you in **${fmtDuration(ms)}**\n> ${text}`)] });
      setTimeout(async()=>{
        await interaction.channel.send({content:`<@${user.id}>`,embeds:[E.brand("⏰ Reminder!").setDescription(`> ${text}`).setTimestamp()]}).catch(()=>{});
      }, ms);
      break;
    }

    case "color": {
      const hex = interaction.options.getString("hex").replace("#","").trim();
      if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return reply(interaction, { embeds:[E.warn("Invalid hex. Example: `FF8FB1`")] }, true);
      const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
      return reply(interaction, { embeds:[new EmbedBuilder().setColor(parseInt(hex,16)).setTitle(`🎨 #${hex.toUpperCase()}`).addFields({name:"HEX",value:`#${hex.toUpperCase()}`,inline:true},{name:"RGB",value:`${r},${g},${b}`,inline:true},{name:"INT",value:`${parseInt(hex,16)}`,inline:true}).setImage(`https://singlecolorimage.com/get/${hex}/200x80`).setTimestamp()] });
    }

    case "calc": {
      const expr = interaction.options.getString("expression").replace(/[^0-9+\-*/.() %^]/g,"");
      try {
        const result = Function('"use strict";return('+expr+')')();
        if (!isFinite(result)) throw new Error("Not finite");
        return reply(interaction, { embeds:[E.brand("🧮 Calculator").addFields({name:"Input",value:`\`${expr}\``,inline:true},{name:"Result",value:`\`${result}\``,inline:true})] });
      } catch { return reply(interaction, { embeds:[E.error("Invalid expression.")] }, true); }
    }

    // ── INFO ──────────────────────────────────────────────────────────────
    case "userinfo": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      const target = interaction.options.getUser("user") || user;
      let member_target = null;
      try { member_target = await guild.members.fetch(target.id); } catch {}
      const emb = E.brand(`👤 ${target.tag}`).setThumbnail(target.displayAvatarURL({size:256}))
        .addFields({name:"🆔 ID",value:target.id,inline:true},{name:"🤖 Bot",value:target.bot?"Yes":"No",inline:true},{name:"📅 Created",value:`<t:${Math.floor(target.createdTimestamp/1000)}:F>`});
      if (member_target) {
        if (member_target.joinedTimestamp) emb.addFields({name:"📥 Joined",value:`<t:${Math.floor(member_target.joinedTimestamp/1000)}:F>`});
        const roles = member_target.roles.cache.filter(r=>r.id!==guild.id).sort((a,b)=>b.position-a.position).map(r=>`<@&${r.id}>`).slice(0,15);
        if (roles.length) emb.addFields({name:`🎭 Roles (${roles.length})`,value:roles.join(" ")});
        const lv = getLv(target.id), eco = getEco(target.id);
        emb.addFields({name:"🏆 Level",value:`${lv.level}`,inline:true},{name:"💰 Coins",value:`${eco.coins||0}`,inline:true},{name:"⚠️ Warns",value:`${(data.warns[target.id]||[]).length}`,inline:true});
      }
      return reply(interaction, { embeds:[emb.setTimestamp()] });
    }

    case "serverinfo": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      const owner = await guild.fetchOwner().catch(()=>null);
      const ch = guild.channels.cache;
      return reply(interaction, { embeds:[E.brand(`🏠 ${guild.name}`).setThumbnail(guild.iconURL({size:256})||null)
        .addFields({name:"🆔 ID",value:guild.id,inline:true},{name:"👑 Owner",value:owner?.user.tag||"—",inline:true},{name:"📅 Created",value:`<t:${Math.floor(guild.createdTimestamp/1000)}:F>`},{name:"👥 Members",value:`${guild.memberCount}`,inline:true},{name:"🎭 Roles",value:`${guild.roles.cache.size}`,inline:true},{name:"😄 Emojis",value:`${guild.emojis.cache.size}`,inline:true},{name:"💬 Text",value:`${ch.filter(c=>c.type===ChannelType.GuildText).size}`,inline:true},{name:"🔊 Voice",value:`${ch.filter(c=>c.type===ChannelType.GuildVoice).size}`,inline:true})
        .setTimestamp()] });
    }

    case "avatar": {
      const target = interaction.options.getUser("user") || user;
      const url = target.displayAvatarURL({size:1024,extension:"png"});
      return reply(interaction, { embeds:[E.brand(`🖼️ ${target.tag}`).setURL(url).setImage(url)] });
    }

    case "banner": {
      const target = interaction.options.getUser("user") || user;
      const u = await client.users.fetch(target.id, {force:true}).catch(()=>null);
      if (!u?.bannerURL()) return reply(interaction, { embeds:[E.warn("No banner.")] }, true);
      const url = u.bannerURL({size:1024});
      return reply(interaction, { embeds:[E.brand(`🖼️ ${u.username}'s Banner`).setURL(url).setImage(url)] });
    }

    case "servericon": {
      if (!guild?.iconURL()) return reply(interaction, { embeds:[E.error("No icon.")] }, true);
      const url = guild.iconURL({size:1024,extension:"png"});
      return reply(interaction, { embeds:[E.brand(`🖼️ ${guild.name}`).setURL(url).setImage(url)] });
    }

    case "stats": {
      const active = data.orders.filter(o=>o.status!=="completed"&&o.status!=="cancelled").length;
      const done   = data.orders.filter(o=>o.status==="completed").length;
      const avg    = data.reviews.length ? (data.reviews.reduce((s,r)=>s+r.rating,0)/data.reviews.length).toFixed(2) : "—";
      return reply(interaction, { embeds:[E.brand("📈 Stats").addFields({name:"📦 Active Orders",value:`${active}`,inline:true},{name:"✅ Completed",value:`${done}`,inline:true},{name:"🎟️ Tickets",value:`${data.stats.ticketsOpened||0}`,inline:true},{name:"⭐ Reviews",value:`${data.reviews.length} (avg ${avg}⭐)`,inline:true},{name:"🖼️ AI Images",value:`${data.stats.imagesGenerated||0}`,inline:true},{name:"📊 Level Users",value:`${Object.keys(data.leveling).length}`,inline:true}).setTimestamp()] });
    }

    case "invites": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      const target = interaction.options.getUser("user") || user;
      const inv = (data.invites[guild.id]||{})[target.id]||{invited:0,left:0};
      return reply(interaction, { embeds:[E.info(`📨 Invites — ${target.username}`).addFields({name:"📬 Invited",value:`${inv.invited}`,inline:true},{name:"🚪 Left",value:`${inv.left}`,inline:true},{name:"✅ Net",value:`${inv.invited-inv.left}`,inline:true}).setTimestamp()] });
    }

    case "inviteleaderboard": {
      if (!guild) return reply(interaction, { embeds:[E.error("Server only.")] }, true);
      const inv = data.invites[guild.id]||{};
      const entries = Object.entries(inv).map(([id,d])=>({id,net:d.invited-d.left})).sort((a,b)=>b.net-a.net).slice(0,10);
      return reply(interaction, { embeds:[E.gold("📨 Invite Leaderboard").setDescription(entries.length ? entries.map((e,i)=>`**${i+1}.** <@${e.id}> — **${e.net}** net`).join("\n") : "No data.").setTimestamp()] });
    }

    // ── MODERATION ────────────────────────────────────────────────────────
    case "ban": {
      if (!hasPerm(member, PermissionFlagsBits.BanMembers)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason";
      try { await guild.bans.create(target.id, {reason:`By ${user.tag}: ${reason}`}); }
      catch { return reply(interaction, { embeds:[E.error("Ban failed.")] }, true); }
      const emb = E.error("🔨 Banned").addFields({name:"User",value:`<@${target.id}>`,inline:true},{name:"Reason",value:reason},{name:"By",value:user.tag}).setTimestamp();
      await reply(interaction, { embeds:[emb] }); await logMod(guild, emb);
      break;
    }

    case "kick": {
      if (!hasPerm(member, PermissionFlagsBits.KickMembers)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "No reason";
      const m2 = await guild.members.fetch(target.id).catch(()=>null);
      if (!m2?.kickable) return reply(interaction, { embeds:[E.error("Can't kick this user.")] }, true);
      await m2.kick(reason);
      const emb = E.warn("👢 Kicked").addFields({name:"User",value:`<@${target.id}>`,inline:true},{name:"Reason",value:reason},{name:"By",value:user.tag}).setTimestamp();
      await reply(interaction, { embeds:[emb] }); await logMod(guild, emb);
      break;
    }

    case "mute": {
      if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const target = interaction.options.getUser("user");
      const dur    = interaction.options.getString("duration");
      const reason = interaction.options.getString("reason") || "No reason";
      const ms = parseDuration(dur);
      if (!ms || ms > 28*TIME.d) return reply(interaction, { embeds:[E.error("Invalid duration (max 28d).")] }, true);
      const m2 = await guild.members.fetch(target.id).catch(()=>null);
      if (!m2?.moderatable) return reply(interaction, { embeds:[E.error("Can't mute.")] }, true);
      await m2.timeout(ms, reason);
      const emb = E.warn("🔇 Muted").addFields({name:"User",value:`<@${target.id}>`,inline:true},{name:"Duration",value:fmtDuration(ms),inline:true},{name:"Reason",value:reason},{name:"By",value:user.tag}).setTimestamp();
      await reply(interaction, { embeds:[emb] }); await logMod(guild, emb);
      break;
    }

    case "warn": {
      if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      const w = {id:data.nextWarnId++,reason,modId:user.id,at:new Date().toISOString()};
      if (!data.warns[target.id]) data.warns[target.id]=[];
      data.warns[target.id].push(w); saveData();
      const emb = E.warn("⚠️ Warned").addFields({name:"User",value:`<@${target.id}>`,inline:true},{name:"Warn #",value:`${w.id}`,inline:true},{name:"Total",value:`${data.warns[target.id].length}`,inline:true},{name:"Reason",value:reason},{name:"By",value:user.tag}).setTimestamp();
      await reply(interaction, { embeds:[emb] }); await logMod(guild, emb);
      try { const u2 = await client.users.fetch(target.id); await u2.send({embeds:[E.warn(`⚠️ Warned in ${guild.name}`).addFields({name:"Reason",value:reason}).setTimestamp()]}); } catch {}
      break;
    }

    case "warns": {
      if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const target = interaction.options.getUser("user");
      const list = data.warns[target.id]||[];
      const emb = new EmbedBuilder().setTitle(`⚠️ Warnings (${list.length})`).setColor(list.length?WARN_COLOR:SUCCESS_COLOR).setDescription(`<@${target.id}>`);
      if (!list.length) emb.addFields({name:"✅ Clean",value:"No warnings."});
      else list.slice(-10).forEach(w=>emb.addFields({name:`#${w.id}`,value:`**Reason:** ${w.reason||"—"}`,inline:true}));
      return reply(interaction, { embeds:[emb] });
    }

    case "unwarn": {
      if (!hasPerm(member, PermissionFlagsBits.ModerateMembers)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const id = interaction.options.getInteger("id");
      let found = false;
      for (const [uid,list] of Object.entries(data.warns)) {
        const i = list.findIndex(w=>w.id===id);
        if (i !== -1) { const [rem]=list.splice(i,1); if(!list.length) delete data.warns[uid]; saveData(); await reply(interaction, { embeds:[E.success("✅ Warning Removed").addFields({name:"ID",value:`#${id}`,inline:true},{name:"User",value:`<@${uid}>`,inline:true}).setTimestamp()] }); found=true; break; }
      }
      if (!found) return reply(interaction, { embeds:[E.error("Warning not found.")] }, true);
      break;
    }

    case "purge": {
      if (!hasPerm(member, PermissionFlagsBits.ManageMessages)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const count = interaction.options.getInteger("count");
      await interaction.deferReply({ ephemeral: true });
      try { const d = await interaction.channel.bulkDelete(count, true); return reply(interaction, { content:`✅ Deleted ${d.size} messages.` }); }
      catch { return reply(interaction, { embeds:[E.error("Purge failed — messages may be >14 days old.")] }); }
    }

    case "lock":
      if (!hasPerm(member, PermissionFlagsBits.ManageChannels)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      await interaction.channel.permissionOverwrites.edit(guild.roles.everyone, {SendMessages:false});
      return reply(interaction, { embeds:[E.error("🔒 Channel Locked")] });

    case "unlock":
      if (!hasPerm(member, PermissionFlagsBits.ManageChannels)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      await interaction.channel.permissionOverwrites.edit(guild.roles.everyone, {SendMessages:null});
      return reply(interaction, { embeds:[E.success("🔓 Channel Unlocked")] });

    case "slowmode": {
      if (!hasPerm(member, PermissionFlagsBits.ManageChannels)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const secs = interaction.options.getInteger("seconds");
      await interaction.channel.setRateLimitPerUser(secs);
      return reply(interaction, { embeds:[E.success("🐢 Slowmode Updated").setDescription(secs===0?"Disabled.":`Set to **${secs}s**`)] });
    }

    case "nick": {
      if (!hasPerm(member, PermissionFlagsBits.ManageNicknames)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const target = interaction.options.getUser("user");
      const nick   = interaction.options.getString("name") || null;
      const m2 = await guild.members.fetch(target.id).catch(()=>null);
      if (!m2?.manageable) return reply(interaction, { embeds:[E.error("Can't edit this member.")] }, true);
      await m2.setNickname(nick);
      return reply(interaction, { embeds:[E.success("✅ Nickname updated.").addFields({name:"User",value:`<@${target.id}>`,inline:true},{name:"Nick",value:nick||"(cleared)",inline:true})] });
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────
    case "announce": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageGuild)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const text    = interaction.options.getString("message");
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      await reply(interaction, { content:"✅ Announcement sent!", flags: MessageFlags.Ephemeral });
      await channel.send({content:"@everyone",embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setAuthor({name:`${BOT_NAME} — Announcement`,iconURL:client.user?.displayAvatarURL()}).setDescription(`╔══════════════════════════════════╗\n\u200b\n${text}\n\u200b\n╚══════════════════════════════════╝`).setFooter({text:`Posted by ${user.tag}`,iconURL:user.displayAvatarURL()}).setTimestamp()]});
      break;
    }

    case "say": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageMessages)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const text = interaction.options.getString("message");
      await reply(interaction, { content:"✅", flags: MessageFlags.Ephemeral });
      await interaction.channel.send({ content:text, allowedMentions:{users:[]} });
      break;
    }

    case "embed": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageMessages)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const title = interaction.options.getString("title");
      const body  = interaction.options.getString("body");
      await reply(interaction, { content:"✅", flags: MessageFlags.Ephemeral });
      await interaction.channel.send({ embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setDescription(body).setTimestamp()] });
      break;
    }

    case "poll": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageMessages)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const q    = interaction.options.getString("question");
      const opts = interaction.options.getString("options").split("|").map(s=>s.trim()).filter(Boolean).slice(0,9);
      if (opts.length < 2) return reply(interaction, { embeds:[E.warn("Need at least 2 options separated by |")] }, true);
      const nums = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
      await reply(interaction, { content:"✅ Poll created!", flags: MessageFlags.Ephemeral });
      const sent = await interaction.channel.send({ embeds:[new EmbedBuilder().setColor(INFO_COLOR).setTitle(`📊 ${q}`).setDescription(opts.map((o,i)=>`${nums[i]} ${o}`).join("\n\n")).setFooter({text:"React to vote!"}).setTimestamp()] });
      for (let i=0; i<opts.length; i++) await sent.react(nums[i]).catch(()=>{});
      break;
    }

    case "giveaway": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageGuild)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const dur   = interaction.options.getString("duration");
      const prize = interaction.options.getString("prize");
      const ms = parseDuration(dur);
      if (!ms) return reply(interaction, { embeds:[E.error("Invalid duration.")] }, true);
      const endAt = Date.now()+ms;
      const sent = await interaction.channel.send({ content:"@here", embeds:[new EmbedBuilder().setColor(GOLD_COLOR).setTitle("🎉 GIVEAWAY!").setDescription(`React 🎉 to enter!\n\n**Prize:** ${prize}`).addFields({name:"⏰ Ends",value:`<t:${Math.floor(endAt/1000)}:R>`,inline:true},{name:"🎁 Prize",value:prize,inline:true},{name:"🏠 Host",value:`<@${user.id}>`,inline:true}).setFooter({text:"React 🎉 to enter!"}).setTimestamp()], allowedMentions:{users:[]} });
      await sent.react("🎉").catch(()=>{});
      data.giveaways[sent.id] = {prize,endAt,channelId:interaction.channel.id,guildId:guild.id,hostId:user.id,ended:false}; saveData();
      return reply(interaction, { content:"✅ Giveaway started!", flags: MessageFlags.Ephemeral });
    }

    case "addorder": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const target  = interaction.options.getUser("user");
      const details = interaction.options.getString("details");
      const now = new Date().toISOString();
      const o = {id:data.nextOrderId++,userId:target.id,details,status:"not_started",createdAt:now,updatedAt:now,createdBy:user.id,note:null};
      data.orders.push(o); data.stats.ordersCreated=(data.stats.ordersCreated||0)+1; saveData(); updateOrderBoard().catch(()=>{});
      return reply(interaction, { embeds:[E.success(`✅ Order #${o.id} Created`).addFields({name:"Customer",value:`<@${target.id}>`},{name:"Details",value:details}).setTimestamp()] });
    }

    case "updateorder": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageMessages)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const id     = interaction.options.getInteger("id");
      const status = interaction.options.getString("status");
      const note   = interaction.options.getString("note") || null;
      const o = findOrder(id);
      if (!o) return reply(interaction, { embeds:[E.error("Order not found.")] }, true);
      const old = o.status; o.status = status; o.updatedAt = new Date().toISOString();
      if (note) o.note = note;
      if (status === "completed") data.stats.ordersCompleted=(data.stats.ordersCompleted||0)+1;
      saveData(); updateOrderBoard().catch(()=>{});
      const si = getOrderStatus(status);
      await reply(interaction, { embeds:[new EmbedBuilder().setColor(si.color).setTitle(`✅ Order #${o.id} Updated`).addFields({name:"Old",value:getOrderStatus(old).label,inline:true},{name:"New",value:si.label,inline:true},{name:"Customer",value:`<@${o.userId}>`,inline:true}).setTimestamp()] });
      try { const u2=await client.users.fetch(o.userId); await u2.send({embeds:[new EmbedBuilder().setColor(si.color).setTitle(`📦 Order #${o.id} Updated`).setDescription(`Status → **${si.label}**${note?`\n\n**Note:** ${note}`:""}`).setTimestamp()]}); } catch {}
      break;
    }

    case "complete": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const o = findOrder(interaction.options.getInteger("id"));
      if (!o) return reply(interaction, { embeds:[E.error("Not found.")] }, true);
      if (o.status==="completed") return reply(interaction, { embeds:[E.warn("Already completed.")] }, true);
      o.status="completed"; o.updatedAt=new Date().toISOString(); data.stats.ordersCompleted=(data.stats.ordersCompleted||0)+1; saveData(); updateOrderBoard().catch(()=>{});
      return reply(interaction, { embeds:[E.success(`✅ Order #${o.id} Completed`).addFields({name:"Customer",value:`<@${o.userId}>`}).setTimestamp()] });
    }

    case "blacklist": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const target = interaction.options.getUser("user");
      const i = data.blacklist.indexOf(target.id);
      if (i===-1) data.blacklist.push(target.id); else data.blacklist.splice(i,1);
      saveData();
      return reply(interaction, { embeds:[new EmbedBuilder().setColor(i===-1?ERROR_COLOR:SUCCESS_COLOR).setTitle("🚫 Blacklist").setDescription(`<@${target.id}> ${i===-1?"added to":"removed from"} blacklist.`).setTimestamp()] });
    }

    case "setlog": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const ch = interaction.options.getChannel("channel");
      if (!ch) { delete data.modLogChannels[guild.id]; saveData(); return reply(interaction, { embeds:[E.warn("Mod log disabled.")] }); }
      data.modLogChannels[guild.id] = ch.id; saveData();
      return reply(interaction, { embeds:[E.success("📓 Mod Log Set").setDescription(`Logging to <#${ch.id}>`)] });
    }

    case "setreviews": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const ch = interaction.options.getChannel("channel");
      getSettings(guild.id).reviewsChannelId = ch?.id || null; saveData();
      return reply(interaction, { embeds:[E.success(`✅ Reviews ${ch?`→ <#${ch.id}>`:"cleared."}`)] });
    }

    case "settranscripts": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const ch = interaction.options.getChannel("channel");
      getSettings(guild.id).transcriptsChannelId = ch?.id || null; saveData();
      return reply(interaction, { embeds:[E.success(`✅ Transcripts ${ch?`→ <#${ch.id}>`:"cleared."}`)] });
    }

    case "ticketpanel": {
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageChannels)) return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const s = getSettings(guild.id);
      s.ticketPanelChannelId = interaction.channel.id; saveData();
      const { embed, row } = buildTicketPanel();
      const sent = await interaction.channel.send({ embeds:[embed], components:[row] });
      s.ticketPanelMsgId = sent.id; saveData();
      return reply(interaction, { content:"✅ Ticket panel posted!", flags: MessageFlags.Ephemeral });
    }

    case "close": {
      if (!interaction.channel.name?.startsWith("ticket-"))
        return reply(interaction, { embeds:[E.error("Only works in ticket channels.")] }, true);
      const reason = interaction.options.getString("reason");
      await reply(interaction, { content:"🔒 Closing…", flags: MessageFlags.Ephemeral });
      await closeTicket(interaction.channel, member||user, reason, guild);
      break;
    }

    case "addnote": {
      if (!interaction.channel.name?.startsWith("ticket-"))
        return reply(interaction, { embeds:[E.error("Ticket channels only.")] }, true);
      if (!isAdmin(member) && !hasPerm(member, PermissionFlagsBits.ManageMessages))
        return reply(interaction, { embeds:[E.error("No Permission.")] }, true);
      const text = interaction.options.getString("text");
      await reply(interaction, { content:"✅ Note added!", flags: MessageFlags.Ephemeral });
      await interaction.channel.send({ embeds:[new EmbedBuilder().setColor(NOTE_COLOR).setTitle("📝 Staff Note").setDescription(text).setFooter({text:`by ${user.tag}`}).setTimestamp()] });
      break;
    }

    case "givecoins": {
      if (!isAdmin(member)) return reply(interaction, { embeds:[E.error("Admin only.")] }, true);
      const target = interaction.options.getUser("user");
      const amt    = interaction.options.getInteger("amount");
      const eco    = getEco(target.id); eco.coins=(eco.coins||0)+amt; saveData();
      return reply(interaction, { embeds:[E.success("💰 Coins Given").addFields({name:"User",value:`<@${target.id}>`,inline:true},{name:"Amount",value:`${amt} 🪙`,inline:true},{name:"Balance",value:`${eco.coins} 🪙`,inline:true}).setTimestamp()] });
    }

    default:
      return reply(interaction, { content:`❓ Unknown command: \`${commandName}\``, flags: MessageFlags.Ephemeral });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  INTERACTION CREATE (buttons, modals, slash)
// ═══════════════════════════════════════════════════════════════════════════

client.on("interactionCreate", async interaction => {
  try {
    // Blacklist (allow blacklist command itself)
    if (data.blacklist.includes(interaction.user.id) && interaction.commandName !== "blacklist") {
      if (interaction.isRepliable()) await interaction.reply({ content:"🚫 Blacklisted.", flags:MessageFlags.Ephemeral }).catch(()=>{});
      return;
    }

    // ── Slash commands ──
    if (interaction.isChatInputCommand()) {
      return await handleSlashCommand(interaction);
    }

    // ── Buttons ──
    if (interaction.isButton()) {
      if (["ticket_order","ticket_partner","ticket_inquiry"].includes(interaction.customId)) {
        const typeMap = {ticket_order:"order",ticket_partner:"partnership",ticket_inquiry:"inquiry"};
        const type = typeMap[interaction.customId];
        let modal;
        if (type==="order") {
          modal = new ModalBuilder().setCustomId("modal_order").setTitle("📦 Commission Order");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("username").setLabel("Your Roblox Username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("service").setLabel("Service Needed").setPlaceholder("UI, datastore, admin system...").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("description").setLabel("Detailed Description").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("budget").setLabel("Budget").setPlaceholder("e.g. $25 USD, 5000 Robux").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setPlaceholder("PayPal F&F, CashApp, Robux, Gift Card").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
          );
        } else if (type==="partnership") {
          modal = new ModalBuilder().setCustomId("modal_partner").setTitle("🤝 Partnership Request");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("serverName").setLabel("Server Name").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("invite").setLabel("Server Invite Link").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("memberCount").setLabel("Member Count").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("focus").setLabel("Server Focus").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("offering").setLabel("What can you offer us?").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)),
          );
        } else {
          modal = new ModalBuilder().setCustomId("modal_inquiry").setTitle("❓ General Inquiry");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Your Name / Username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("topic").setLabel("Topic / Question").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("details").setLabel("Details").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("urgency").setLabel("Urgency").setPlaceholder("Not urgent / Few days / ASAP").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false)),
          );
        }
        await interaction.showModal(modal); return;
      }

      if (interaction.customId === "ticket_close_btn") {
        const modal = new ModalBuilder().setCustomId("modal_close").setTitle("🔒 Close Ticket");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Reason for closing").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)));
        await interaction.showModal(modal); return;
      }
    }

    // ── Modals ──
    if (interaction.isModalSubmit()) {
      if (["modal_order","modal_partner","modal_inquiry"].includes(interaction.customId)) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const typeMap = {modal_order:"order",modal_partner:"partnership",modal_inquiry:"inquiry"};
        const type = typeMap[interaction.customId];
        let answers = {};
        if (type==="order") {
          answers = {username:interaction.fields.getTextInputValue("username"),service:interaction.fields.getTextInputValue("service"),description:interaction.fields.getTextInputValue("description"),budget:interaction.fields.getTextInputValue("budget"),payment:interaction.fields.getTextInputValue("payment")};
        } else if (type==="partnership") {
          answers = {serverName:interaction.fields.getTextInputValue("serverName"),invite:interaction.fields.getTextInputValue("invite"),memberCount:interaction.fields.getTextInputValue("memberCount"),focus:interaction.fields.getTextInputValue("focus"),offering:interaction.fields.getTextInputValue("offering")};
        } else {
          answers = {name:interaction.fields.getTextInputValue("name"),topic:interaction.fields.getTextInputValue("topic"),details:interaction.fields.getTextInputValue("details"),urgency:interaction.fields.getTextInputValue("urgency")};
        }
        const member = interaction.member ?? await interaction.guild?.members.fetch(interaction.user.id).catch(()=>null);
        const result = await openTicket(interaction.guild, member, type, answers);
        if (!result.ok) return interaction.editReply({ content:`❌ ${result.error}` });
        return interaction.editReply({ content:`✅ Ticket created: <#${result.channel.id}>` });
      }

      if (interaction.customId === "modal_close") {
        const reason = interaction.fields.getTextInputValue("reason");
        if (!interaction.channel?.name?.startsWith("ticket-"))
          return interaction.reply({ content:"❌ Not a ticket channel.", flags:MessageFlags.Ephemeral });
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.editReply({ content:"🔒 Closing ticket…" });
        await closeTicket(interaction.channel, interaction.member||interaction.user, reason, interaction.guild);
        return;
      }
    }

  } catch (err) {
    console.error("[Interaction]", err.message);
    await sendErrorLog(err, "Interaction handler");
    try { if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) await interaction.reply({ content:"❌ An error occurred.", flags:MessageFlags.Ephemeral }); } catch {}
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  MESSAGE CREATE (prefix commands kept for backwards compat + XP/trivia)
// ═══════════════════════════════════════════════════════════════════════════

const _handledMsg = new Map();
function alreadyHandledMsg(id) {
  const now = Date.now();
  for (const [k,t] of _handledMsg) if (now-t > 60_000) _handledMsg.delete(k);
  if (_handledMsg.has(id)) return true;
  _handledMsg.set(id, now); return false;
}

client.on("messageCreate", async msg => {
  if (msg.author.bot || !msg.guild || alreadyHandledMsg(msg.id)) return;

  // Sticky
  if (msg.channel.id === STICKY_CHANNEL_ID) refreshSticky(msg.channel).catch(()=>{});

  // Partner ad collection
  if (partnerAwaitAd.has(msg.channel.id)) {
    const pd = partnerAwaitAd.get(msg.channel.id);
    if (msg.author.id === pd.member.id && msg.content.trim().length >= 20) {
      partnerAwaitAd.delete(msg.channel.id);
      setImmediate(async () => {
        try {
          const { formAnswers, count, ping, tier } = pd;
          const adText = msg.content.trim();
          const banner = msg.attachments.first()?.url || null;
          const g = client.guilds.cache.get(HOME_GUILD_ID); if (!g) return;
          const ch = await g.channels.fetch(PARTNER_AD_CHANNEL_ID).catch(()=>null); if (!ch?.isTextBased()) return;
          const emb = new EmbedBuilder().setColor(0x9b59b6).setTitle(formAnswers.serverName||"New Partner").setDescription(`${adText}\n\u200b`)
            .addFields({name:"👥 Members",value:formAnswers.memberCount||"—",inline:true},{name:"📊 Tier",value:tier,inline:true},{name:"🎯 Focus",value:formAnswers.focus||"—",inline:true},{name:"🤝 Offering",value:formAnswers.offering||"—"},{name:"🔗 Join",value:formAnswers.invite||"—"})
            .setFooter({text:`${BOT_NAME} Partnerships`}).setTimestamp();
          if (banner) emb.setImage(banner);
          await ch.send({content:ping||undefined,embeds:[emb],allowedMentions:ping?{parse:["everyone"]}:{}});
          await msg.channel.send({embeds:[E.success("✅ Partnership Posted!").setDescription(`Your ad is live in <#${PARTNER_AD_CHANNEL_ID}>! 💗\n\nThis ticket closes in 15 seconds.`)]});
          setTimeout(()=>msg.channel.delete("Partnership posted").catch(()=>{}), 15_000);
        } catch (err) { console.error("[PartnerAd]", err.message); }
      });
      return;
    }
  }

  // Forum support AI
  if (msg.channel.isThread?.() && msg.channel.parentId === FORUM_SUPPORT_CHANNEL_ID && GROQ_API_KEY) {
    const key = `forum:${msg.channel.id}:${msg.author.id}`;
    const last = aiCooldowns.get(key)||0;
    if (Date.now()-last >= 5000) {
      aiCooldowns.set(key, Date.now());
      setImmediate(async () => {
        const { text, model } = await callTicketAI(`forum_${msg.channel.id}`, msg.content, "inquiry", null);
        if (text) await msg.channel.send({content:`${text}${aiFooter(model, msg.author.username)}`, allowedMentions:{users:[]}}).catch(()=>{});
      });
    }
    return;
  }

  // Ticket AI — autonomous
  if (msg.channel.name?.startsWith("ticket-") && !msg.content.startsWith(PREFIX)) {
    const s = getSettings(msg.guild.id);
    const isStaff = isAdmin(msg.member) || hasPerm(msg.member, PermissionFlagsBits.ManageMessages);
    if (!isStaff && s.ticketAI !== false && GROQ_API_KEY && !ticketAIOff.has(msg.channel.id)) {
      const key = `${msg.channel.id}:${msg.author.id}`;
      const last = aiCooldowns.get(key)||0;
      if (Date.now()-last >= 8000) {
        aiCooldowns.set(key, Date.now());
        const typeMatch = msg.channel.topic?.match(/^\[(\w+)\]/);
        const type = typeMatch ? typeMatch[1] : "inquiry";
        setImmediate(async () => {
          const { text, model } = await callTicketAI(msg.channel.id, msg.content, type, null);
          if (text) await msg.channel.send({content:`${text}${aiFooter(model, msg.author.username)}`, allowedMentions:{users:[]}}).catch(()=>{});
        });
      }
    }
  }

  // XP + Coins + Trivia
  if (!msg.content.startsWith(PREFIX)) {
    grantXP(msg).catch(()=>{});
    grantCoins(msg).catch(()=>{});
    // Trivia check
    if (data.triviaActive[msg.channel.id]) {
      const tv = data.triviaActive[msg.channel.id];
      if (tv.answers.some(a => msg.content.trim().toLowerCase().includes(a.toLowerCase()))) {
        const eco = getEco(msg.author.id); eco.coins = (eco.coins||0)+tv.coins;
        delete data.triviaActive[msg.channel.id]; saveData();
        await msg.reply({embeds:[E.success("🧠 Correct!").setDescription(`**+${tv.coins} 🪙**`)]}).catch(()=>{});
      }
    }
    return;
  }

  // Legacy prefix commands (optional, kept minimal)
  const parts = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = parts.shift()?.toLowerCase();
  if (!cmd) return;

  // Only handle a few legacy commands for convenience
  const LEGACY = {
    ping:   m => m.channel.send({embeds:[E.success("🏓 Pong!").addFields({name:"Gateway",value:`${Math.round(client.ws.ping)}ms`,inline:true})]}),
    help:   m => m.channel.send({content:"✨ This bot now uses **slash commands**! Type `/` to see all commands."}),
  };

  if (LEGACY[cmd]) {
    try { await LEGACY[cmd](msg); } catch (err) { console.error(`[Legacy ${cmd}]`, err.message); }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  FORUM THREAD CREATE
// ═══════════════════════════════════════════════════════════════════════════

client.on("threadCreate", async thread => {
  try {
    if (thread.parentId !== FORUM_SUPPORT_CHANNEL_ID) return;
    await thread.join().catch(()=>{});
    await thread.send({embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle("📜 Support Forum — Welcome!").setDescription("Welcome to **Snuggles Scripting Support**! 💗\n\nOur **Snuggles AI** is here to help you instantly!\n\nPlease include: screenshots, error messages, and code snippets for faster help.\n\n*Fully AI-managed — instant response, 24/7!*").setFooter({text:`${BOT_NAME} • AI-Powered`}).setTimestamp()]});
    if (GROQ_API_KEY) {
      const { text, model } = await callTicketAI(`forum_${thread.id}`, `A new support thread was just created titled: "${thread.name}". Greet the user warmly, introduce yourself as Snuggles AI, and ask them to describe their issue in detail. 💗`, "inquiry", null);
      if (text) await thread.send({content:`${text}${aiFooter(model, "Snuggles AI")}`, allowedMentions:{users:[]}});
    }
  } catch (err) { console.error("[Forum threadCreate]", err.message); }
});

// ═══════════════════════════════════════════════════════════════════════════
//  GUILD EVENTS
// ═══════════════════════════════════════════════════════════════════════════

client.on("guildCreate", async g => {
  console.log(`Joined: ${g.name}`); updateStatus();
  await cacheInvites(g).catch(()=>{});
  const ch = g.channels.cache.filter(c=>c.type===ChannelType.GuildText&&c.permissionsFor(g.members.me)?.has(PermissionFlagsBits.SendMessages)).sort((a,b)=>a.rawPosition-b.rawPosition).first();
  if (ch) await ch.send({embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`🧸 ${BOT_NAME} v${BOT_VERSION} — Setup`).setDescription(`Thanks for adding me!\n\n**Setup:**\n1. \`/setlog #channel\`\n2. \`/setreviews #channel\`\n3. \`/settranscripts #channel\`\n4. \`/ticketpanel\` in your support channel\n\n**All commands are slash commands — type \`/\` to get started!**\n\n**AI:** ${GROQ_API_KEY?"✅ Enabled":"❌ Add GROQ_API_KEY to .env"}`).setFooter({text:`${BOT_NAME} v${BOT_VERSION} • Made with 💗 by ${BOT_OWNER}`}).setTimestamp()]}).catch(()=>{});
  try { const hg=client.guilds.cache.get(HOME_GUILD_ID);if(!hg)return;const lch=await hg.channels.fetch(GUILD_JOIN_LOG_CHANNEL).catch(()=>null);if(lch?.isTextBased()){const o=await client.users.fetch(g.ownerId).catch(()=>null);await lch.send({embeds:[E.success("✅ Joined Server").addFields({name:"Server",value:g.name,inline:true},{name:"Members",value:`${g.memberCount}`,inline:true},{name:"Owner",value:o?.tag||g.ownerId,inline:true}).setTimestamp()]});} } catch {}
});

client.on("guildDelete", async g => {
  console.log(`Left: ${g.name}`); updateStatus();
  try { const hg=client.guilds.cache.get(HOME_GUILD_ID);if(!hg)return;const ch=await hg.channels.fetch(GUILD_LEAVE_LOG_CHANNEL).catch(()=>null);if(ch?.isTextBased())await ch.send({embeds:[E.error("❌ Left Server").addFields({name:"Server",value:g.name,inline:true}).setTimestamp()]}); } catch {}
});

// ─── Invite tracking ──────────────────────────────────────────────────────────
client.on("inviteCreate", inv=>{ if(!inv.guild)return;if(!data.inviteCache[inv.guild.id])data.inviteCache[inv.guild.id]={};data.inviteCache[inv.guild.id][inv.code]=inv.uses||0;saveData();});
client.on("inviteDelete", inv=>{ if(!inv.guild)return;if(data.inviteCache[inv.guild.id])delete data.inviteCache[inv.guild.id][inv.code];saveData();});

client.on("guildMemberAdd", async member => {
  try {
    await handleAntiRaidJoin(member);
    const g = member.guild;
    const newInv = await g.invites.fetch().catch(()=>null);
    if (newInv) {
      const cached = data.inviteCache[g.id]||{};
      let inviterId = null;
      newInv.forEach(inv => { if((inv.uses||0) > (cached[inv.code]||0)) inviterId=inv.inviter?.id; cached[inv.code]=inv.uses||0; });
      data.inviteCache[g.id] = cached;
      if (inviterId) { if(!data.invites[g.id])data.invites[g.id]={}; if(!data.invites[g.id][inviterId])data.invites[g.id][inviterId]={invited:0,left:0}; data.invites[g.id][inviterId].invited++; }
      saveData();
    }
    await logMod(g, E.success("📥 Member Joined").addFields({name:"User",value:`<@${member.id}> (${member.user.tag})`},{name:"Account Age",value:`<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`}).setThumbnail(member.user.displayAvatarURL()).setTimestamp());
  } catch {}
});

client.on("guildMemberRemove", async member => {
  try {
    if (data.invites[member.guild.id]) { for (const inv of Object.values(data.invites[member.guild.id])) { inv.left++; break; } saveData(); }
    await logMod(member.guild, E.error("📤 Member Left").addFields({name:"User",value:`<@${member.id}> (${member.user.tag})`}).setThumbnail(member.user.displayAvatarURL()).setTimestamp());
  } catch {}
});

// ─── Logging ──────────────────────────────────────────────────────────────────
client.on("messageDelete", async msg => { try { if(!msg.guild||msg.author?.bot||msg.partial||!msg.content)return; await logMod(msg.guild,E.error("🗑️ Message Deleted").addFields({name:"Author",value:`<@${msg.author.id}>`,inline:true},{name:"Channel",value:`<#${msg.channel.id}>`,inline:true},{name:"Content",value:msg.content.slice(0,1024)}).setTimestamp()); } catch {} });
client.on("messageUpdate", async(o,n) => { try { if(!n.guild||n.author?.bot||o.partial||n.partial||o.content===n.content)return; await logMod(n.guild,E.warn("✏️ Message Edited").addFields({name:"Author",value:`<@${n.author.id}>`,inline:true},{name:"Channel",value:`<#${n.channel.id}>`,inline:true},{name:"Before",value:(o.content||"—").slice(0,1024)},{name:"After",value:(n.content||"—").slice(0,1024)},{name:"Link",value:`[Jump](${n.url})`,inline:true}).setTimestamp()); } catch {} });
client.on("channelDelete", async ch => { try { if(!ch.guild)return; await logMod(ch.guild,E.error("💬 Channel Deleted").addFields({name:"Name",value:ch.name,inline:true}).setTimestamp()); const logs=await ch.guild.fetchAuditLogs({type:AuditLogEvent.ChannelDelete,limit:1}).catch(()=>null); if(logs){const e=logs.entries.first();if(e)await checkNuke(ch.guild,e.executor.id,"channelDelete");} } catch {} });
client.on("roleDelete", async r => { try { await logMod(r.guild,E.error("🎭 Role Deleted").addFields({name:"Name",value:r.name,inline:true}).setTimestamp()); const logs=await r.guild.fetchAuditLogs({type:AuditLogEvent.RoleDelete,limit:1}).catch(()=>null); if(logs){const e=logs.entries.first();if(e)await checkNuke(r.guild,e.executor.id,"roleDelete");} } catch {} });
client.on("guildBanAdd", async ban => { try { await logMod(ban.guild,E.error("🔨 Member Banned").addFields({name:"User",value:`${ban.user.tag}`},{name:"Reason",value:ban.reason||"No reason"}).setTimestamp()); const logs=await ban.guild.fetchAuditLogs({type:AuditLogEvent.MemberBanAdd,limit:1}).catch(()=>null); if(logs){const e=logs.entries.first();if(e)await checkNuke(ban.guild,e.executor.id,"ban");} } catch {} });
client.on("guildBanRemove", async ban => { try { await logMod(ban.guild,E.success("🔓 Member Unbanned").addFields({name:"User",value:`${ban.user.tag}`}).setTimestamp()); } catch {} });
client.on("voiceStateUpdate", async(o,n) => { try { if(o.channelId===n.channelId)return; let desc=""; if(!o.channelId&&n.channelId)desc=`<@${n.id}> joined **${n.channel?.name}**`; else if(o.channelId&&!n.channelId)desc=`<@${o.id}> left **${o.channel?.name}**`; else desc=`<@${n.id}> moved: **${o.channel?.name}** → **${n.channel?.name}**`; await logMod(n.guild,E.info("🔊 Voice Update").setDescription(desc).setTimestamp()); } catch {} });

// ═══════════════════════════════════════════════════════════════════════════
//  ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

client.on("error", async err => {
  // Filter known non-critical network errors from logging spam
  const msg = err?.message || "";
  if (msg.includes("Sign in to confirm") || msg.includes("live stream recording")) {
    console.warn("[Filtered known error]", msg);
    return;
  }
  console.error("Client error:", err);
  await sendErrorLog(err, "Client error");
});

process.on("unhandledRejection", async err => {
  const msg = String(err?.message || err);
  // Suppress known YouTube bot detection errors from spam — music handles these internally
  if (msg.includes("Sign in to confirm") || msg.includes("live stream recording") || msg.includes("This live stream")) {
    console.warn("[Suppressed] YouTube bot detection / stream error:", msg);
    return;
  }
  console.error("Unhandled rejection:", err);
  await sendErrorLog(err, "Unhandled rejection");
});

process.on("uncaughtException", async err => {
  console.error("Uncaught exception:", err);
  await sendErrorLog(err, "Uncaught exception");
});

// ═══════════════════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════════════════

client.login(TOKEN);

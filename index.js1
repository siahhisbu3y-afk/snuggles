"use strict";

const fs   = require("fs");
const path = require("path");
const {
  Client, GatewayIntentBits, Partials, ChannelType,
  PermissionFlagsBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, MessageFlags, AuditLogEvent, ActivityType,
  AttachmentBuilder,
} = require("discord.js");

require("dotenv").config();

// ─── ENV ────────────────────────────────────────────────────────────────────
const TOKEN                 = (process.env.DISCORD_TOKEN          || "").trim();
const GROQ_API_KEY          = (process.env.GROQ_API_KEY           || "").trim();
const STABILITY_API_KEY     = (process.env.STABILITY_API_KEY      || "").trim();
const OPENAI_API_KEY        = (process.env.OPENAI_API_KEY         || "").trim();
const SPOTIFY_CLIENT_ID     = (process.env.SPOTIFY_CLIENT_ID      || "").trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET  || "").trim();

if (!TOKEN) { console.error("❌ Missing DISCORD_TOKEN"); process.exit(1); }
if (!GROQ_API_KEY)      console.warn("⚠️  No GROQ_API_KEY — AI features disabled");
if (!STABILITY_API_KEY) console.warn("⚠️  No STABILITY_API_KEY — using free Pollinations fallback");

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const PREFIX        = "s!";
const BOT_NAME      = "Snuggles Scripting";
const BOT_VERSION   = "7.0.0";
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

// ─── AI MODELS ───────────────────────────────────────────────────────────────
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

// ─── LOFI STREAMS ────────────────────────────────────────────────────────────
const LOFI_STREAMS = [
  { title: "Lofi Hip Hop Radio",    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
  { title: "Chillhop Radio",        url: "https://www.youtube.com/watch?v=5yx6BWlEVcY" },
  { title: "Late Night Lofi",       url: "https://www.youtube.com/watch?v=rUxyKA_-grg" },
  { title: "Cozy Coffee Shop Lofi", url: "https://www.youtube.com/watch?v=7NOSDKb0HlU" },
  { title: "Lofi Study Beats",      url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
  { title: "Chill Lofi Mix",        url: "https://www.youtube.com/watch?v=Na0w3Mz46GA" },
];

// ─── ECONOMY / XP ────────────────────────────────────────────────────────────
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
  { id: "ai_image",       name: "🖼️ AI Image Pack",       price: 150,  desc: "5 AI-generated images via s!imagine." },
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
  not_started:        { label: "🔴 Not Started",         color: 0xed4245 },
  in_progress:        { label: "🔵 In Progress",          color: 0x5865f2 },
  almost_complete:    { label: "🟠 Almost Complete",      color: 0xffa500 },
  partially_complete: { label: "🟡 Partially Complete",  color: 0xfee75c },
  completed:          { label: "🟢 Completed",            color: 0x57f287 },
  cancelled:          { label: "⚪ Cancelled",            color: 0x95a5a6 },
  on_hold:            { label: "⏸️ On Hold",              color: 0x9b59b6 },
  revision:           { label: "🔄 In Revision",          color: 0xf1c40f },
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
  { name: "🐛 Scripting Help",   value: "Stuck on a bug? Use `s!debug` to format your issue and get help." },
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
  { text: "🎁 **Scripting snippet** unlocked — try `s!snippet` for inspiration.", coins: 60  },
  { text: "🎁 **Priority queue** — your next ticket gets a faster first response.", coins: 100 },
  { text: "🎁 **Double XP** on community engagement today (good vibes only).", coins: 80  },
  { text: "🎁 **AI Image token** — use `s!imagine` to generate a free image!", coins: 55  },
];

const TRIVIA_QUESTIONS = [
  { q: "What Lua function replaces `wait()` in modern Roblox?", a: ["task.wait","task wait"], hint: "It's in the `task` library." },
  { q: "What does `pcall` stand for in Lua?", a: ["protected call","pcall"], hint: "It prevents crashes on errors." },
  { q: "What service handles player data saving in Roblox?", a: ["datastoreservice","datastore service"], hint: "`game:GetService()` call." },
  { q: "What event fires when a player joins a Roblox game?", a: ["playeradded","players.playeradded"], hint: "On the `Players` service." },
  { q: "What does SOLID stand for in software design?", a: ["single responsibility open closed liskov substitution interface segregation dependency inversion"], hint: "Five OOP design principles." },
  { q: "What Roblox class is used to create GUI buttons?", a: ["textbutton","imagebutton"], hint: "Found under ScreenGui." },
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
- End your VERY FIRST message with a warm call-to-action

## Common Questions
- Payment? → PayPal F&F, CashApp, Robux group payout (you cover 30% tax), or gift cards
- Refund? → All sales final — see ToS
- Time? → Simple: 1–3 days, Medium: 3–7 days, Complex: 1–2 weeks
- Cost? → Simple scripts $5–25, UI $20–60, full systems $60–250+, quote after full review
- What can you make? → Almost anything: game systems, UI, admin panels, datastores, anti-cheat, weapons, vehicles, cutscenes, leaderboards, and more
- Partnership? → Apply via the Partnership ticket button`;

const AI_CHAT_SYSTEM = `You are **Snuggles AI** — a smart, capable, friendly AI assistant built into the Snuggles Scripting Discord bot. You can help with absolutely anything: coding in any language, writing, math, creative projects, analysis, explanations, ideas, or just chatting.

Be conversational, accurate, and genuinely useful. Use formatting (bullets, code blocks, bold) when it improves clarity. You are NOT limited to any topic — answer freely and naturally.

When writing code, always use proper formatting with code blocks and include comments.
When asked for opinions, give genuine, thoughtful responses.
When asked factual questions, be accurate and cite uncertainty where appropriate.`;

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

// ─── Accessor helpers ────────────────────────────────────────────────────────
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
//  MUSIC / VOICE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

let lofiConnection   = null;
let lofiPlayer       = null;
let lofiCurrentTrack = null;
let lofiRetry        = null;

const guildMusic = new Map();
function getGuildMusic(guildId) {
  if (!guildMusic.has(guildId)) guildMusic.set(guildId, { queue:[], current:null, connection:null, player:null, volume:0.5, loop:false, textChannel:null });
  return guildMusic.get(guildId);
}

// ─── Spotify ─────────────────────────────────────────────────────────────────
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

async function resolveSpotify(url) {
  const tok = await getSpotifyToken();
  if (!tok) return null;
  try {
    const trackId    = url.match(/track\/([A-Za-z0-9]+)/)?.[1];
    const playlistId = url.match(/playlist\/([A-Za-z0-9]+)/)?.[1];
    const albumId    = url.match(/album\/([A-Za-z0-9]+)/)?.[1];
    if (trackId) {
      const r = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers:{Authorization:`Bearer ${tok}`} });
      if (!r.ok) return null;
      const t = await r.json();
      return [{ title:`${t.name} — ${t.artists[0].name}`, searchQuery:`${t.name} ${t.artists[0].name}`, source:"Spotify 🎧" }];
    }
    if (playlistId) {
      const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=30`, { headers:{Authorization:`Bearer ${tok}`} });
      if (!r.ok) return null;
      const pl = await r.json();
      return pl.items.filter(i=>i.track).map(i=>({ title:`${i.track.name} — ${i.track.artists[0].name}`, searchQuery:`${i.track.name} ${i.track.artists[0].name}`, source:"Spotify 🎧" }));
    }
    if (albumId) {
      const r  = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=30`, { headers:{Authorization:`Bearer ${tok}`} });
      if (!r.ok) return null;
      const al = await r.json();
      const ai = await (await fetch(`https://api.spotify.com/v1/albums/${albumId}`, { headers:{Authorization:`Bearer ${tok}`} })).json();
      return al.items.map(t=>({ title:`${t.name} — ${ai.artists[0].name}`, searchQuery:`${t.name} ${ai.artists[0].name}`, source:"Spotify 🎧" }));
    }
  } catch { return null; }
  return null;
}

async function resolveAppleMusic(url) {
  try {
    const trackMatch = url.match(/music\.apple\.com\/[a-z]+\/album\/[^/]+\/(\d+)\?i=(\d+)/);
    const albumMatch = url.match(/music\.apple\.com\/[a-z]+\/album\/([^/]+)\/(\d+)/);
    if (trackMatch) {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${trackMatch[2]}`);
      const j = await r.json();
      if (j.results?.length) {
        const t = j.results[0];
        return [{ title:`${t.trackName} — ${t.artistName}`, searchQuery:`${t.trackName} ${t.artistName}`, source:"Apple Music 🍎" }];
      }
    }
    if (albumMatch) {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${albumMatch[2]}&entity=song`);
      const j = await r.json();
      return j.results.filter(r=>r.wrapperType==="track").slice(0,15).map(t=>({ title:`${t.trackName} — ${t.artistName}`, searchQuery:`${t.trackName} ${t.artistName}`, source:"Apple Music 🍎" }));
    }
  } catch { return null; }
  return null;
}

async function resolveQuery(query) {
  if (query.includes("spotify.com"))      return await resolveSpotify(query);
  if (query.includes("music.apple.com"))  return await resolveAppleMusic(query);
  if (query.match(/youtu(?:\.be|be\.com)/)) return [{ title:"YouTube Track", url:query, source:"YouTube ▶️" }];
  try {
    const ytsr = require("ytsr");
    const res  = await ytsr(query, { limit:1 });
    if (res.items?.[0]) {
      const item = res.items[0];
      return [{ title:item.title, url:item.url, source:"YouTube ▶️" }];
    }
  } catch {}
  return [{ title:query, searchQuery:query, source:"Search 🔍" }];
}

async function getYouTubeUrl(track) {
  if (track.url && track.url.includes("youtu")) return track.url;
  try {
    const ytsr = require("ytsr");
    const res  = await ytsr(track.searchQuery || track.title, { limit:1 });
    return res.items?.[0]?.url || null;
  } catch { return null; }
}

// ─── 24/7 Lofi VC ────────────────────────────────────────────────────────────
async function startLofiVC() {
  clearTimeout(lofiRetry);
  try {
    const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection, StreamType } = require("@discordjs/voice");
    const ytdl = require("@distube/ytdl-core");

    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) { console.warn("[Lofi] Home guild not found"); return; }
    const vc = guild.channels.cache.get(LOFI_VC_CHANNEL_ID);
    if (!vc) { console.warn("[Lofi] VC not found:", LOFI_VC_CHANNEL_ID); return; }

    const existing = getVoiceConnection(HOME_GUILD_ID);
    if (existing) existing.destroy();

    const conn = joinVoiceChannel({ channelId:LOFI_VC_CHANNEL_ID, guildId:HOME_GUILD_ID, adapterCreator:guild.voiceAdapterCreator, selfDeaf:false });
    lofiConnection = conn;

    conn.on(VoiceConnectionStatus.Disconnected, () => {
      console.log("[Lofi] Disconnected — retrying in 8s");
      lofiRetry = setTimeout(startLofiVC, 8000);
    });
    conn.on("error", err => { console.error("[Lofi] Connection error:", err.message); lofiRetry = setTimeout(startLofiVC, 10_000); });

    const player = createAudioPlayer();
    lofiPlayer   = player;
    conn.subscribe(player);

    const playRandom = async () => {
      const track = LOFI_STREAMS[Math.floor(Math.random() * LOFI_STREAMS.length)];
      lofiCurrentTrack = track;
      console.log("[Lofi] ▶", track.title);
      try {
        const stream   = ytdl(track.url, { filter:"audioonly", quality:"lowestaudio", highWaterMark:1<<25 });
        const resource = createAudioResource(stream, { inputType:StreamType.Arbitrary, inlineVolume:true });
        resource.volume?.setVolume(0.35);
        player.play(resource);
      } catch (err) {
        console.error("[Lofi] Stream error:", err.message);
        setTimeout(playRandom, 5000);
      }
    };

    player.on(AudioPlayerStatus.Idle, () => setTimeout(playRandom, 2000));
    player.on("error", err => { console.error("[Lofi] Player error:", err.message); setTimeout(playRandom, 5000); });
    await playRandom();
    console.log("🎵 24/7 Lofi VC started!");

  } catch (err) {
    console.warn("[Lofi] Not available (install @discordjs/voice @distube/ytdl-core):", err.message);
  }
}

// ─── Guild Music ──────────────────────────────────────────────────────────────
async function playNextTrack(guildId) {
  const m = getGuildMusic(guildId);
  if (!m.queue.length && !m.loop) { m.current = null; return; }
  const track = m.loop && m.current ? m.current : m.queue.shift();
  m.current = track;
  try {
    const { createAudioResource, AudioPlayerStatus, StreamType } = require("@discordjs/voice");
    const ytdl = require("@distube/ytdl-core");
    const url  = await getYouTubeUrl(track);
    if (!url) { await playNextTrack(guildId); return; }
    const stream   = ytdl(url, { filter:"audioonly", quality:"highestaudio", highWaterMark:1<<25 });
    const resource = createAudioResource(stream, { inputType:StreamType.Arbitrary, inlineVolume:true });
    resource.volume?.setVolume(m.volume);
    m.player.play(resource);
    if (m.textChannel) {
      await m.textChannel.send({ embeds:[new EmbedBuilder().setColor(MUSIC_COLOR).setTitle("🎵 Now Playing")
        .setDescription(`**[${track.title}](${url})**`)
        .addFields({name:"Source",value:track.source||"—",inline:true},{name:"🔊 Volume",value:`${Math.round(m.volume*100)}%`,inline:true},{name:"🔁 Loop",value:m.loop?"On":"Off",inline:true})
        .setTimestamp()] }).catch(()=>{});
    }
  } catch (err) {
    console.error("[Music] Error:", err.message);
    if (m.textChannel) await m.textChannel.send({content:`❌ Failed to play **${track.title}**`}).catch(()=>{});
    await playNextTrack(guildId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  BOT STATUS CYCLE
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_CYCLE = [
  n => ({ name:`over ${n} server${n!==1?"s":""} 💗`,      type:ActivityType.Watching  }),
  n => ({ name:`lofi beats 24/7 🎵`,                       type:ActivityType.Listening }),
  n => ({ name:`${n} Roblox scripter${n!==1?"s":""} ✨`,  type:ActivityType.Watching  }),
  n => ({ name:`s!help — ${BOT_NAME}`,                      type:ActivityType.Playing   }),
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
  console.log(`🎵  Music: ${SPOTIFY_CLIENT_ID ? "Spotify ready" : "Spotify not configured"}`);

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

function isAdmin(m)    { return !!(m?.permissions.has(PermissionFlagsBits.Administrator)); }
function hasPerm(m, f) { return !!(m?.permissions.has(f)); }

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

const _responded = new WeakSet();
async function respond(msg, payload) {
  if(_responded.has(msg)) return null;
  _responded.add(msg);
  return msg.channel.send(payload).catch(()=>null);
}

const _cds = new Map();
const CD_CONFIG = {
  vouch:60_000, review:60_000, meme:8_000, "8ball":3_000, rate:5_000,
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
  brand:   t=>new EmbedBuilder().setColor(BRAND_COLOR).setTitle(t),
  success: t=>new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(t),
  error:   t=>new EmbedBuilder().setColor(ERROR_COLOR).setTitle(t),
  warn:    t=>new EmbedBuilder().setColor(WARN_COLOR).setTitle(t),
  info:    t=>new EmbedBuilder().setColor(INFO_COLOR).setTitle(t),
  gold:    t=>new EmbedBuilder().setColor(GOLD_COLOR).setTitle(t),
  ai:      t=>new EmbedBuilder().setColor(AI_COLOR).setTitle(t),
  music:   t=>new EmbedBuilder().setColor(MUSIC_COLOR).setTitle(t),
  img:     t=>new EmbedBuilder().setColor(IMG_COLOR).setTitle(t),
  xp:      t=>new EmbedBuilder().setColor(XP_COLOR).setTitle(t),
};

function aiFooter(modelLabel, username) {
  return `\n\n-# 🤖 **Snuggles AI**  •  ${modelLabel||"AI"}  •  asked by **${username}**`;
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
      await sendRaidAlert(member.guild,s,{title:"🛡️ New Account Blocked",fields:[{name:"User",value:`${member.user.tag}`,inline:true},{name:"Age",value:fmtDuration(age),inline:true},{name:"Action",value:s.action,inline:true}]});
      return;
    }
  }

  if(t.joins.length>=s.threshold&&!t.locked){
    t.locked=true;
    await sendRaidAlert(member.guild,s,{title:"🚨 RAID DETECTED — Protection Active",description:`**${t.joins.length}** joins in **${s.window/1000}s** — action: **${s.action}**`,fields:[{name:"Joins",value:`${t.joins.length}`,inline:true},{name:"Window",value:`${s.window/1000}s`,inline:true},{name:"Action",value:s.action,inline:true}],danger:true});
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
  await sendRaidAlert(guild,s,{title:"🔓 Lockdown Lifted",description:`Auto-unlocked after ${fmtDuration(s.autoUnlock)}.`,danger:false});
}

async function sendRaidAlert(guild, s, opts) {
  const id=s.notifyChannel||data.modLogChannels[guild.id]; if(!id)return;
  const ch=await guild.channels.fetch(id).catch(()=>null); if(!ch?.isTextBased())return;
  const emb=new EmbedBuilder().setColor(opts.danger!==false?ERROR_COLOR:SUCCESS_COLOR).setTitle(opts.title).setTimestamp();
  if(opts.description)emb.setDescription(opts.description);
  if(opts.fields)emb.addFields(opts.fields);
  await ch.send({embeds:[emb]}).catch(()=>{});
}

async function handleAntiRaid(msg, args) {
  if(!isAdmin(msg.member)) return respond(msg,{embeds:[E.error("No Permission").setDescription("Admin only.")]});
  const sub=(args[0]||"").toLowerCase(), s=getAntiRaid(msg.guild.id);

  if(sub==="enable"){  s.enabled=true;  saveData(); return respond(msg,{embeds:[E.success("🛡️ Anti-Raid v3 Enabled").addFields({name:"Threshold",value:`${s.threshold} joins/${s.window/1000}s`,inline:true},{name:"Action",value:s.action,inline:true},{name:"Min Age",value:s.minAccountAge?`${s.minAccountAge}d`:"Off",inline:true}).setTimestamp()]}); }
  if(sub==="disable"){ s.enabled=false; saveData(); return respond(msg,{embeds:[E.warn("🛡️ Anti-Raid Disabled")]}); }
  if(sub==="unlock")  { await liftLockdown(msg.guild,s); return respond(msg,{embeds:[E.success("🔓 Lockdown Lifted")]}); }
  if(sub==="reset")   { raidTrackers.delete(msg.guild.id); return respond(msg,{embeds:[E.success("✅ Raid Tracker Reset")]}); }

  if(sub==="config"){
    const p=(args[1]||"").toLowerCase(), v=args[2];
    const cfgMap = {
      threshold:   ()=>{ const n=parseInt(v,10); if(n<2||!isFinite(n))return"≥2 required"; s.threshold=n; return`Threshold: **${n}**`; },
      window:      ()=>{ const n=parseInt(v,10)*1000; if(!isFinite(n)||n<1000)return"Invalid"; s.window=n; return`Window: **${v}s**`; },
      action:      ()=>{ if(!["kick","ban","lockdown"].includes(v))return"kick|ban|lockdown"; s.action=v; return`Action: **${v}**`; },
      minage:      ()=>{ const n=parseInt(v,10); if(!isFinite(n)||n<0)return"Invalid"; s.minAccountAge=n; return n===0?"Min age disabled":`Min age: **${n}d**`; },
      autounlock:  ()=>{ const n=parseInt(v,10)*1000; s.autoUnlock=n||0; return n?`Auto-unlock: **${v}s**`:"Manual only"; },
      alertchannel:()=>{ const id=parseChannelId(v); s.notifyChannel=id||null; return id?`Channel: <#${id}>`:"Cleared"; },
      whitelistrole:()=>{ const id=parseRoleId(v); if(!id)return"Invalid role"; const i=s.whitelistedRoles.indexOf(id); if(i===-1){s.whitelistedRoles.push(id);return`<@&${id}> whitelisted`;}else{s.whitelistedRoles.splice(i,1);return`<@&${id}> removed`;} },
      whitelistuser:()=>{ const id=parseUserId(v); if(!id)return"Invalid user"; const i=s.whitelistedUsers.indexOf(id); if(i===-1){s.whitelistedUsers.push(id);return`<@${id}> whitelisted`;}else{s.whitelistedUsers.splice(i,1);return`<@${id}> removed`;} },
      dm:          ()=>{ s.dmOnAction=v==="on"; return`DM on action: **${s.dmOnAction?"On":"Off"}**`; },
      logjoins:    ()=>{ s.logJoins=v==="on"; return`Log joins: **${s.logJoins?"On":"Off"}**`; },
      alertowner:  ()=>{ s.alertOwner=v==="on"; return`Alert owner: **${s.alertOwner?"On":"Off"}**`; },
    };
    if(cfgMap[p]){ const r=cfgMap[p](); saveData(); return respond(msg,{embeds:[E.success(`✅ Anti-Raid — ${p}`).setDescription(r)]}); }
    return respond(msg,{embeds:[E.info("⚙️ Anti-Raid Config").addFields(
      {name:"`threshold <n>`",     value:"Joins to trigger (≥2)"},{name:"`window <secs>`",   value:"Detection window"},
      {name:"`action <k|b|l>`",    value:"kick/ban/lockdown"},    {name:"`minage <days>`",   value:"Min account age (0=off)"},
      {name:"`autounlock <secs>`", value:"Auto-unlock (0=manual)"},{name:"`alertchannel <#>`",value:"Alert channel"},
      {name:"`whitelistrole <@>` / `whitelistuser <@>`",value:"Whitelist roles/users"},
      {name:"`dm|logjoins|alertowner <on|off>`",value:"Toggle features"},
    )]});
  }
  if(sub==="status"){
    const t=raidTrackers.get(msg.guild.id), ld=raidLockdowns.get(msg.guild.id);
    return respond(msg,{embeds:[E.info("🛡️ Anti-Raid Status v3")
      .setDescription(`**${s.enabled?"🟢 Active":"🔴 Disabled"}**`)
      .addFields(
        {name:"Threshold",value:`${s.threshold} joins`,inline:true},{name:"Window",value:`${s.window/1000}s`,inline:true},{name:"Action",value:s.action,inline:true},
        {name:"Min Age",value:s.minAccountAge?`${s.minAccountAge}d`:"Off",inline:true},{name:"Auto-Unlock",value:s.autoUnlock?fmtDuration(s.autoUnlock):"Manual",inline:true},{name:"DM on Action",value:s.dmOnAction?"Yes":"No",inline:true},
        {name:"Alert Channel",value:s.notifyChannel?`<#${s.notifyChannel}>`:"Mod log",inline:true},{name:"Alert Owner",value:s.alertOwner?"Yes":"No",inline:true},{name:"Lockdown",value:ld?`Active since <t:${Math.floor(ld.at/1000)}:R>`:"Not active",inline:true},
        {name:"Whitelisted Roles",value:s.whitelistedRoles?.length?s.whitelistedRoles.map(r=>`<@&${r}>`).join(", "):"None"},
        {name:"Whitelisted Users",value:s.whitelistedUsers?.length?s.whitelistedUsers.map(u=>`<@${u}>`).join(", "):"None"},
        {name:"Recent Joins",value:t?`${t.joins.length}`:"0",inline:true},
      ).setTimestamp()]});
  }
  return respond(msg,{embeds:[E.brand("🛡️ Anti-Raid v3").setDescription(`**${s.enabled?"🟢 Active":"🔴 Disabled"}** | Action: **${s.action}** | ${s.threshold} joins/${s.window/1000}s`)
    .addFields({name:"Commands",value:`\`enable\` \`disable\` \`status\` \`unlock\` \`reset\` \`config <param> <val>\``})]});
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANTI-NUKE v3
// ═══════════════════════════════════════════════════════════════════════════

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
  let action="none";
  try {
    if(s.action==="ban")          { await member.ban({reason:`Anti-Nuke: ${reason}`}); action="Banned"; }
    else if(s.action==="kick")    { await member.kick(`Anti-Nuke: ${reason}`); action="Kicked"; }
    else if(s.action==="strip_roles"){ for(const[,r]of member.roles.cache.filter(r=>r.id!==guild.id&&r.manageable)) await member.roles.remove(r).catch(()=>{}); action="Roles Stripped"; }
    await member.user.send({content:`🚨 **${guild.name}** — Anti-Nuke: You were **${action}**.\nReason: ${reason}`}).catch(()=>{});
  } catch {}
  if(s.lockOnTrigger){ for(const[,ch]of guild.channels.cache.filter(c=>c.type===ChannelType.GuildText)) await ch.permissionOverwrites.edit(guild.roles.everyone,{SendMessages:false}).catch(()=>{}); }
  if(s.alertOwner){ const o=await guild.fetchOwner().catch(()=>null); if(o)await o.send({content:`🚨 Anti-Nuke triggered in **${guild.name}**! User: **${member.user.tag}** | Reason: ${reason}`}).catch(()=>{}); }
  const id=s.notifyChannel||data.modLogChannels[guild.id]; if(!id)return;
  const ch=await guild.channels.fetch(id).catch(()=>null); if(!ch?.isTextBased())return;
  await ch.send({embeds:[new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🚨 ANTI-NUKE TRIGGERED").setDescription(`**${member.user.tag}** → **${action}**\nReason: ${reason}`).setTimestamp()]}).catch(()=>{});
}

async function handleAntiNuke(msg, args) {
  if(!isAdmin(msg.member)) return respond(msg,{embeds:[E.error("No Permission").setDescription("Admin only.")]});
  const sub=(args[0]||"").toLowerCase(), s=getAntiNuke(msg.guild.id);

  if(sub==="enable"){  s.enabled=true;  saveData(); return respond(msg,{embeds:[E.success("🛡️ Anti-Nuke v3 Enabled").addFields({name:"Thresholds",value:`Ch:${s.channelDeleteThreshold} Ban:${s.banThreshold} Role:${s.roleDeleteThreshold} Hook:${s.webhookDeleteThreshold} Kick:${s.kickThreshold}`},{name:"Action",value:s.action,inline:true},{name:"Window",value:`${s.window/1000}s`,inline:true}).setTimestamp()]}); }
  if(sub==="disable"){ s.enabled=false; saveData(); return respond(msg,{embeds:[E.warn("🛡️ Anti-Nuke Disabled")]}); }

  if(sub==="config"){
    const p=(args[1]||"").toLowerCase(), v=args[2];
    const thMap={channels:"channelDeleteThreshold",bans:"banThreshold",roles:"roleDeleteThreshold",webhooks:"webhookDeleteThreshold",kicks:"kickThreshold"};
    if(thMap[p]){ const n=parseInt(v,10); if(!isFinite(n)||n<1)return respond(msg,{embeds:[E.error("Invalid number.")]}); s[thMap[p]]=n; saveData(); return respond(msg,{embeds:[E.success(`✅ ${p} threshold → **${n}**`)]}); }
    const cfgMap={
      window:      ()=>{ const n=parseInt(v,10)*1000; if(!isFinite(n)||n<1000)return"Invalid"; s.window=n; return`Window: **${v}s**`; },
      action:      ()=>{ if(!["ban","kick","strip_roles"].includes(v))return"ban|kick|strip_roles"; s.action=v; return`Action: **${v}**`; },
      alertchannel:()=>{ const id=parseChannelId(v); s.notifyChannel=id||null; return id?`<#${id}>`:"Cleared"; },
      locktrigger: ()=>{ s.lockOnTrigger=v==="on"; return`Lock on trigger: **${v}**`; },
      alertowner:  ()=>{ s.alertOwner=v==="on"; return`Alert owner: **${v}**`; },
      trustrole:   ()=>{ const id=parseRoleId(v); if(!id)return"Invalid"; const i=s.trustedRoles.indexOf(id); i===-1?s.trustedRoles.push(id):s.trustedRoles.splice(i,1); return i===-1?`<@&${id}> trusted`:`<@&${id}> removed`; },
      trustuser:   ()=>{ const id=parseUserId(v); if(!id)return"Invalid"; const i=s.trustedUsers.indexOf(id); i===-1?s.trustedUsers.push(id):s.trustedUsers.splice(i,1); return i===-1?`<@${id}> trusted`:`<@${id}> removed`; },
    };
    if(cfgMap[p]){ const r=cfgMap[p](); saveData(); return respond(msg,{embeds:[E.success(`✅ Anti-Nuke — ${p}`).setDescription(r)]}); }
    return respond(msg,{embeds:[E.info("⚙️ Anti-Nuke Config Options").addFields(
      {name:"Thresholds",value:"`channels` `bans` `roles` `webhooks` `kicks` — each takes a number"},
      {name:"Settings",value:"`window <secs>` `action <ban|kick|strip_roles>` `alertchannel <#>` `locktrigger <on|off>` `alertowner <on|off>` `trustrole <@>` `trustuser <@>`"},
    )]});
  }
  if(sub==="status"){
    return respond(msg,{embeds:[E.info("🛡️ Anti-Nuke Status v3").setDescription(`**${s.enabled?"🟢 Active":"🔴 Disabled"}**`).addFields(
      {name:"Channel Del",value:`${s.channelDeleteThreshold}`,inline:true},{name:"Bans",value:`${s.banThreshold}`,inline:true},{name:"Role Del",value:`${s.roleDeleteThreshold}`,inline:true},
      {name:"Webhooks",value:`${s.webhookDeleteThreshold}`,inline:true},{name:"Kicks",value:`${s.kickThreshold}`,inline:true},{name:"Window",value:`${s.window/1000}s`,inline:true},
      {name:"Action",value:s.action,inline:true},{name:"Lock on Trigger",value:s.lockOnTrigger?"Yes":"No",inline:true},{name:"Alert Owner",value:s.alertOwner?"Yes":"No",inline:true},
      {name:"Trusted Roles",value:s.trustedRoles?.length?s.trustedRoles.map(r=>`<@&${r}>`).join(", "):"None"},
      {name:"Trusted Users",value:s.trustedUsers?.length?s.trustedUsers.map(u=>`<@${u}>`).join(", "):"None"},
    ).setTimestamp()]});
  }
  return respond(msg,{embeds:[E.brand("🛡️ Anti-Nuke v3").setDescription(`**${s.enabled?"🟢 Active":"🔴 Disabled"}**`).addFields({name:"Commands",value:"`enable` `disable` `status` `config <param> <val>`"})]});
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVIEW CONFIG SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

async function handleReviewConfig(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild)) return respond(msg,{embeds:[E.error("No Permission")]});
  const sub=(args[0]||"").toLowerCase(), c=getReviewCfg(msg.guild.id);

  if(!sub||sub==="status") return respond(msg,{embeds:[E.info("⭐ Review Config").addFields(
    {name:"Enabled",      value:c.enabled?"Yes":"No",    inline:true},{name:"Rating Range", value:`${c.minRating}–${c.maxRating}`,inline:true},{name:"Min Length",  value:`${c.minLength} chars`,inline:true},
    {name:"Require Type", value:c.requireType?"Yes":"No",inline:true},{name:"Require Order",value:c.requireOrder?"Yes":"No",inline:true},{name:"Auto-Post",   value:c.autoPost?"Yes":"No",inline:true},
    {name:"DM Confirm",   value:c.dmConfirm?"Yes":"No",  inline:true},{name:"Ping Role",    value:c.pingRole?`<@&${c.pingRole}>`:"None",inline:true},{name:"Cooldown",    value:fmtDuration(c.cooldownMs),inline:true},
    {name:"Allowed Types",value:c.allowedTypes?.length?c.allowedTypes.join(", "):"All"},
    {name:"Blocked Words",value:c.blockedWords?.length?c.blockedWords.join(", "):"None"},
  ).setTimestamp()]});

  const cmds={
    enable:      ()=>{ c.enabled=true;  return"Reviews enabled ✅"; },
    disable:     ()=>{ c.enabled=false; return"Reviews disabled ⚠️"; },
    channel:     ()=>{ const id=parseChannelId(args[1]); c.channelId=id||null; getSettings(msg.guild.id).reviewsChannelId=id; return id?`Channel → <#${id}>`:"Cleared"; },
    pingrole:    ()=>{ const id=parseRoleId(args[1]); c.pingRole=id||null; return id?`Ping role: <@&${id}>`:"Cleared"; },
    minlength:   ()=>{ const n=parseInt(args[1],10); if(!isFinite(n)||n<0)return null; c.minLength=n; return`Min length: **${n}**`; },
    requiretype: ()=>{ c.requireType=args[1]==="on"; return`Require type: **${args[1]}**`; },
    requireorder:()=>{ c.requireOrder=args[1]==="on"; return`Require order: **${args[1]}**`; },
    autopost:    ()=>{ c.autoPost=args[1]!=="off"; return`Auto-post: **${c.autoPost?"on":"off"}**`; },
    dmconfirm:   ()=>{ c.dmConfirm=args[1]==="on"; return`DM confirm: **${args[1]}**`; },
    cooldown:    ()=>{ const ms=parseDuration(args[1]); if(!ms)return null; c.cooldownMs=ms; return`Cooldown: **${fmtDuration(ms)}**`; },
    ratingrange: ()=>{ const a=parseInt(args[1],10),b=parseInt(args[2],10); if(!isFinite(a)||!isFinite(b)||a>=b)return null; c.minRating=a;c.maxRating=b; return`Range: **${a}–${b}**`; },
    addtype:     ()=>{ const t=args.slice(1).join(" ").trim(); if(!t)return null; if(!c.allowedTypes.includes(t))c.allowedTypes.push(t); return`Added type: **${t}**`; },
    removetype:  ()=>{ const t=args.slice(1).join(" ").trim(); c.allowedTypes=c.allowedTypes.filter(x=>x!==t); return`Removed: **${t}**`; },
    blockword:   ()=>{ const w=args[1]?.toLowerCase(); if(!w)return null; if(!c.blockedWords.includes(w))c.blockedWords.push(w); return`Blocked: **${w}**`; },
    unblockword: ()=>{ const w=args[1]?.toLowerCase(); c.blockedWords=c.blockedWords.filter(x=>x!==w); return`Unblocked: **${w}**`; },
    color:       ()=>{ const h=(args[1]||"").replace("#",""); if(!/^[0-9A-Fa-f]{6}$/.test(h))return null; c.embedColor=parseInt(h,16); return`Color: **#${h}**`; },
    showavatar:  ()=>{ c.showAvatar=args[1]==="on"; return`Show avatar: **${args[1]}**`; },
  };

  if(cmds[sub]){ const r=cmds[sub](); if(r===null)return respond(msg,{embeds:[E.error("Invalid value")]}); saveData(); return respond(msg,{embeds:[E.success(`⭐ Review Config — ${sub}`).setDescription(r)]}); }

  return respond(msg,{embeds:[E.info("⭐ Review Config Commands").addFields(
    {name:"Toggle",     value:"`enable` `disable`"},
    {name:"Channel",    value:"`channel <#ch>` `pingrole <@role>`"},
    {name:"Validation", value:"`minlength <n>` `requiretype <on|off>` `requireorder <on|off>` `ratingrange <min> <max>`"},
    {name:"Behavior",   value:"`autopost <on|off>` `dmconfirm <on|off>` `showavatar <on|off>` `cooldown <time>` `color <hex>`"},
    {name:"Types/Words",value:"`addtype <type>` `removetype <type>` `blockword <word>` `unblockword <word>`"},
    {name:"Info",       value:"`status`"},
  )]});
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

async function openTicket(interaction_or_channel, member, ticketType, formAnswers) {
  const guild = interaction_or_channel.guild || member.guild;
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

  // AI greeting — fully autonomous
  setImmediate(async()=>{
    try {
      const aiPrompt=`A new ${ticketType} ticket just opened:\n\n${formCtx}\n\nGreet the user warmly, address their ${ticketType} request directly, and resolve it completely on your own. 💗`;
      const {text,model}=await callTicketAI(created.id,aiPrompt,ticketType,formCtx);
      if(text) await created.send({content:`${text}${aiFooter(model,member.user.username)}`,allowedMentions:{users:[]}});
    } catch(err){ console.error("[TicketAI]",err.message); }
  });

  // Partnership — member count gate + AI-guided ad collection
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
        const prompt=`Partnership application approved! Details: Server=${formAnswers.serverName}, Members=${count} (${tier}), Focus=${formAnswers.focus}, Offering=${formAnswers.offering}. Ask them to send their server ad text and optionally a banner image. Be warm and exciting. 💗`;
        const {text,model}=await callTicketAI(created.id,prompt,"partnership",formCtx);
        if(text) await created.send({content:`${text}${aiFooter(model,"Snuggles AI")}`,allowedMentions:{users:[]}});
      } catch(err){ console.error("[PartnerAI]",err.message); }
    });
  }
  return {ok:true,channel:created};
}

// ─── Ticket close ─────────────────────────────────────────────────────────────
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
    ...msgs.map(m=>`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content||""}${m.embeds.length?` [${m.embeds.length} embed(s)]`:""}${m.attachments.size?` [${m.attachments.size} attachment(s)]`:""}`)
  ].join("\n");
  const file={attachment:Buffer.from(transcript,"utf8"),name:`${channel.name}-transcript.txt`};
  const s=getSettings(guild.id); const tcId=s.transcriptsChannelId||data.modLogChannels[guild.id];
  if(tcId){const tc=await guild.channels.fetch(tcId).catch(()=>null);if(tc?.isTextBased())await tc.send({embeds:[E.brand("🎟️ Ticket Closed").addFields({name:"Channel",value:`#${channel.name}`},{name:"Closed By",value:closer.user?.tag||closer.tag,inline:true},{name:"Reason",value:reason,inline:true}).setTimestamp()],files:[file]}).catch(()=>{});}
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
    if(active.length>10) emb.addFields({name:`+${active.length-10} more`,value:"Use `s!orderinfo <id>`"});
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

const STICKY_TEXT="✨ **Want to leave a review?**\n\nUse `s!review <1-5> <type> | <your message>` to share your experience!\n**Example:** `s!review 5 Custom Script | Fast delivery and clean code!`\n\nYour feedback means the world to us 💗";

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
//  COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

// ─── MUSIC ────────────────────────────────────────────────────────────────────

async function handlePlay(msg, args) {
  try { require("@discordjs/voice"); } catch { return respond(msg,{embeds:[E.error("Music Unavailable").setDescription("Install:\n```\nnpm install @discordjs/voice @distube/ytdl-core ytsr libsodium-wrappers\n```")]}); }
  if(!msg.member?.voice?.channelId) return respond(msg,{embeds:[E.error("❌ Join a voice channel first!")]});
  const query=args.join(" ").trim();
  if(!query) return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}play <song, URL, Spotify, Apple Music>\``)]});
  await msg.channel.sendTyping().catch(()=>{});
  const tracks=await resolveQuery(query);
  if(!tracks?.length) return respond(msg,{embeds:[E.error("No results found.")]});
  const m=getGuildMusic(msg.guild.id);
  m.textChannel=msg.channel; m.queue.push(...tracks);
  if(!m.connection){
    try {
      const {joinVoiceChannel,createAudioPlayer,AudioPlayerStatus}=require("@discordjs/voice");
      const vc=msg.member.voice.channel;
      const conn=joinVoiceChannel({channelId:vc.id,guildId:msg.guild.id,adapterCreator:msg.guild.voiceAdapterCreator,selfDeaf:true});
      m.connection=conn;
      const player=createAudioPlayer(); m.player=player; conn.subscribe(player);
      player.on(AudioPlayerStatus.Idle,()=>playNextTrack(msg.guild.id));
      player.on("error",err=>{console.error("[Music]",err.message);playNextTrack(msg.guild.id);});
      await playNextTrack(msg.guild.id);
    } catch(err) { return respond(msg,{embeds:[E.error("Voice Error").setDescription(err.message)]}); }
  }
  return respond(msg,{embeds:[E.music("🎵 Added to Queue").setDescription(tracks.slice(0,5).map(t=>`• ${t.title}`).join("\n")+(tracks.length>5?`\n+${tracks.length-5} more`:""  )).addFields({name:"Source",value:tracks[0].source||"—",inline:true},{name:"Queue",value:`${m.queue.length} track(s)`,inline:true}).setTimestamp()]});
}

async function handleSkip(msg) {
  const m=getGuildMusic(msg.guild.id);
  if(!m.player||!m.current) return respond(msg,{embeds:[E.warn("Nothing playing.")]});
  m.player.stop();
  return respond(msg,{embeds:[E.success("⏭️ Skipped!")]});
}

async function handleStop(msg) {
  const m=getGuildMusic(msg.guild.id);
  m.queue=[];m.current=null;m.loop=false;
  m.player?.stop(); m.connection?.destroy(); m.connection=null; m.player=null;
  guildMusic.delete(msg.guild.id);
  return respond(msg,{embeds:[E.success("⏹️ Stopped & left voice channel.")]});
}

async function handleQueue(msg) {
  const m=getGuildMusic(msg.guild.id);
  const emb=E.music("🎵 Music Queue");
  if(m.current) emb.addFields({name:"🎧 Now Playing",value:m.current.title});
  emb.setDescription(m.queue.length?m.queue.slice(0,10).map((t,i)=>`**${i+1}.** ${t.title}`).join("\n"):"Queue is empty.");
  if(m.queue.length>10) emb.setFooter({text:`+${m.queue.length-10} more tracks`});
  return respond(msg,{embeds:[emb]});
}

async function handleVolume(msg, args) {
  const v=parseInt(args[0],10);
  if(!isFinite(v)||v<0||v>100) return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}volume <0-100>\``)]});
  const m=getGuildMusic(msg.guild.id); m.volume=v/100;
  try{m.player?.state?.resource?.volume?.setVolume(m.volume);}catch{}
  return respond(msg,{embeds:[E.success(`🔊 Volume → **${v}%**`)]});
}

async function handleLofi(msg) {
  return respond(msg,{embeds:[E.music("🎵 24/7 Lofi Radio").setDescription(`Chill lofi music plays 24/7 in <#${LOFI_VC_CHANNEL_ID}>!\n\n**Now Playing:** ${lofiCurrentTrack?.title||"Starting..."}\n\nJoin and vibe! 🎧💗`).setTimestamp()]});
}

// ─── IMAGINE ──────────────────────────────────────────────────────────────────

const IMAGE_STYLES_LIST = Object.keys(IMG_STYLES).join(", ");

async function handleImagine(msg, args) {
  const wait=checkCD("imagine",msg.author.id);
  if(wait>0) return respond(msg,{embeds:[E.warn("⏰ Cooldown").setDescription(`Generate again in **${wait}s**.`)]});

  const raw=args.join(" ").trim();
  const styleMatch=raw.match(/--style\s+(\w+)/i);
  const style=styleMatch?styleMatch[1].toLowerCase():null;
  const prompt=raw.replace(/--style\s+\w+/i,"").trim();

  if(!prompt) return respond(msg,{embeds:[E.warn("Usage").setDescription(
    `\`${PREFIX}imagine <description> [--style <style>]\`\n\n**Styles:** ${IMAGE_STYLES_LIST}\n\n**Examples:**\n• \`${PREFIX}imagine a cozy cabin in snowy woods\`\n• \`${PREFIX}imagine dragon breathing fire --style anime\``
  )]});

  if(style&&!IMG_STYLES[style]) return respond(msg,{embeds:[E.error(`Unknown style: \`${style}\`\n\nAvailable: ${IMAGE_STYLES_LIST}`)]});

  useCD("imagine",msg.author.id);
  const statusMsg=await respond(msg,{embeds:[E.img("🖼️ Generating Image…").setDescription(`**Prompt:** ${prompt.slice(0,100)}${style?`\n**Style:** ${style}`:""}\n\n⏳ This may take a few seconds…`)]});

  try {
    await msg.channel.sendTyping().catch(()=>{});
    const enhanced=await enhanceImagePrompt(`${prompt}${style?`, ${IMG_STYLES[style]}`:""}`);
    const {buffer,ext,source}=await generateImage(enhanced,style);
    const attachment=new AttachmentBuilder(buffer,{name:`snuggles-ai-${Date.now()}.${ext}`});
    data.stats.imagesGenerated=(data.stats.imagesGenerated||0)+1; saveData();
    const resultEmbed=new EmbedBuilder().setColor(IMG_COLOR).setTitle("🎨 Image Generated!")
      .setDescription(`**Prompt:** ${prompt}${style?`\n**Style:** \`${style}\``:""}\n\n*Enhanced with AI for better quality*`)
      .setImage(`attachment://snuggles-ai-${Date.now()}.${ext}`)
      .addFields({name:"🔧 Engine",value:source,inline:true},{name:"📐 Resolution",value:"1024×1024",inline:true},{name:"🎨 Format",value:ext.toUpperCase(),inline:true})
      .setFooter({text:`🤖 Snuggles AI • Image Generation • requested by ${msg.author.username}`})
      .setTimestamp();
    if(statusMsg) await statusMsg.delete().catch(()=>{});
    await msg.channel.send({embeds:[resultEmbed],files:[attachment]});
  } catch(err) {
    console.error("[ImgGen]",err.message);
    if(statusMsg) await statusMsg.delete().catch(()=>{});
    await respond(msg,{embeds:[E.error("Image Generation Failed").setDescription(`Could not generate image: \`${err.message}\`\n\nTry a different prompt or style.`)]});
  }
}

// ─── AI CHAT ──────────────────────────────────────────────────────────────────

const IMG_REQUEST_RE = /^(generate|draw|paint|create|make|design|imagine|show|render)\s/i;

async function handleAI(msg, args) {
  if(!GROQ_API_KEY) return msg.channel.send({content:"❌ No `GROQ_API_KEY` configured.",allowedMentions:{users:[]}});

  const prompt=args.join(" ").trim();
  if(!prompt) return msg.channel.send({content:`**🤖 Snuggles AI**\n\nUsage: \`${PREFIX}ai <message>\`\n\nAsk me anything — code, writing, math, ideas, analysis, or just chat!\n\nTip: Use \`${PREFIX}imagine\` to generate actual images 🎨`,allowedMentions:{users:[]}});

  if(IMG_REQUEST_RE.test(prompt)&&/image|picture|photo|artwork|illustration|drawing|painting|logo|banner/i.test(prompt)){
    return handleImagine(msg,args);
  }

  await msg.channel.sendTyping().catch(()=>{});

  const uid=msg.author.id;
  if(!userChatHistory.has(uid)) userChatHistory.set(uid,[]);
  const hist=userChatHistory.get(uid);
  hist.push({role:"user",content:prompt});
  while(hist.length>30) hist.shift();

  const {text,model}=await callGroq(hist,AI_CHAT_SYSTEM,{maxTokens:1500,temperature:0.75});

  if(!text) return msg.channel.send({content:"❌ AI is currently busy. Try again in a moment.",allowedMentions:{users:[]}});

  hist.push({role:"assistant",content:text});
  const footer=aiFooter(model,msg.author.username);

  const chunks=[]; let rem=text;
  while(rem.length>0){chunks.push(rem.slice(0,1900));rem=rem.slice(1900);}
  for(let i=0;i<chunks.length;i++){
    const isLast=i===chunks.length-1;
    await msg.channel.send({content:`${chunks[i]}${isLast?footer:""}`,allowedMentions:{users:[]}});
  }
}

async function handleAIReset(msg) {
  userChatHistory.delete(msg.author.id);
  return respond(msg,{embeds:[E.success("✅ AI Memory Cleared").setDescription("Your conversation history has been reset.")]});
}

async function handleAIToggle(msg, args, cmd) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageMessages)) return respond(msg,{embeds:[E.error("Staff only.")]});
  if(!msg.channel.name?.startsWith("ticket-")) return respond(msg,{embeds:[E.warn("Only works in ticket channels.")]});
  if(cmd==="aioff"){ticketAIOff.add(msg.channel.id);return msg.channel.send({content:"🔇 Ticket AI turned **off** for this ticket.",allowedMentions:{users:[]}});}
  else{ticketAIOff.delete(msg.channel.id);return msg.channel.send({content:"🔊 Ticket AI turned **on** for this ticket.",allowedMentions:{users:[]}});}
}

// ─── HELP ─────────────────────────────────────────────────────────────────────

async function handleHelp(msg, args) {
  const sub=(args[0]||"").toLowerCase();
  const cats={
    general:  {e:"📌",n:"General",cmds:[{n:"help [cat]",d:"Show this menu"},{n:"info",d:"Bot information"},{n:"ping",d:"Latency check"},{n:"status",d:"Systems overview"},{n:"rules",d:"Server rules"},{n:"uptime",d:"Bot uptime"},{n:"ai <msg>",d:"Chat with Snuggles AI"},{n:"ai reset",d:"Clear AI memory"},{n:"imagine <prompt>",d:"Generate an AI image"},{n:"aioff / aion",d:"Toggle AI in tickets (staff)"}]},
    music:    {e:"🎵",n:"Music",cmds:[{n:"play <song|URL>",d:"Play from YouTube, Spotify, Apple Music"},{n:"skip",d:"Skip current track"},{n:"stop",d:"Stop & leave VC"},{n:"queue",d:"View queue"},{n:"volume <0-100>",d:"Set volume"},{n:"pause / resume",d:"Pause or resume"},{n:"loop",d:"Toggle loop mode"},{n:"lofi",d:"24/7 lofi radio info"}]},
    commissions:{e:"💼",n:"Commissions",cmds:[{n:"services",d:"What we offer"},{n:"prices",d:"Pricing & payment"},{n:"pay",d:"Payment details"},{n:"orderinfo <id>",d:"Check order status"},{n:"discount",d:"Check loyalty discount"},{n:"ticket",d:"How to open a ticket"}]},
    portfolio:{e:"🎨",n:"Portfolio",cmds:[{n:"work [page]",d:"Browse portfolio"},{n:"addwork <url> [title]",d:"Add entry (staff)"},{n:"removework <id>",d:"Remove entry (staff)"}]},
    scripting:{e:"🔧",n:"Scripting",cmds:[{n:"script <type>",d:"Example scripts"},{n:"snippet",d:"Random Lua snippet"},{n:"docs",d:"Documentation links"},{n:"debug",d:"Debug template"},{n:"tip",d:"Scripting tip"}]},
    leveling: {e:"📊",n:"Leveling & Economy",cmds:[{n:"level [user]",d:"Level & XP"},{n:"rank [user]",d:"Detailed stats card"},{n:"leaderboard",d:"Top 10 leaderboard"},{n:"balance [user]",d:"Coin balance"},{n:"dowork",d:"Earn coins (1hr cooldown)"},{n:"daily",d:"Claim daily reward"},{n:"shop",d:"Coin shop"},{n:"buy <id>",d:"Purchase an item"}]},
    fun:      {e:"🎉",n:"Fun & Games",cmds:[{n:"quote",d:"Motivational quote"},{n:"meme",d:"Random wholesome meme"},{n:"8ball <q>",d:"Magic 8-ball"},{n:"rate <thing>",d:"Rate 0–10"},{n:"coinflip",d:"Flip a coin"},{n:"roll [max]",d:"Roll a dice"},{n:"rps <choice>",d:"Rock paper scissors"},{n:"trivia",d:"Scripting trivia"},{n:"remindme <t> | <msg>",d:"Set reminder"},{n:"color <hex>",d:"Preview hex color"},{n:"calc <expr>",d:"Calculator"}]},
    info:     {e:"ℹ️",n:"Info",cmds:[{n:"userinfo [user]",d:"User details"},{n:"serverinfo",d:"Server details"},{n:"avatar [user]",d:"Avatar"},{n:"banner [user]",d:"Profile banner"},{n:"servericon",d:"Server icon"},{n:"stats",d:"Bot statistics"},{n:"invites [user]",d:"Invite count"},{n:"inviteleaderboard",d:"Top inviters"}]},
    reviews:  {e:"⭐",n:"Reviews",cmds:[{n:"review <1-5> <type> | <msg>",d:"Submit a review"},{n:"vouch <text>",d:"Quick vouch"},{n:"reviewconfig",d:"Review settings (admin)"}]},
    mod:      {e:"🔨",n:"Moderation",cmds:[{n:"ban @user <reason>",d:"Ban"},{n:"kick @user [reason]",d:"Kick"},{n:"mute @user <time> [reason]",d:"Timeout"},{n:"warn @user <reason>",d:"Warn"},{n:"warns @user",d:"View warnings"},{n:"unwarn <id>",d:"Remove warning"},{n:"purge <1-100>",d:"Bulk delete"},{n:"lock / unlock",d:"Lock/unlock channel"},{n:"slowmode <secs>",d:"Set slowmode"},{n:"nick @user [name]",d:"Set nickname"}]},
    admin:    {e:"⚙️",n:"Admin",cmds:[{n:"announce [#ch] <msg>",d:"Announcement"},{n:"partner <format>",d:"Post partnership"},{n:"poll <q> | <a1> | ...",d:"Reaction poll"},{n:"giveaway <t> | <prize>",d:"Start giveaway"},{n:"embed <title> | <body>",d:"Custom embed"},{n:"addorder @u <details>",d:"Add order"},{n:"updateorder <id> <status>",d:"Update order status"},{n:"complete <id>",d:"Mark order complete"},{n:"blacklist @user",d:"Toggle blacklist"},{n:"setlog [#ch]",d:"Set mod log"},{n:"setreviews [#ch]",d:"Set reviews channel"},{n:"settranscripts [#ch]",d:"Set transcripts"},{n:"ticketpanel",d:"Post ticket panel"},{n:"ticketrole add/remove/list",d:"Manage ticket staff roles"},{n:"ticketconfig",d:"Ticket settings"},{n:"close <reason>",d:"Close a ticket"},{n:"addnote <text>",d:"Staff note in ticket"},{n:"givecoins @u <amt>",d:"Give coins to user"},{n:"say <msg>",d:"Send as bot"},{n:"antiraid ...",d:"Anti-Raid v3 system"},{n:"antinuke ...",d:"Anti-Nuke v3 system"},{n:"reviewconfig ...",d:"Review config system"}]},
  };

  if(sub&&cats[sub]){
    const c=cats[sub];
    return respond(msg,{embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`${c.e} ${c.n} Commands`)
      .setDescription(c.cmds.map(x=>`\`${PREFIX}${x.n}\`\n↳ ${x.d}`).join("\n\n"))
      .setFooter({text:`${BOT_NAME} v${BOT_VERSION} • s!help for all categories`}).setTimestamp()]});
  }

  return respond(msg,{embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`🧸 ${BOT_NAME} — Help`)
    .setDescription(`**Prefix:** \`${PREFIX}\` | **Version:** v${BOT_VERSION} | **AI:** ${GROQ_API_KEY?"✅ Groq":"❌ Disabled"}\n\nUse \`${PREFIX}help <category>\` for detailed commands.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    .addFields(Object.entries(cats).map(([k,c])=>({name:`${c.e} ${c.n}`,value:`\`${PREFIX}help ${k}\` — ${c.cmds.length} commands`,inline:true})))
    .addFields({name:"\u200b",value:"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"},{name:"🎫 Open a Ticket",value:"Use the ticket panel!",inline:true},{name:`🎵 24/7 Lofi`,value:`<#${LOFI_VC_CHANNEL_ID}>`,inline:true},{name:"🖼️ AI Images",value:`\`${PREFIX}imagine <prompt>\``,inline:true})
    .setFooter({text:`${BOT_NAME} v${BOT_VERSION} • Made with 💗 by ${BOT_OWNER}`}).setTimestamp()]});
}

// ─── INFO / GENERAL ────────────────────────────────────────────────────────────

async function handleInfo(msg) {
  const up=process.uptime(),h=Math.floor(up/3600),m=Math.floor((up%3600)/60),s=Math.floor(up%60);
  return respond(msg,{embeds:[E.brand(`🧸 ${BOT_NAME} v${BOT_VERSION}`)
    .setDescription("Feature-rich AI-powered scripting services bot.")
    .addFields(
      {name:"🤖 Tag",       value:client.user?.tag||"—",                           inline:true},
      {name:"📦 Version",   value:`v${BOT_VERSION}`,                               inline:true},
      {name:"👑 Owner",     value:BOT_OWNER,                                       inline:true},
      {name:"📚 Library",   value:"discord.js v14",                                inline:true},
      {name:"⚙️ Node.js",  value:process.version,                                 inline:true},
      {name:"🌐 Servers",   value:`${client.guilds.cache.size}`,                   inline:true},
      {name:"⏱️ Uptime",   value:`${h}h ${m}m ${s}s`,                            inline:true},
      {name:"📋 Orders",    value:`${data.orders.length}`,                         inline:true},
      {name:"⭐ Reviews",   value:`${data.reviews.length}`,                        inline:true},
      {name:"🖼️ Images",   value:`${data.stats.imagesGenerated||0} generated`,    inline:true},
      {name:"🤖 AI",        value:GROQ_API_KEY?"✅ Groq Enabled":"❌ Disabled",     inline:true},
      {name:"🖼️ Img Engine",value:STABILITY_API_KEY?"Stability AI":OPENAI_API_KEY?"DALL-E 3":"Pollinations (free)",inline:true},
      {name:"🎵 Lofi",      value:lofiCurrentTrack?`▶️ ${lofiCurrentTrack.title}`:"Starting…",inline:true},
    ).setTimestamp()]});
}

async function handleStatus(msg) {
  const ping=Math.max(0,Math.round(client.ws.ping));
  const sent=await msg.channel.send({embeds:[E.info("🔍 Checking…")]});
  const apiMs=sent.createdTimestamp-msg.createdTimestamp;
  await sent.edit({embeds:[E.success("🟢 All Systems Operational")
    .addFields(
      {name:"🤖 Bot",      value:"🟢 Online",                                        inline:true},
      {name:"📡 Gateway",  value:`${ping}ms`,                                        inline:true},
      {name:"🌐 API",      value:`${apiMs}ms`,                                       inline:true},
      {name:"📋 Orders",   value:`🟢 ${data.orders.filter(o=>o.status!=="completed").length} active`,inline:true},
      {name:"📊 Leveling", value:`🟢 ${Object.keys(data.leveling).length} users`,    inline:true},
      {name:"💰 Economy",  value:`🟢 ${Object.keys(data.economy).length} accounts`,  inline:true},
      {name:"🤖 AI",       value:GROQ_API_KEY?"🟢 Groq Ready":"🔴 No key",           inline:true},
      {name:"🖼️ ImgGen",  value:STABILITY_API_KEY?"🟢 Stability AI":OPENAI_API_KEY?"🟢 DALL-E 3":"🟡 Pollinations (free)",inline:true},
      {name:"🎵 Lofi VC",  value:lofiCurrentTrack?`🟢 ${lofiCurrentTrack.title}`:"🟡 Starting",inline:true},
    ).setTimestamp()]});
}

// ─── ORDER COMMANDS ────────────────────────────────────────────────────────────

async function handleOrderInfo(msg, args) {
  if(!args[0]) return respond(msg,{embeds:[E.error("Usage").setDescription(`\`${PREFIX}orderinfo <id>\``)]});
  const o=findOrder(args[0]); if(!o)return respond(msg,{embeds:[E.error("Order not found.")]});
  const si=getOrderStatus(o.status);
  const emb=new EmbedBuilder().setColor(si.color).setTitle(`📦 Order #${o.id}`)
    .addFields({name:"📊 Status",value:si.label,inline:true},{name:"👤 Customer",value:`<@${o.userId}>`,inline:true},{name:"📝 Details",value:o.details},{name:"📅 Created",value:`<t:${Math.floor(new Date(o.createdAt).getTime()/1000)}:f>`,inline:true},{name:"🔄 Updated",value:`<t:${Math.floor(new Date(o.updatedAt).getTime()/1000)}:R>`,inline:true});
  if(o.note)emb.addFields({name:"📋 Note",value:o.note});
  return respond(msg,{embeds:[emb.setTimestamp()]});
}

async function handleUpdateOrder(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageMessages)) return respond(msg,{embeds:[E.error("No Permission")]});
  const [id,status,...rest]=args; const note=rest.join(" ").trim()||null;
  if(!id||!status) return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}updateorder <id> <status> [note]\`\n\nStatuses: ${Object.keys(ORDER_STATUSES).join(", ")}`)]});
  const o=findOrder(id); if(!o)return respond(msg,{embeds:[E.error("Order not found.")]});
  const newSt=status.toLowerCase().replace(/-/g,"_"); if(!ORDER_STATUSES[newSt])return respond(msg,{embeds:[E.error("Invalid status.")]});
  const old=o.status; o.status=newSt; o.updatedAt=new Date().toISOString(); if(note)o.note=note;
  if(newSt==="completed")data.stats.ordersCompleted=(data.stats.ordersCompleted||0)+1;
  saveData(); updateOrderBoard().catch(()=>{});
  const si=getOrderStatus(newSt);
  await respond(msg,{embeds:[new EmbedBuilder().setColor(si.color).setTitle(`✅ Order #${o.id} Updated`).addFields({name:"Old",value:getOrderStatus(old).label,inline:true},{name:"New",value:si.label,inline:true},{name:"Customer",value:`<@${o.userId}>`,inline:true}).setTimestamp()]});
  try{const u=await client.users.fetch(o.userId);await u.send({embeds:[new EmbedBuilder().setColor(si.color).setTitle(`📦 Order #${o.id} Updated`).setDescription(`Status → **${si.label}**${note?`\n\n**Note:** ${note}`:""}`).setTimestamp()]});}catch{}
}

async function handleAddOrder(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  const uid=parseUserId(args[0]); if(!uid)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}addorder @user <details>\``)]});
  const details=args.slice(1).join(" ").trim(); if(!details)return respond(msg,{embeds:[E.error("Provide details.")]});
  const now=new Date().toISOString();
  const o={id:data.nextOrderId++,userId:uid,details,status:"not_started",createdAt:now,updatedAt:now,createdBy:msg.author.id,note:null};
  data.orders.push(o); data.stats.ordersCreated=(data.stats.ordersCreated||0)+1; saveData(); updateOrderBoard().catch(()=>{});
  return respond(msg,{embeds:[E.success(`✅ Order #${o.id} Created`).addFields({name:"Customer",value:`<@${uid}>`},{name:"Details",value:details}).setTimestamp()]});
}

async function handleComplete(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  const o=findOrder(args[0]); if(!o)return respond(msg,{embeds:[E.error("Not found.")]});
  if(o.status==="completed")return respond(msg,{embeds:[E.warn("Already completed.")]});
  o.status="completed";o.updatedAt=new Date().toISOString();data.stats.ordersCompleted=(data.stats.ordersCompleted||0)+1;saveData();updateOrderBoard().catch(()=>{});
  return respond(msg,{embeds:[E.success(`✅ Order #${o.id} Completed`).addFields({name:"Customer",value:`<@${o.userId}>`}).setTimestamp()]});
}

// ─── REVIEW ────────────────────────────────────────────────────────────────────

async function handleReview(msg, args) {
  const cfg=getReviewCfg(msg.guild.id);
  if(!cfg.enabled)return respond(msg,{embeds:[E.warn("Reviews Disabled")]});
  const raw=args.join(" "), pipe=raw.indexOf("|");
  if(pipe<0)return respond(msg,{embeds:[E.warn("Format").setDescription(`\`${PREFIX}review <${cfg.minRating}-${cfg.maxRating}> <type> | <message>\``)]});
  const left=raw.slice(0,pipe).trim().split(/\s+/), txt=raw.slice(pipe+1).trim();
  const rating=parseInt(left[0],10), type=left.slice(1).join(" ").trim();
  if(!isFinite(rating)||rating<cfg.minRating||rating>cfg.maxRating)return respond(msg,{embeds:[E.error(`Rating must be ${cfg.minRating}–${cfg.maxRating}`)]});
  if(cfg.requireType&&!type)return respond(msg,{embeds:[E.error("Commission type required.")]});
  if(cfg.allowedTypes?.length&&!cfg.allowedTypes.some(t=>type.toLowerCase().includes(t.toLowerCase())))return respond(msg,{embeds:[E.error(`Allowed types: ${cfg.allowedTypes.join(", ")}`)]});
  if(txt.length<cfg.minLength)return respond(msg,{embeds:[E.error(`Review must be at least ${cfg.minLength} characters.`)]});
  if(cfg.blockedWords?.some(w=>txt.toLowerCase().includes(w)))return respond(msg,{embeds:[E.error("Review contains a blocked word.")]});
  if(cfg.requireOrder&&!hasOrdered(msg.author.id))return respond(msg,{embeds:[E.error("You need a prior order to leave a review.")]});
  const ck=`review_guild:${msg.author.id}:${msg.guild.id}`,last=_cds.get(ck)||0;
  if(Date.now()-last<cfg.cooldownMs&&last!==0)return respond(msg,{embeds:[E.warn("⏰ Review Cooldown").setDescription(`Wait **${fmtDuration(cfg.cooldownMs-(Date.now()-last))}**`)]});
  _cds.set(ck,Date.now());
  const rev={id:data.nextReviewId++,userId:msg.author.id,username:msg.author.tag,commissionType:type,rating,message:txt,at:new Date().toISOString()};
  data.reviews.push(rev);data.stats.reviewsSubmitted=(data.stats.reviewsSubmitted||0)+1;saveData();
  const stars="⭐".repeat(rating)+"☆".repeat(cfg.maxRating-rating);
  const emb=new EmbedBuilder().setColor(cfg.embedColor||BRAND_COLOR).setTitle("⭐ New Review");
  if(cfg.showAvatar)emb.setThumbnail(msg.author.displayAvatarURL());
  emb.addFields({name:"👤 From",value:msg.author.tag,inline:true},{name:"🛠️ Commission",value:type||"—",inline:true},{name:"📊 Rating",value:`${stars} (${rating}/${cfg.maxRating})`},{name:"💬 Review",value:txt}).setTimestamp();
  const s=getSettings(msg.guild.id);const chId=cfg.channelId||s.reviewsChannelId;
  if(cfg.autoPost&&chId){
    const ch=await msg.guild.channels.fetch(chId).catch(()=>null);
    if(ch?.isTextBased()){
      await ch.send({content:cfg.pingRole?`<@&${cfg.pingRole}>`:undefined,embeds:[emb],allowedMentions:cfg.pingRole?{roles:[cfg.pingRole]}:{}});
      if(cfg.dmConfirm)await msg.author.send({embeds:[E.success("✅ Review Posted!").setDescription(`Your review was posted in <#${chId}>! Thank you 💗`)]}).catch(()=>{});
      return respond(msg,{embeds:[E.success("✅ Review Posted!").setDescription(`Posted in <#${chId}>! 💗`)]});
    }
  }
  return respond(msg,{embeds:[emb]});
}

// ─── ECONOMY ──────────────────────────────────────────────────────────────────

async function handleBalance(msg, args) {
  const uid=parseUserId(args[0])||msg.author.id;
  let user; try{user=await client.users.fetch(uid);}catch{return respond(msg,{embeds:[E.error("User not found.")]});}
  const eco=getEco(uid);
  return respond(msg,{embeds:[E.gold(`💰 Balance — ${user.username}`).setThumbnail(user.displayAvatarURL()).addFields({name:"💰 Coins",value:`${eco.coins||0} 🪙`,inline:true},{name:"🎒 Items",value:`${(eco.inventory||[]).length}`,inline:true}).setTimestamp()]});
}

async function handleWork(msg) {
  const w=checkCD("dowork",msg.author.id);
  if(w>0)return respond(msg,{embeds:[E.warn("⏰ Cooldown").setDescription(`Work again in **${fmtDuration(w*1000)}**.`)]});
  useCD("dowork",msg.author.id);
  const eco=getEco(msg.author.id);
  const job=WORK_RESPONSES[Math.floor(Math.random()*WORK_RESPONSES.length)];
  const earned=Math.floor(Math.random()*(job.coins[1]-job.coins[0]))+job.coins[0];
  eco.coins=(eco.coins||0)+earned; saveData();
  return respond(msg,{embeds:[E.success("💼 Work Complete!").setDescription(`> ${job.text}\n\n**+${earned} 🪙 coins**!`).addFields({name:"💰 Balance",value:`${eco.coins} 🪙`}).setTimestamp()]});
}

async function handleShop(msg) {
  return respond(msg,{embeds:[E.gold("🛒 Coin Shop").setDescription(`Use \`${PREFIX}buy <id>\` to purchase.`).addFields(SHOP_ITEMS.map(i=>({name:`${i.name} — ${i.price} 🪙`,value:`${i.desc}\n\`ID: ${i.id}\``}))).setTimestamp()]});
}

async function handleBuy(msg, args) {
  const id=(args[0]||"").toLowerCase(); if(!id)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}buy <item_id>\``)]});
  const item=SHOP_ITEMS.find(i=>i.id===id); if(!item)return respond(msg,{embeds:[E.error("Item not found.")]});
  const eco=getEco(msg.author.id);
  if((eco.coins||0)<item.price)return respond(msg,{embeds:[E.error("Not Enough Coins").setDescription(`Need **${item.price} 🪙**, have **${eco.coins||0} 🪙**.`)]});
  if((eco.inventory||[]).includes(id))return respond(msg,{embeds:[E.warn("Already owned.")]});
  eco.coins-=item.price;if(!eco.inventory)eco.inventory=[];eco.inventory.push(id);saveData();
  return respond(msg,{embeds:[E.success("✅ Purchased!").addFields({name:"Item",value:item.name},{name:"Redeem",value:item.desc}).setTimestamp()]});
}

async function handleGiveCoins(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  const uid=parseUserId(args[0]),amt=parseInt(args[1],10);
  if(!uid||!isFinite(amt)||amt<=0)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}givecoins @user <amount>\``)]});
  const eco=getEco(uid);eco.coins=(eco.coins||0)+amt;saveData();
  return respond(msg,{embeds:[E.success("💰 Coins Given").addFields({name:"User",value:`<@${uid}>`,inline:true},{name:"Amount",value:`${amt} 🪙`,inline:true},{name:"Balance",value:`${eco.coins} 🪙`,inline:true}).setTimestamp()]});
}

async function handleDaily(msg) {
  const uid=msg.author.id,last=data.dailyClaims[uid]||0,elapsed=Date.now()-last;
  if(elapsed<86_400_000){const r=86_400_000-elapsed;return respond(msg,{embeds:[E.warn("⏰ Already Claimed").setDescription(`Come back in **${Math.floor(r/3_600_000)}h ${Math.floor((r%3_600_000)/60_000)}m**.`)]});}
  data.dailyClaims[uid]=Date.now();
  const reward=DAILY_REWARDS[Math.floor(Math.random()*DAILY_REWARDS.length)];
  getEco(uid).coins=(getEco(uid).coins||0)+reward.coins;saveData();
  return respond(msg,{embeds:[E.success("🎁 Daily Reward!").setDescription(`${reward.text}\n\n**+${reward.coins} 🪙**`).setTimestamp()]});
}

// ─── LEVELING ─────────────────────────────────────────────────────────────────

async function handleLevel(msg, args) {
  const uid=parseUserId(args[0])||msg.author.id;
  let user;try{user=await client.users.fetch(uid);}catch{return respond(msg,{embeds:[E.error("Not found.")]});}
  const lv=getLv(uid),needed=xpForLevel(lv.level),prog=Math.min(20,Math.floor((lv.xp/needed)*20));
  return respond(msg,{embeds:[E.xp(`📊 Level — ${user.username}`).setThumbnail(user.displayAvatarURL())
    .addFields({name:"🏆 Level",value:`${lv.level}`,inline:true},{name:"✨ XP",value:`${lv.xp}/${needed}`,inline:true},{name:"💬 Messages",value:`${lv.totalMessages||0}`,inline:true},{name:"📈 Progress",value:`\`${"█".repeat(prog)}${"░".repeat(20-prog)}\` ${Math.floor((lv.xp/needed)*100)}%`}).setTimestamp()]});
}

async function handleRank(msg, args) {
  const uid=parseUserId(args[0])||msg.author.id;
  let user;try{user=await client.users.fetch(uid);}catch{return respond(msg,{embeds:[E.error("Not found.")]});}
  const lv=getLv(uid),eco=getEco(uid),needed=xpForLevel(lv.level);
  const sorted=Object.entries(data.leveling).sort((a,b)=>b[1].level!==a[1].level?b[1].level-a[1].level:b[1].xp-a[1].xp);
  const rank=sorted.findIndex(([id])=>id===uid)+1;
  return respond(msg,{embeds:[E.xp(`🏅 Rank — ${user.username}`).setThumbnail(user.displayAvatarURL())
    .addFields({name:"🌍 Rank",value:rank>0?`#${rank}`:"Unranked",inline:true},{name:"🏆 Level",value:`${lv.level}`,inline:true},{name:"✨ XP",value:`${lv.xp}/${needed}`,inline:true},{name:"💰 Coins",value:`${eco.coins||0}`,inline:true},{name:"💬 Messages",value:`${lv.totalMessages||0}`,inline:true},{name:"⚠️ Warns",value:`${(data.warns[uid]||[]).length}`,inline:true}).setTimestamp()]});
}

async function handleLeaderboard(msg) {
  const top=Object.entries(data.leveling).map(([id,d])=>({id,level:d.level||1,xp:d.xp||0})).sort((a,b)=>b.level!==a.level?b.level-a.level:b.xp-a.xp).slice(0,10);
  if(!top.length)return respond(msg,{embeds:[E.brand("📊 Leaderboard").setDescription("No data yet!")]});
  const medals=["🥇","🥈","🥉"];
  const lines=await Promise.all(top.map(async(e,i)=>{let tag=`<@${e.id}>`;try{const u=await client.users.fetch(e.id);tag=u.username;}catch{}return `${medals[i]||`**${i+1}.**`} ${tag} — Lv **${e.level}** (${e.xp} XP)`;}));
  return respond(msg,{embeds:[E.gold("🏆 Leaderboard").setDescription(lines.join("\n")).setTimestamp()]});
}

// ─── MODERATION ────────────────────────────────────────────────────────────────

async function handleBan(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.BanMembers))return respond(msg,{embeds:[E.error("No Permission")]});
  const uid=parseUserId(args[0]);if(!uid)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}ban @user <reason>\``)]});
  const reason=args.slice(1).join(" ").trim()||"No reason";
  try{await msg.guild.bans.create(uid,{reason:`By ${msg.author.tag}: ${reason}`});}catch{return respond(msg,{embeds:[E.error("Ban failed.")]});}
  const emb=E.error("🔨 Banned").addFields({name:"User",value:`<@${uid}>`,inline:true},{name:"Reason",value:reason},{name:"By",value:msg.author.tag,inline:true}).setTimestamp();
  await respond(msg,{embeds:[emb]});await logMod(msg.guild,emb);
}

async function handleKick(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.KickMembers))return respond(msg,{embeds:[E.error("No Permission")]});
  const uid=parseUserId(args[0]);if(!uid)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}kick @user [reason]\``)]});
  const reason=args.slice(1).join(" ").trim()||"No reason";
  let m;try{m=await msg.guild.members.fetch(uid);}catch{return respond(msg,{embeds:[E.error("Not found.")]});}
  if(!m.kickable)return respond(msg,{embeds:[E.error("Can't kick.")]});
  await m.kick(reason);
  const emb=E.warn("👢 Kicked").addFields({name:"User",value:`<@${uid}>`,inline:true},{name:"Reason",value:reason,inline:true},{name:"By",value:msg.author.tag,inline:true}).setTimestamp();
  await respond(msg,{embeds:[emb]});await logMod(msg.guild,emb);
}

async function handleMute(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.ModerateMembers))return respond(msg,{embeds:[E.error("No Permission")]});
  const uid=parseUserId(args[0]);if(!uid||!args[1])return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}mute @user <time> [reason]\``)]});
  const ms=parseDuration(args[1]);if(!ms||ms>28*TIME.d)return respond(msg,{embeds:[E.error("Invalid duration (max 28d).")]});
  const reason=args.slice(2).join(" ").trim()||"No reason";
  let m;try{m=await msg.guild.members.fetch(uid);}catch{return respond(msg,{embeds:[E.error("Not found.")]});}
  if(!m.moderatable)return respond(msg,{embeds:[E.error("Can't mute.")]});
  await m.timeout(ms,reason);
  const emb=E.warn("🔇 Muted").addFields({name:"User",value:`<@${uid}>`,inline:true},{name:"Duration",value:fmtDuration(ms),inline:true},{name:"Reason",value:reason},{name:"By",value:msg.author.tag}).setTimestamp();
  await respond(msg,{embeds:[emb]});await logMod(msg.guild,emb);
}

async function handleWarn(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.ModerateMembers))return respond(msg,{embeds:[E.error("No Permission")]});
  const uid=parseUserId(args[0]),reason=args.slice(1).join(" ").trim();
  if(!uid||!reason)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}warn @user <reason>\``)]});
  const w={id:data.nextWarnId++,reason,modId:msg.author.id,at:new Date().toISOString()};
  if(!data.warns[uid])data.warns[uid]=[];data.warns[uid].push(w);saveData();
  const emb=E.warn("⚠️ Warned").addFields({name:"User",value:`<@${uid}>`,inline:true},{name:"Warn #",value:`${w.id}`,inline:true},{name:"Total",value:`${data.warns[uid].length}`,inline:true},{name:"Reason",value:reason},{name:"By",value:msg.author.tag}).setTimestamp();
  await respond(msg,{embeds:[emb]});await logMod(msg.guild,emb);
  try{const u=await client.users.fetch(uid);await u.send({embeds:[E.warn(`⚠️ Warned in ${msg.guild.name}`).addFields({name:"Reason",value:reason}).setTimestamp()]});}catch{}
}

async function handleWarns(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.ModerateMembers))return respond(msg,{embeds:[E.error("No Permission")]});
  const uid=parseUserId(args[0]);if(!uid)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}warns @user\``)]});
  const list=data.warns[uid]||[];
  const emb=new EmbedBuilder().setTitle(`⚠️ Warnings (${list.length})`).setColor(list.length?WARN_COLOR:SUCCESS_COLOR).setDescription(`<@${uid}>`);
  if(!list.length)emb.addFields({name:"✅ Clean",value:"No warnings."});
  else list.slice(-10).forEach(w=>emb.addFields({name:`#${w.id}`,value:`**Reason:** ${w.reason||"—"}`,inline:true}));
  return respond(msg,{embeds:[emb]});
}

async function handleUnwarn(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.ModerateMembers))return respond(msg,{embeds:[E.error("No Permission")]});
  const id=Number(args[0]);
  for(const [uid,list] of Object.entries(data.warns)){
    const i=list.findIndex(w=>w.id===id);
    if(i!==-1){const [rem]=list.splice(i,1);if(!list.length)delete data.warns[uid];saveData();return respond(msg,{embeds:[E.success("✅ Warning Removed").addFields({name:"ID",value:`#${id}`,inline:true},{name:"User",value:`<@${uid}>`,inline:true},{name:"Reason",value:rem.reason||"—"}).setTimestamp()]});}
  }
  return respond(msg,{embeds:[E.error("Warning not found.")]});
}

async function handlePurge(msg, args) {
  if(!hasPerm(msg.member,PermissionFlagsBits.ManageMessages))return respond(msg,{embeds:[E.error("No Permission")]});
  const n=parseInt(args[0],10);if(!isFinite(n)||n<1||n>100)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}purge <1-100>\``)]});
  try{const d=await msg.channel.bulkDelete(n,true);const note=await msg.channel.send({embeds:[E.success(`🧹 Deleted ${d.size} messages`)]});setTimeout(()=>note.delete().catch(()=>{}),5000);}
  catch{await respond(msg,{embeds:[E.error("Purge failed — messages may be >14 days old.")]});}
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

async function handleBlacklist(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  const uid=parseUserId(args[0]);if(!uid)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}blacklist @user\``)]});
  const i=data.blacklist.indexOf(uid);
  if(i===-1)data.blacklist.push(uid);else data.blacklist.splice(i,1);
  saveData();
  return respond(msg,{embeds:[new EmbedBuilder().setColor(i===-1?ERROR_COLOR:SUCCESS_COLOR).setTitle("🚫 Blacklist").setDescription(`<@${uid}> ${i===-1?"added to":"removed from"} blacklist.`).setTimestamp()]});
}

async function handleSetLog(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  if(!args[0]){delete data.modLogChannels[msg.guild.id];saveData();return respond(msg,{embeds:[E.warn("Mod log disabled.")]});}
  const id=parseChannelId(args[0]);if(!id)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}setlog #channel\``)]});
  const ch=await msg.guild.channels.fetch(id).catch(()=>null);if(!ch?.isTextBased())return respond(msg,{embeds:[E.error("Invalid channel.")]});
  data.modLogChannels[msg.guild.id]=id;saveData();
  await respond(msg,{embeds:[E.success("📓 Mod Log Set").setDescription(`Logging to <#${id}>`.replace("<#","<#"))]});
  await ch.send({embeds:[E.success("✅ Mod Log Connected").setDescription(`This channel now receives mod logs from **${BOT_NAME}**.`)]});
}

async function handleSetChannel(msg, args, key, label) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild))return respond(msg,{embeds:[E.error("No Permission.")]});
  const s=getSettings(msg.guild.id);
  if(!args[0]){delete s[key];saveData();return respond(msg,{embeds:[E.success(`✅ ${label} Cleared`)]});}
  const id=parseChannelId(args[0]);if(!id)return respond(msg,{embeds:[E.warn(`Usage: \`${PREFIX}${msg.content.split(" ")[0].slice(1)} #channel\``)]});
  s[key]=id;saveData();
  return respond(msg,{embeds:[E.success(`✅ ${label} Set`).setDescription(`→ <#${id}>`)]});
}

async function handleAnnounce(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild))return respond(msg,{embeds:[E.error("No Permission.")]});
  let ch=msg.channel,txt=args;
  if(args[0]){const id=parseChannelId(args[0]);if(id){const c=await msg.guild.channels.fetch(id).catch(()=>null);if(c?.isTextBased()){ch=c;txt=args.slice(1);}}}
  const text=txt.join(" ").trim();if(!text)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}announce [#ch] <message>\``)]});
  try{await msg.delete();}catch{}
  await ch.send({content:"@everyone",embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setAuthor({name:`${BOT_NAME} — Announcement`,iconURL:client.user?.displayAvatarURL()}).setDescription(`╔══════════════════════════════════╗\n\u200b\n${text}\n\u200b\n╚══════════════════════════════════╝`).setFooter({text:`Posted by ${msg.author.tag}`,iconURL:msg.author.displayAvatarURL()}).setTimestamp()]});
}

async function handleSay(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageMessages))return respond(msg,{embeds:[E.error("No Permission.")]});
  const text=args.join(" ").trim();if(!text)return;
  try{await msg.delete();}catch{}
  await msg.channel.send({content:text,allowedMentions:{users:[]}});
}

// ─── FUN ──────────────────────────────────────────────────────────────────────

async function handleCoinFlip(msg) { useCD("coinflip",msg.author.id);const r=Math.random()<.5?"Heads":"Tails";return respond(msg,{embeds:[E.brand("🪙 Coin Flip").setDescription(`**${r}!** ${r==="Heads"?"👑":"🌊"}`)]});}
async function handleRoll(msg, args)  { useCD("roll",msg.author.id);const max=parseInt(args[0],10)||6;if(max<2||max>10000)return respond(msg,{embeds:[E.error("2–10000")]});return respond(msg,{embeds:[E.brand("🎲 Roll").setDescription(`You rolled **${Math.floor(Math.random()*max)+1}** (1–${max})`)]});}
async function handleRPS(msg, args)   {
  useCD("rps",msg.author.id);
  const pick=(args[0]||"").toLowerCase(),choices=["rock","paper","scissors"],emoji={rock:"🪨",paper:"📄",scissors:"✂️"};
  if(!choices.includes(pick))return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}rps <rock|paper|scissors>\``)]});
  const bot=choices[Math.floor(Math.random()*3)];
  const outcome=pick===bot?"🤝 Tie!":(pick==="rock"&&bot==="scissors")||(pick==="paper"&&bot==="rock")||(pick==="scissors"&&bot==="paper")?"🎉 You win!":"🤖 I win!";
  return respond(msg,{embeds:[E.brand("🎮 Rock Paper Scissors").addFields({name:"You",value:`${emoji[pick]} ${pick}`,inline:true},{name:"Me",value:`${emoji[bot]} ${bot}`,inline:true},{name:"Result",value:outcome})]});
}
async function handleQuote(msg)  { return respond(msg,{embeds:[E.brand("💭 Quote").setDescription(`*${QUOTES[Math.floor(Math.random()*QUOTES.length)]}*`).setFooter({text:`${BOT_NAME} 🧸`})]}); }
async function handleTip(msg)    { return respond(msg,{embeds:[E.brand("💡 Scripting Tip").setDescription(TIPS[Math.floor(Math.random()*TIPS.length)])]}); }
async function handle8Ball(msg, args) {
  const q=args.join(" ").trim();if(!q)return respond(msg,{embeds:[E.warn("Ask a question!")]});
  return respond(msg,{embeds:[E.brand("🎱 Magic 8-Ball").addFields({name:"❓",value:q.slice(0,1000)},{name:"🎱",value:`**${EIGHT_BALL[Math.floor(Math.random()*EIGHT_BALL.length)]}**`})]});
}
async function handleRate(msg, args)  { const t=args.join(" ").trim();if(!t)return respond(msg,{embeds:[E.warn("Rate what?")]});const s=Math.floor(Math.random()*11),e=s>=8?"🔥":s>=5?"😊":s>=3?"😐":"💀";return respond(msg,{embeds:[E.brand("📊 Rating").setDescription(`${e} **${t}** — **${s}/10**\n\`${"█".repeat(s)}${"░".repeat(10-s)}\``)]});}
async function handleMeme(msg)   {
  try{const r=await fetch("https://meme-api.com/gimme/wholesomememes");const m=await r.json();if(m.nsfw||m.spoiler)throw new Error();return respond(msg,{embeds:[E.brand(m.title||"Meme").setURL(m.postLink).setImage(m.url)]});}
  catch{return respond(msg,{embeds:[E.error("Meme unavailable.")]});}
}
async function handleCalc(msg, args) {
  const expr=args.join(" ").trim().replace(/[^0-9+\-*/.() %^]/g,"");if(!expr)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}calc <expression>\``)]});
  try{const r=Function('"use strict";return('+expr+')')();if(!isFinite(r))throw 0;return respond(msg,{embeds:[E.brand("🧮 Calculator").addFields({name:"Input",value:`\`${expr}\``,inline:true},{name:"Result",value:`\`${r}\``,inline:true})]});}
  catch{return respond(msg,{embeds:[E.error("Invalid expression.")]});}
}
async function handleColor(msg, args) {
  const hex=(args[0]||"").replace("#","").trim();if(!/^[0-9A-Fa-f]{6}$/.test(hex))return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}color <hex>\``)]});
  const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  return respond(msg,{embeds:[new EmbedBuilder().setColor(parseInt(hex,16)).setTitle(`🎨 #${hex.toUpperCase()}`).addFields({name:"HEX",value:`#${hex.toUpperCase()}`,inline:true},{name:"RGB",value:`${r},${g},${b}`,inline:true},{name:"INT",value:`${parseInt(hex,16)}`,inline:true}).setImage(`https://singlecolorimage.com/get/${hex}/200x80`).setTimestamp()]});
}
async function handleReminder(msg, args) {
  const raw=args.join(" "),pipe=raw.indexOf("|");if(pipe<0)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}remindme <time> | <message>\``)]});
  const ms=parseDuration(raw.slice(0,pipe).trim()),text=raw.slice(pipe+1).trim();
  if(!ms||ms>7*TIME.d)return respond(msg,{embeds:[E.error("Invalid duration (max 7d).")]});
  if(!text)return respond(msg,{embeds:[E.error("Provide a message.")]});
  await respond(msg,{embeds:[E.success("⏰ Reminder Set!").setDescription(`Pinging you in **${fmtDuration(ms)}**\n> ${text}`)]});
  setTimeout(async()=>msg.channel.send({content:`<@${msg.author.id}>`,embeds:[E.brand("⏰ Reminder!").setDescription(`> ${text}`).setTimestamp()]}).catch(()=>{}),ms);
}

async function handleTrivia(msg) {
  if(data.triviaActive[msg.channel.id])return respond(msg,{embeds:[E.warn("Trivia already active!")]});
  const q=TRIVIA_QUESTIONS[Math.floor(Math.random()*TRIVIA_QUESTIONS.length)];
  const coins=50+Math.floor(Math.random()*50);
  data.triviaActive[msg.channel.id]={q:q.q,answers:q.a,coins};saveData();
  await respond(msg,{embeds:[E.info("🧠 Trivia!").setDescription(`**${q.q}**\n\n*Hint: ${q.hint}*`).addFields({name:"💰 Reward",value:`${coins} 🪙`}).setFooter({text:"60 second timeout"})]});
  setTimeout(async()=>{if(data.triviaActive[msg.channel.id]){delete data.triviaActive[msg.channel.id];saveData();await msg.channel.send({embeds:[E.warn("⏰ Trivia Expired").setDescription(`Answer: **${q.a[0]}**`)]}).catch(()=>{});}},60_000);
}

async function handleGiveaway(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild))return respond(msg,{embeds:[E.error("No Permission.")]});
  const raw=args.join(" "),pipe=raw.indexOf("|");if(pipe<0)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}giveaway <time> | <prize>\``)]});
  const ms=parseDuration(raw.slice(0,pipe).trim()),prize=raw.slice(pipe+1).trim();
  if(!ms)return respond(msg,{embeds:[E.error("Invalid duration.")]});if(!prize)return respond(msg,{embeds:[E.error("Provide a prize.")]});
  const endAt=Date.now()+ms;
  const sent=await msg.channel.send({content:"@here",embeds:[new EmbedBuilder().setColor(GOLD_COLOR).setTitle("🎉 GIVEAWAY!").setDescription(`React 🎉 to enter!\n\n**Prize:** ${prize}`).addFields({name:"⏰ Ends",value:`<t:${Math.floor(endAt/1000)}:R>`,inline:true},{name:"🎁 Prize",value:prize,inline:true},{name:"🏠 Host",value:`<@${msg.author.id}>`,inline:true}).setFooter({text:"React 🎉 to enter!"}).setTimestamp()],allowedMentions:{users:[]}});
  await sent.react("🎉").catch(()=>{});
  data.giveaways[sent.id]={prize,endAt,channelId:msg.channel.id,guildId:msg.guild.id,hostId:msg.author.id,ended:false};saveData();
}

async function handlePoll(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageMessages))return respond(msg,{embeds:[E.error("No Permission.")]});
  const parts=args.join(" ").split("|").map(s=>s.trim()).filter(Boolean);if(parts.length<2)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}poll <question> | <opt1> | <opt2>\``)]});
  const opts=parts.slice(1,10);const nums=["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣"];
  try{await msg.delete();}catch{}
  const sent=await msg.channel.send({embeds:[new EmbedBuilder().setColor(INFO_COLOR).setTitle(`📊 ${parts[0]}`).setDescription(opts.map((o,i)=>`${nums[i]} ${o}`).join("\n\n")).setFooter({text:"React to vote!"}).setTimestamp()]});
  for(let i=0;i<opts.length;i++)await sent.react(nums[i]).catch(()=>{});
}

// ─── INFO COMMANDS ─────────────────────────────────────────────────────────────

async function handleUserInfo(msg, args) {
  const uid=parseUserId(args[0])||msg.author.id;
  let member=null,user=null;
  try{member=await msg.guild.members.fetch(uid);user=member.user;}catch{try{user=await client.users.fetch(uid);}catch{return respond(msg,{embeds:[E.error("Not found.")]});}}
  const emb=E.brand(`👤 ${user.tag}`).setThumbnail(user.displayAvatarURL({size:256})).addFields({name:"🆔 ID",value:user.id,inline:true},{name:"🤖 Bot",value:user.bot?"Yes":"No",inline:true},{name:"📅 Created",value:`<t:${Math.floor(user.createdTimestamp/1000)}:F>`});
  if(member){
    if(member.joinedTimestamp)emb.addFields({name:"📥 Joined",value:`<t:${Math.floor(member.joinedTimestamp/1000)}:F>`});
    const roles=member.roles.cache.filter(r=>r.id!==msg.guild.id).sort((a,b)=>b.position-a.position).map(r=>`<@&${r.id}>`).slice(0,15);
    if(roles.length)emb.addFields({name:`🎭 Roles (${roles.length})`,value:roles.join(" ")});
    const lv=getLv(uid),eco=getEco(uid);
    emb.addFields({name:"🏆 Level",value:`${lv.level}`,inline:true},{name:"💰 Coins",value:`${eco.coins||0}`,inline:true},{name:"⚠️ Warns",value:`${(data.warns[uid]||[]).length}`,inline:true},{name:"🚫 Blacklisted",value:data.blacklist.includes(uid)?"Yes":"No",inline:true});
  }
  return respond(msg,{embeds:[emb.setTimestamp()]});
}

async function handleServerInfo(msg) {
  const g=msg.guild;const owner=await g.fetchOwner().catch(()=>null);const ch=g.channels.cache;
  return respond(msg,{embeds:[E.brand(`🏠 ${g.name}`).setThumbnail(g.iconURL({size:256})||null).addFields({name:"🆔 ID",value:g.id,inline:true},{name:"👑 Owner",value:owner?.user.tag||"—",inline:true},{name:"📅 Created",value:`<t:${Math.floor(g.createdTimestamp/1000)}:F>`},{name:"👥 Members",value:`${g.memberCount}`,inline:true},{name:"🎭 Roles",value:`${g.roles.cache.size}`,inline:true},{name:"😄 Emojis",value:`${g.emojis.cache.size}`,inline:true},{name:"💬 Text",value:`${ch.filter(c=>c.type===ChannelType.GuildText).size}`,inline:true},{name:"🔊 Voice",value:`${ch.filter(c=>c.type===ChannelType.GuildVoice).size}`,inline:true},{name:"✨ Boosts",value:`Tier ${g.premiumTier} (${g.premiumSubscriptionCount||0} boosts)`}).setTimestamp()]});
}

async function handleStats(msg) {
  const active=data.orders.filter(o=>o.status!=="completed"&&o.status!=="cancelled").length;
  const done=data.orders.filter(o=>o.status==="completed").length;
  const avg=data.reviews.length?(data.reviews.reduce((s,r)=>s+r.rating,0)/data.reviews.length).toFixed(2):"—";
  return respond(msg,{embeds:[E.brand("📈 Stats").addFields({name:"📦 Active Orders",value:`${active}`,inline:true},{name:"✅ Completed",value:`${done}`,inline:true},{name:"🎟️ Tickets",value:`${data.stats.ticketsOpened||0}`,inline:true},{name:"⭐ Reviews",value:`${data.reviews.length} (avg ${avg}⭐)`,inline:true},{name:"🎨 Portfolio",value:`${data.portfolio.length}`,inline:true},{name:"🖼️ AI Images",value:`${data.stats.imagesGenerated||0}`,inline:true},{name:"📊 Level Users",value:`${Object.keys(data.leveling).length}`,inline:true}).setTimestamp()]});
}

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────

const IMG_EXT=/\.(png|jpe?g|gif|webp|bmp)(?:\?|$)/i;
const VID_EXT=/\.(mov|mp4|webm|m4v|mkv)(?:\?|$)/i;
const URL_RE =/^https?:\/\/\S+$/i;
const MEDIA_HOSTS=["cdn.discordapp.com","media.discordapp.net","i.imgur.com","imgur.com","youtube.com","youtu.be"];
function isMedia(url){if(!url)return false;if(IMG_EXT.test(url)||VID_EXT.test(url))return true;try{const u=new URL(url);return MEDIA_HOSTS.some(h=>u.hostname.endsWith(h));}catch{return false;}}
function isVideo(url){return VID_EXT.test(url||"");}

async function handlePortfolio(msg, args) {
  if(!data.portfolio.length)return respond(msg,{embeds:[E.brand("🎨 Portfolio").setDescription("No work added yet.")]});
  const total=data.portfolio.length;let page=parseInt(args[0],10);if(!isFinite(page)||page<1)page=1;if(page>total)page=total;
  const work=[...data.portfolio].reverse()[page-1];
  const emb=E.brand(`🎨 ${work.title||`Entry #${work.id}`}`).setURL(work.url).addFields({name:"🆔 ID",value:`#${work.id}`,inline:true},{name:"Type",value:isVideo(work.url)?"🎥 Video":"🖼️ Image",inline:true}).setFooter({text:`Page ${page}/${total} • ${PREFIX}work <page>`});
  if(!isVideo(work.url))emb.setImage(work.url);else emb.setDescription(`[▶️ Watch Video](${work.url})`);
  return respond(msg,{content:isVideo(work.url)?work.url:undefined,embeds:[emb]});
}

async function handleAddWork(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild))return respond(msg,{embeds:[E.error("No Permission.")]});
  let url=null,title="";
  if(args[0]&&URL_RE.test(args[0])){url=args[0];title=args.slice(1).join(" ").trim();}
  else{const a=msg.attachments?.find(a=>IMG_EXT.test(a.url));if(a){url=a.url;title=args.join(" ").trim();}}
  if(!url)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}addwork <url> [title]\``)]});
  if(!isMedia(url))return respond(msg,{embeds:[E.error("Not a valid media URL.")]});
  const w={id:data.nextWorkId++,url,title:title||null,addedBy:msg.author.tag,at:new Date().toISOString()};
  data.portfolio.push(w);saveData();
  const emb=E.success(`✅ Entry #${w.id} Added`).setTimestamp();if(!isVideo(url))emb.setImage(url);
  return respond(msg,{embeds:[emb]});
}

async function handleRemoveWork(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild))return respond(msg,{embeds:[E.error("No Permission.")]});
  const id=Number(args[0]);if(!isFinite(id))return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}removework <id>\``)]});
  const i=data.portfolio.findIndex(w=>w.id===id);if(i===-1)return respond(msg,{embeds:[E.error("Not found.")]});
  const [rem]=data.portfolio.splice(i,1);saveData();
  return respond(msg,{embeds:[E.warn(`🗑️ Removed #${rem.id}`).setDescription(rem.title||"(no title)")]});
}

// ─── PARTNER ──────────────────────────────────────────────────────────────────

async function handlePartner(msg, args) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageGuild))return respond(msg,{embeds:[E.error("No Permission.")]});
  const sub=(args[0]||"").toLowerCase();
  if(!sub||sub==="help")return respond(msg,{embeds:[E.info("🤝 Partnership").addFields({name:"Formats",value:`\`basic\` \`detailed\` \`announce\` \`promo\``},{name:"Usage",value:`\`${PREFIX}partner <format> <invite> | <name> | <desc> ...\``},{name:"Other",value:`\`${PREFIX}partner list\` \`${PREFIX}partner remove <id>\``})]});
  if(sub==="list"){const ps=data.partnerships.filter(p=>p.guildId===msg.guild.id);return respond(msg,{embeds:[E.info(`🤝 Partnerships (${ps.length})`).setDescription(ps.length?ps.map(p=>`**#${p.id}** ${p.name||"Unnamed"} — ${p.invite}`).join("\n"):"None")]});}
  if(sub==="remove"){if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});const id=parseInt(args[1],10);const i=data.partnerships.findIndex(p=>p.id===id&&p.guildId===msg.guild.id);if(i===-1)return respond(msg,{embeds:[E.error("Not found.")]});data.partnerships.splice(i,1);saveData();return respond(msg,{embeds:[E.success("✅ Removed")]});}
  const raw=args.slice(1).join(" ");const parts=raw.split("|").map(s=>s.trim());
  if(!parts[0])return respond(msg,{embeds:[E.error("Provide an invite link.")]});
  let inv=parts[0];if(!inv.startsWith("http"))inv="https://discord.gg/"+inv.replace(/^(discord\.gg\/)/i,"");
  if(!/^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\/.+$/i.test(inv))return respond(msg,{embeds:[E.error("Invalid invite link.")]});
  let emb;const foot=msg.author.tag;
  if(sub==="basic"){if(parts.length<3)return respond(msg,{embeds:[E.warn("Need: invite | name | description")]});emb=new EmbedBuilder().setColor(INFO_COLOR).setTitle("🤝 New Partner!").setDescription("Welcome our new partner! 🎉").addFields({name:"🏠 Server",value:`**${parts[1]}**`,inline:true},{name:"🔗 Join",value:`[Click here!](${inv})`,inline:true},{name:"📋 About",value:parts[2]||"—"}).setFooter({text:`Partnership • ${foot}`}).setTimestamp();}
  else if(sub==="detailed"){emb=new EmbedBuilder().setColor(BRAND_COLOR).setTitle("🌟 Featured Partner").addFields({name:"🏠 Server",value:`**${parts[1]||"—"}**`,inline:true},{name:"🔗 Join",value:`[Join](${inv})`,inline:true},{name:"📖 About",value:parts[2]||"—"});if(parts[3])emb.addFields({name:"🎁 Perks",value:parts[3].split(",").map(s=>`• ${s.trim()}`).join("\n")});emb.setFooter({text:`Partnership • ${foot}`}).setTimestamp();}
  else if(sub==="announce"){if(parts.length<5)return respond(msg,{embeds:[E.warn("Need: invite | name | about | what-they-offer | what-we-offer")]});emb=new EmbedBuilder().setColor(GOLD_COLOR).setTitle("🤝 Official Partnership!").setDescription(`We've partnered with **${parts[1]}**!`).addFields({name:"🏠 Server",value:`**${parts[1]}**`,inline:true},{name:"🔗 Join",value:`[Click](${inv})`,inline:true},{name:"📋 About",value:parts[2]||"—"},{name:"🎁 They Offer",value:parts[3]||"—",inline:true},{name:"💜 We Offer",value:parts[4]||"—",inline:true}).setFooter({text:`Partnership • ${foot}`}).setTimestamp();}
  else if(sub==="promo"){if(parts.length<3)return respond(msg,{embeds:[E.warn("Need: invite | name | text")]});emb=new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(`📣 Shoutout — ${parts[1]}`).setDescription(parts[2]).addFields({name:"🔗 Join",value:inv}).setFooter({text:`Promo by ${foot}`}).setTimestamp();}
  else return respond(msg,{embeds:[E.warn("Unknown format. Use: basic, detailed, announce, promo")]});
  data.partnerships.push({id:data.partnerships.length?Math.max(...data.partnerships.map(p=>p.id))+1:1,guildId:msg.guild.id,invite:inv,name:parts[1]||null,format:sub,addedBy:msg.author.tag,at:new Date().toISOString()});saveData();
  try{await msg.delete();}catch{}
  await msg.channel.send({content:"@here — New partnership! 🤝",embeds:[emb]});
}

// ─── TICKET CONFIG ────────────────────────────────────────────────────────────

async function handleTicketRole(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  const sub=(args[0]||"").toLowerCase(),s=getSettings(msg.guild.id);
  if(!s.ticketStaffRoles)s.ticketStaffRoles=[];
  if(sub==="add"){const id=parseRoleId(args[1]);if(!id)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}ticketrole add @role\``)]});if(!s.ticketStaffRoles.includes(id))s.ticketStaffRoles.push(id);saveData();return respond(msg,{embeds:[E.success(`✅ <@&${id}> can see all tickets.`)]});}
  if(sub==="remove"){const id=parseRoleId(args[1]);const i=s.ticketStaffRoles.indexOf(id);if(i!==-1){s.ticketStaffRoles.splice(i,1);saveData();}return respond(msg,{embeds:[E.success("✅ Role removed.")]});}
  if(sub==="list")return respond(msg,{embeds:[E.info("🎭 Ticket Staff Roles").setDescription(s.ticketStaffRoles.length?s.ticketStaffRoles.map(r=>`• <@&${r}>`).join("\n"):"None")]});
  return respond(msg,{embeds:[E.info("🎭 ticketrole").addFields({name:"Commands",value:"`add @role` `remove @role` `list`"})]});
}

async function handleTicketConfig(msg, args) {
  if(!isAdmin(msg.member))return respond(msg,{embeds:[E.error("Admin only.")]});
  const sub=(args[0]||"").toLowerCase(),s=getSettings(msg.guild.id);
  if(sub==="ai"){const v=(args[1]||"").toLowerCase();if(v==="on")s.ticketAI=true;else if(v==="off")s.ticketAI=false;saveData();return respond(msg,{embeds:[E.success(`🤖 Ticket AI: **${s.ticketAI!==false?"ON":"OFF"}**`)]});}
  if(sub==="greeting"){const t=args.slice(1).join(" ").trim();if(!t)delete s.ticketGreeting;else s.ticketGreeting=t;saveData();return respond(msg,{embeds:[E.success(`✅ Greeting ${t?"set":"cleared"}.`)]});}
  if(sub==="category"){const id=parseChannelId(args[1]);s.ticketCategoryId=id||null;saveData();return respond(msg,{embeds:[E.success(id?`✅ Category → <#${id}>`:"✅ Category cleared.")]});}
  if(sub==="maxopen"){const n=parseInt(args[1],10);if(!isFinite(n)||n<1)return respond(msg,{embeds:[E.error("Invalid.")]});s.maxOpenTickets=n;saveData();return respond(msg,{embeds:[E.success(`✅ Max open tickets: **${n}**`)]});}
  return respond(msg,{embeds:[E.brand("⚙️ Ticket Config").addFields({name:"`ticketconfig ai <on|off>`",value:`AI: **${s.ticketAI!==false?"ON":"OFF"}**`},{name:"`ticketconfig greeting <text>`",value:`Greeting: **${s.ticketGreeting?"Set":"Default"}**`},{name:"`ticketconfig category <#ch>`",value:`Category: **${s.ticketCategoryId||"None"}**`},{name:"`ticketconfig maxopen <n>`",value:`Max: **${s.maxOpenTickets||1}**`})]});
}

async function handleClose(msg) {
  if(!msg.channel.name?.startsWith("ticket-"))return respond(msg,{embeds:[E.error("Only works in ticket channels.")]});
  const reason=msg.content.slice(PREFIX.length).trim().split(/\s+/).slice(1).join(" ").trim();
  if(!reason)return respond(msg,{embeds:[E.warn("Provide a reason").setDescription(`\`${PREFIX}close <reason>\``)]});
  await closeTicket(msg.channel,msg.member||msg.author,reason,msg.guild);
}

async function handleAddNote(msg, args) {
  if(!msg.channel.name?.startsWith("ticket-"))return respond(msg,{embeds:[E.error("Ticket channels only.")]});
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageMessages))return respond(msg,{embeds:[E.error("No Permission.")]});
  const text=args.join(" ").trim();if(!text)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}addnote <text>\``)]});
  return respond(msg,{embeds:[new EmbedBuilder().setColor(NOTE_COLOR).setTitle("📝 Staff Note").setDescription(text).setFooter({text:`by ${msg.author.tag}`}).setTimestamp()]});
}

async function handleTicketPanel(msg) {
  if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageChannels))return respond(msg,{embeds:[E.error("No Permission.")]});
  const s=getSettings(msg.guild.id);s.ticketPanelChannelId=msg.channel.id;saveData();
  const {embed,row}=buildTicketPanel();
  const sent=await respond(msg,{embeds:[embed],components:[row]});
  if(sent){s.ticketPanelMsgId=sent.id;saveData();}
}

// ─── OTHER HELPERS ────────────────────────────────────────────────────────────

async function handleInvites(msg, args) {
  const uid=parseUserId(args[0])||msg.author.id;
  const inv=(data.invites[msg.guild.id]||{})[uid]||{invited:0,left:0};
  let user;try{user=await client.users.fetch(uid);}catch{}
  return respond(msg,{embeds:[E.info(`📨 Invites — ${user?.username||uid}`).addFields({name:"📬 Invited",value:`${inv.invited}`,inline:true},{name:"🚪 Left",value:`${inv.left}`,inline:true},{name:"✅ Net",value:`${inv.invited-inv.left}`,inline:true}).setTimestamp()]});
}

async function handleInviteLB(msg) {
  const inv=data.invites[msg.guild.id]||{};
  const entries=Object.entries(inv).map(([id,d])=>({id,net:d.invited-d.left})).sort((a,b)=>b.net-a.net).slice(0,10);
  if(!entries.length)return respond(msg,{embeds:[E.brand("📊 Invite Leaderboard").setDescription("No data yet.")]});
  return respond(msg,{embeds:[E.gold("📨 Invite Leaderboard").setDescription(entries.map((e,i)=>`**${i+1}.** <@${e.id}> — **${e.net}** net`).join("\n")).setTimestamp()]});
}

async function handleDiscount(msg) {
  const ordered=hasOrdered(msg.author.id);
  if(!ordered)return respond(msg,{embeds:[E.info("🎟️ Loyalty Discount").setDescription("No orders yet! After your first order, you'll get **5% off** future commissions. 💗")]});
  return respond(msg,{embeds:[E.success("🎟️ Loyalty Discount!").setDescription("You qualify for **5% off** your next commission!\n\n1. Open a ticket\n2. Mention the discount\n3. Snuggles AI will apply it 💗").addFields({name:"Your Orders",value:`${data.orders.filter(o=>o.userId===msg.author.id).length} total`}).setTimestamp()]});
}

async function handlePrices(msg) { return respond(msg,{embeds:[new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("💳 Payment Methods").addFields(...PAYMENT_INFO.methods,{name:"⚠️ Refund Policy",value:PAYMENT_INFO.note}).setTimestamp()]}); }
async function handlePay(msg)    { return respond(msg,{embeds:[E.brand("💸 Payment Details").addFields({name:"💵 CashApp",value:"[$siahhispaid](https://cash.app/$siahhispaid)",inline:true},{name:"🅿️ PayPal",value:"[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)",inline:true},{name:"⚠️ Note",value:"**F&F only** — All sales final, no refunds."})]});}
async function handleTicketCmd(msg) { return respond(msg,{embeds:[E.brand("🎫 Open a Ticket").setDescription("Use the **ticket panel** in the designated channel!\n\n📦 **Order** — Commission a script\n🤝 **Partnership** — Partner with us\n❓ **Inquiry** — Questions & support")]}); }
async function handleScript(msg, args) { const t=(args[0]||"").toLowerCase();const a=Object.keys(SCRIPT_EXAMPLES).join(", ");if(!t)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}script <${a}>\``)]});const ex=SCRIPT_EXAMPLES[t];if(!ex)return respond(msg,{embeds:[E.error(`Unknown. Available: ${a}`)]});return respond(msg,{embeds:[E.brand(`📜 ${ex.title}`).setDescription("```lua\n"+ex.code+"\n```")]}); }
async function handleSnippet(msg) { const s=SNIPPETS[Math.floor(Math.random()*SNIPPETS.length)];return respond(msg,{embeds:[E.brand(`💡 ${s.title}`).setDescription("```lua\n"+s.code+"\n```")]}); }
async function handleDocs(msg)    { return respond(msg,{embeds:[E.brand("📚 Resources").addFields(DOCS.map(d=>({name:d.name,value:d.value})))]}); }
async function handleDebug(msg)   { return respond(msg,{embeds:[E.warn("🐛 Debug Template").setDescription("```\nGoal:\n<what you're trying to do>\n\nIssue:\n<what's happening>\n\nError:\n<paste from Output>\n\nCode:\n<broken section>\n\nAttempted:\n<what you've tried>\n```")]}); }
async function handleVouch(msg, args) {
  const t=args.join(" ").trim();if(!t)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}vouch <text>\``)]});
  const s=getSettings(msg.guild.id);
  const emb=E.success("✅ Vouch").setDescription(`> ${t}`).setThumbnail(msg.author.displayAvatarURL()).setFooter({text:`by ${msg.author.tag}`}).setTimestamp();
  if(s.reviewsChannelId){const ch=await msg.guild.channels.fetch(s.reviewsChannelId).catch(()=>null);if(ch?.isTextBased()){await ch.send({embeds:[emb]});return respond(msg,{embeds:[E.success("✅ Vouch Posted!")]});}}
  return respond(msg,{embeds:[emb]});
}
async function handleSlowmode(msg, args) { if(!hasPerm(msg.member,PermissionFlagsBits.ManageChannels))return respond(msg,{embeds:[E.error("No Permission.")]});const s=parseInt(args[0],10);if(!isFinite(s)||s<0||s>21600)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}slowmode <0-21600>\``)]});await msg.channel.setRateLimitPerUser(s);return respond(msg,{embeds:[E.success("🐢 Slowmode Updated").setDescription(s===0?"Disabled.":`Set to **${s}s**`)]}); }
async function handleNick(msg, args) { if(!hasPerm(msg.member,PermissionFlagsBits.ManageNicknames))return respond(msg,{embeds:[E.error("No Permission.")]});const uid=parseUserId(args[0]);if(!uid)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}nick @user [name]\``)]});const nick=args.slice(1).join(" ").trim()||null;const m=await msg.guild.members.fetch(uid).catch(()=>null);if(!m)return respond(msg,{embeds:[E.error("Not found.")]});if(!m.manageable)return respond(msg,{embeds:[E.error("Can't edit.")]});await m.setNickname(nick);return respond(msg,{embeds:[E.success("✅ Nickname updated.").addFields({name:"User",value:`<@${uid}>`,inline:true},{name:"Nick",value:nick||"(cleared)",inline:true})]}); }
async function handleEmbed(msg, args) { if(!isAdmin(msg.member)&&!hasPerm(msg.member,PermissionFlagsBits.ManageMessages))return respond(msg,{embeds:[E.error("No Permission.")]});const raw=args.join(" "),pipe=raw.indexOf("|");if(pipe<0)return respond(msg,{embeds:[E.warn("Usage").setDescription(`\`${PREFIX}embed <title> | <body>\``)]});const title=raw.slice(0,pipe).trim(),body=raw.slice(pipe+1).trim();if(!title||!body)return respond(msg,{embeds:[E.error("Need title and body.")]});try{await msg.delete();}catch{}await msg.channel.send({embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setDescription(body).setTimestamp()]}); }

// ═══════════════════════════════════════════════════════════════════════════
//  COMMAND MAP
// ═══════════════════════════════════════════════════════════════════════════

const commands = {
  // AI
  ai:(m,a)=>a[0]==="reset"?handleAIReset(m):handleAI(m,a),
  aioff:(m,a)=>handleAIToggle(m,a,"aioff"),
  aion:(m,a)=>handleAIToggle(m,a,"aion"),
  imagine:handleImagine, img:handleImagine, generate:handleImagine, draw:handleImagine,
  // Music
  play:handlePlay, p:handlePlay,
  skip:handleSkip, stop:handleStop, queue:handleQueue, q:handleQueue,
  nowplaying:handleLofi, np:handleLofi,
  volume:handleVolume, vol:handleVolume,
  pause:(m)=>{ const mu=getGuildMusic(m.guild.id);mu.player?.pause();return respond(m,{embeds:[E.warn("⏸️ Paused")]});},
  resume:(m)=>{ const mu=getGuildMusic(m.guild.id);mu.player?.unpause();return respond(m,{embeds:[E.success("▶️ Resumed")]});},
  loop:(m)=>{ const mu=getGuildMusic(m.guild.id);mu.loop=!mu.loop;return respond(m,{embeds:[E.info(`🔁 Loop: **${mu.loop?"On":"Off"}**`)]});},
  lofi:handleLofi,
  // General
  help:handleHelp, info:handleInfo,
  ping:(m)=>respond(m,{embeds:[E.success("🏓 Pong!").addFields({name:"Gateway",value:`${Math.max(0,Math.round(client.ws.ping))}ms`,inline:true})]}),
  status:handleStatus,
  rules:(m)=>respond(m,{embeds:[E.brand("📜 Rules").setDescription(SERVER_RULES.join("\n\n"))]}),
  uptime:(m)=>respond(m,{embeds:[E.brand("⏱️ Uptime").setDescription(`Online for **${fmtDuration(client.uptime||0)}**`)]}),
  // Commissions
  services:(m)=>respond(m,{embeds:[E.brand("🛍️ Services").addFields(SERVICES).setTimestamp()]}),
  prices:handlePrices, pay:handlePay, payment:handlePay,
  orderinfo:handleOrderInfo, updateorder:handleUpdateOrder, updateo:handleUpdateOrder,
  addorder:handleAddOrder, complete:handleComplete, discount:handleDiscount,
  ticket:handleTicketCmd,
  // Portfolio
  work:handlePortfolio, portfolio:handlePortfolio, addwork:handleAddWork, removework:handleRemoveWork,
  // Scripting
  script:handleScript, snippet:handleSnippet, docs:handleDocs, debug:handleDebug, tip:handleTip,
  // Leveling/Economy
  level:handleLevel, rank:handleRank, leaderboard:handleLeaderboard, lb:handleLeaderboard,
  balance:handleBalance, bal:handleBalance, dowork:handleWork,
  shop:handleShop, buy:handleBuy, givecoins:handleGiveCoins, daily:handleDaily,
  // Reviews
  review:handleReview, vouch:handleVouch, reviewconfig:handleReviewConfig,
  // Fun
  quote:handleQuote, meme:handleMeme, "8ball":handle8Ball, rate:handleRate,
  coinflip:handleCoinFlip, flip:handleCoinFlip, roll:handleRoll, dice:handleRoll,
  rps:handleRPS, trivia:handleTrivia, remindme:handleReminder, reminder:handleReminder,
  color:handleColor, calc:handleCalc,
  // Info
  userinfo:handleUserInfo, serverinfo:handleServerInfo,
  avatar:(m,a)=>{ const uid=parseUserId(a[0])||m.author.id;return client.users.fetch(uid).then(u=>{const url=u.displayAvatarURL({size:1024,extension:"png"});return respond(m,{embeds:[E.brand(`🖼️ ${u.tag}`).setURL(url).setImage(url)]});}).catch(()=>respond(m,{embeds:[E.error("Not found.")]}));},
  banner:(m,a)=>{ const uid=parseUserId(a[0])||m.author.id;return client.users.fetch(uid,{force:true}).then(u=>{if(!u.bannerURL())return respond(m,{embeds:[E.warn("No banner.")]});const url=u.bannerURL({size:1024,extension:"png"});return respond(m,{embeds:[E.brand(`🖼️ ${u.username}'s Banner`).setURL(url).setImage(url)]});}).catch(()=>respond(m,{embeds:[E.error("Not found.")]}));},
  servericon:(m)=>{ if(!m.guild.iconURL())return respond(m,{embeds:[E.error("No icon.")]});const url=m.guild.iconURL({size:1024,extension:"png"});return respond(m,{embeds:[E.brand(`🖼️ ${m.guild.name}`).setURL(url).setImage(url)]});},
  stats:handleStats, invites:handleInvites, myinvites:handleInvites,
  inviteleaderboard:handleInviteLB, invitelb:handleInviteLB,
  // Moderation
  ban:handleBan, kick:handleKick, mute:handleMute,
  warn:handleWarn, warns:handleWarns, unwarn:handleUnwarn, purge:handlePurge,
  lock:(m)=>{ if(!hasPerm(m.member,PermissionFlagsBits.ManageChannels))return respond(m,{embeds:[E.error("No Permission.")]});return m.channel.permissionOverwrites.edit(m.guild.roles.everyone,{SendMessages:false}).then(()=>respond(m,{embeds:[E.error("🔒 Channel Locked")]})).catch(()=>respond(m,{embeds:[E.error("Failed.")]}));},
  unlock:(m)=>{ if(!hasPerm(m.member,PermissionFlagsBits.ManageChannels))return respond(m,{embeds:[E.error("No Permission.")]});return m.channel.permissionOverwrites.edit(m.guild.roles.everyone,{SendMessages:null}).then(()=>respond(m,{embeds:[E.success("🔓 Unlocked")]})).catch(()=>respond(m,{embeds:[E.error("Failed.")]}));},
  slowmode:handleSlowmode, nick:handleNick,
  // Admin
  announce:handleAnnounce, say:handleSay, embed:handleEmbed,
  partner:handlePartner, poll:handlePoll, giveaway:handleGiveaway,
  blacklist:handleBlacklist, setlog:handleSetLog,
  setreviews:(m,a)=>handleSetChannel(m,a,"reviewsChannelId","Reviews Channel"),
  settranscripts:(m,a)=>handleSetChannel(m,a,"transcriptsChannelId","Transcripts Channel"),
  ticketpanel:handleTicketPanel, ticketrole:handleTicketRole, ticketconfig:handleTicketConfig,
  close:handleClose, addnote:handleAddNote,
  antiraid:handleAntiRaid, antinuke:handleAntiNuke,
};

// ═══════════════════════════════════════════════════════════════════════════
//  MESSAGE CREATE
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_BYPASS = new Set(["blacklist"]);

client.on("messageCreate", async msg => {
  if(msg.author.bot||!msg.guild||alreadyHandled(msg.id))return;

  // Sticky
  if(msg.channel.id===STICKY_CHANNEL_ID) refreshSticky(msg.channel).catch(()=>{});

  // Partner ad collection
  if(partnerAwaitAd.has(msg.channel.id)){
    const pd=partnerAwaitAd.get(msg.channel.id);
    if(msg.author.id===pd.member.id&&msg.content.trim().length>=20){
      partnerAwaitAd.delete(msg.channel.id);
      setImmediate(async()=>{
        try {
          const {formAnswers,count,ping,tier}=pd;
          const adText=msg.content.trim();
          const banner=msg.attachments.first()?.url||null;
          const g=client.guilds.cache.get(HOME_GUILD_ID); if(!g)return;
          const ch=await g.channels.fetch(PARTNER_AD_CHANNEL_ID).catch(()=>null); if(!ch?.isTextBased())return;
          const emb=new EmbedBuilder().setColor(0x9b59b6).setTitle(formAnswers.serverName||"New Partner").setDescription(`${adText}\n\u200b`)
            .addFields({name:"👥 Members",value:formAnswers.memberCount||"—",inline:true},{name:"📊 Tier",value:tier,inline:true},{name:"🎯 Focus",value:formAnswers.focus||"—",inline:true},{name:"🤝 Offering",value:formAnswers.offering||"—"},{name:"🔗 Join",value:formAnswers.invite||"—"})
            .setFooter({text:`${BOT_NAME} Partnerships • We're now partners! 💗`}).setTimestamp();
          if(banner)emb.setImage(banner);
          await ch.send({content:ping||undefined,embeds:[emb],allowedMentions:ping?{parse:["everyone"]}:{}});
          await msg.channel.send({embeds:[E.success("✅ Partnership Posted!").setDescription(`Your ad is live in <#${PARTNER_AD_CHANNEL_ID}>! Welcome to the ${BOT_NAME} family 💗\n\nThis ticket closes in 15 seconds.`)]});
          setTimeout(()=>msg.channel.delete("Partnership posted").catch(()=>{}),15_000);
        } catch(err){console.error("[PartnerAd]",err.message);}
      });
      return;
    }
  }

  // Forum support AI
  if(msg.channel.isThread?.()&&msg.channel.parentId===FORUM_SUPPORT_CHANNEL_ID&&GROQ_API_KEY){
    const key=`forum:${msg.channel.id}:${msg.author.id}`;
    const last=aiCooldowns.get(key)||0;
    if(Date.now()-last>=5000){
      aiCooldowns.set(key,Date.now());
      setImmediate(async()=>{
        const {text,model}=await callTicketAI(`forum_${msg.channel.id}`,msg.content,"inquiry",null);
        if(text)await msg.channel.send({content:`${text}${aiFooter(model,msg.author.username)}`,allowedMentions:{users:[]}}).catch(()=>{});
      });
    }
    return;
  }

  // Ticket AI — fully autonomous
  if(msg.channel.name?.startsWith("ticket-")&&!msg.content.startsWith(PREFIX)){
    const s=getSettings(msg.guild.id);
    const isStaff=isAdmin(msg.member)||hasPerm(msg.member,PermissionFlagsBits.ManageMessages);
    if(!isStaff&&s.ticketAI!==false&&GROQ_API_KEY&&!ticketAIOff.has(msg.channel.id)){
      const key=`${msg.channel.id}:${msg.author.id}`;
      const last=aiCooldowns.get(key)||0;
      if(Date.now()-last>=8000){
        aiCooldowns.set(key,Date.now());
        const typeMatch=msg.channel.topic?.match(/^\[(\w+)\]/);
        const type=typeMatch?typeMatch[1]:"inquiry";
        setImmediate(async()=>{
          const {text,model}=await callTicketAI(msg.channel.id,msg.content,type,null);
          if(text)await msg.channel.send({content:`${text}${aiFooter(model,msg.author.username)}`,allowedMentions:{users:[]}}).catch(()=>{});
        });
      }
    }
  }

  // XP + Coins
  if(!msg.content.startsWith(PREFIX)){
    grantXP(msg).catch(()=>{}); grantCoins(msg).catch(()=>{});
    // Trivia check
    if(data.triviaActive[msg.channel.id]){
      const tv=data.triviaActive[msg.channel.id];
      if(tv.answers.some(a=>msg.content.trim().toLowerCase().includes(a.toLowerCase()))){
        const eco=getEco(msg.author.id);eco.coins=(eco.coins||0)+tv.coins;delete data.triviaActive[msg.channel.id];saveData();
        await msg.reply({embeds:[E.success("🧠 Correct!").setDescription(`**+${tv.coins} 🪙**`)]}).catch(()=>{});
      }
    }
    return;
  }

  const parts=msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd=parts.shift()?.toLowerCase(); if(!cmd)return;
  const handler=commands[cmd]; if(!handler)return;

  // Blacklist
  if(data.blacklist.includes(msg.author.id)&&!ADMIN_BYPASS.has(cmd)&&!isAdmin(msg.member)){
    await msg.channel.send({embeds:[E.error("🚫 You are blacklisted.")]}).catch(()=>{}); return;
  }

  // Cooldown
  if(CD_CONFIG[cmd]){
    const w=checkCD(cmd,msg.author.id);
    if(w>0){await msg.channel.send({embeds:[E.warn("⏰ Cooldown").setDescription(`Use \`${PREFIX}${cmd}\` again in **${w}s**.`)]}).catch(()=>{});return;}
    useCD(cmd,msg.author.id);
  }

  try { await handler(msg,parts); }
  catch(err) {
    console.error(`[CMD] ${PREFIX}${cmd}:`,err.message);
    await sendErrorLog(err,`Command: ${PREFIX}${cmd}`);
    await msg.channel.send({embeds:[E.error("Something went wrong.").setDescription("An unexpected error occurred. Please try again.")]}).catch(()=>{});
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  FORUM THREAD CREATE
// ═══════════════════════════════════════════════════════════════════════════

client.on("threadCreate", async thread => {
  try {
    if(thread.parentId!==FORUM_SUPPORT_CHANNEL_ID)return;
    await thread.join().catch(()=>{});
    await thread.send({embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle("📜 Support Forum — Welcome!").setDescription("Welcome to **Snuggles Scripting Support**! 💗\n\nOur **Snuggles AI** is here to help you instantly!\n\n**Tips for faster help:**\n• Include screenshots, error messages, and code snippets\n• Describe what you expected vs. what happened\n• List what you've already tried\n\n*This thread is fully AI-managed — instant response, 24/7!*").setFooter({text:`${BOT_NAME} • AI-Powered Support`}).setTimestamp()]});
    if(GROQ_API_KEY){
      const {text,model}=await callTicketAI(`forum_${thread.id}`,`A new support thread was just created titled: "${thread.name}". Greet the user warmly, introduce yourself as Snuggles AI, tell them you'll resolve their issue right here without them needing to wait for anyone, and ask them to describe their issue in detail. 💗`,"inquiry",null);
      if(text)await thread.send({content:`${text}${aiFooter(model,"Snuggles AI")}`,allowedMentions:{users:[]}});
    }
  } catch(err){console.error("[Forum threadCreate]",err.message);}
});

// ═══════════════════════════════════════════════════════════════════════════
//  INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════

client.on("interactionCreate", async interaction => {
  try {
    if(data.blacklist.includes(interaction.user.id)){
      if(interaction.isRepliable())await interaction.reply({content:"🚫 Blacklisted.",flags:MessageFlags.Ephemeral});
      return;
    }

    if(interaction.isButton()){
      if(["ticket_order","ticket_partner","ticket_inquiry"].includes(interaction.customId)){
        const typeMap={ticket_order:"order",ticket_partner:"partnership",ticket_inquiry:"inquiry"};
        const type=typeMap[interaction.customId];
        let modal;
        if(type==="order"){
          modal=new ModalBuilder().setCustomId("modal_order").setTitle("📦 Commission Order");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("username").setLabel("Your Roblox Username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("service").setLabel("Service Needed").setPlaceholder("UI, datastore, admin system, etc.").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("description").setLabel("Detailed Description").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("budget").setLabel("Budget").setPlaceholder("e.g. $25 USD, 5000 Robux").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setPlaceholder("PayPal F&F, CashApp, Robux, Gift Card").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
          );
        } else if(type==="partnership"){
          modal=new ModalBuilder().setCustomId("modal_partner").setTitle("🤝 Partnership Request");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("serverName").setLabel("Server Name").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("invite").setLabel("Server Invite Link").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("memberCount").setLabel("Member Count").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("focus").setLabel("Server Focus").setPlaceholder("e.g. Roblox dev, gaming, scripting...").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("offering").setLabel("What can you offer us?").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)),
          );
        } else {
          modal=new ModalBuilder().setCustomId("modal_inquiry").setTitle("❓ General Inquiry");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Your Name / Username").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("topic").setLabel("Topic / Question").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("details").setLabel("Details").setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("urgency").setLabel("Urgency").setPlaceholder("Not urgent / Few days / ASAP").setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(false)),
          );
        }
        await interaction.showModal(modal); return;
      }

      if(interaction.customId==="ticket_close_btn"){
        const ch=interaction.channel;
        if(!ch?.name?.startsWith("ticket-"))return interaction.reply({content:"❌ Ticket channels only.",flags:MessageFlags.Ephemeral});
        const isStaff=isAdmin(interaction.member)||hasPerm(interaction.member,PermissionFlagsBits.ManageChannels);
        const hasStaffRole=getSettings(interaction.guild.id).ticketStaffRoles?.some(r=>interaction.member?.roles.cache.has(r));
        const isOwner=ch.permissionOverwrites.cache.has(interaction.user.id);
        if(!isStaff&&!hasStaffRole&&!isOwner)return interaction.reply({content:"❌ Only the ticket owner or staff can close this.",flags:MessageFlags.Ephemeral});
        const modal=new ModalBuilder().setCustomId("modal_close").setTitle("🔒 Close Ticket");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Reason for closing").setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true)));
        await interaction.showModal(modal); return;
      }
    }

    if(interaction.isModalSubmit()){
      if(["modal_order","modal_partner","modal_inquiry"].includes(interaction.customId)){
        await interaction.deferReply({flags:MessageFlags.Ephemeral});
        const typeMap={modal_order:"order",modal_partner:"partnership",modal_inquiry:"inquiry"};
        const type=typeMap[interaction.customId];
        let answers={};
        if(type==="order"){
          answers={username:interaction.fields.getTextInputValue("username"),service:interaction.fields.getTextInputValue("service"),description:interaction.fields.getTextInputValue("description"),budget:interaction.fields.getTextInputValue("budget"),payment:interaction.fields.getTextInputValue("payment")};
        } else if(type==="partnership"){
          answers={serverName:interaction.fields.getTextInputValue("serverName"),invite:interaction.fields.getTextInputValue("invite"),memberCount:interaction.fields.getTextInputValue("memberCount"),focus:interaction.fields.getTextInputValue("focus"),offering:interaction.fields.getTextInputValue("offering")};
        } else {
          answers={name:interaction.fields.getTextInputValue("name"),topic:interaction.fields.getTextInputValue("topic"),details:interaction.fields.getTextInputValue("details"),urgency:interaction.fields.getTextInputValue("urgency")};
        }
        const member=interaction.member??await interaction.guild?.members.fetch(interaction.user.id).catch(()=>null);
        const result=await openTicket(interaction,member,type,answers);
        if(!result.ok)return interaction.editReply({content:`❌ ${result.error}`});
        return interaction.editReply({content:`✅ Ticket created: <#${result.channel.id}>`});
      }

      if(interaction.customId==="modal_close"){
        const reason=interaction.fields.getTextInputValue("reason");
        const ch=interaction.channel;
        if(!ch?.name?.startsWith("ticket-"))return interaction.reply({content:"❌ Not a ticket channel.",flags:MessageFlags.Ephemeral});
        await interaction.deferReply({flags:MessageFlags.Ephemeral});
        await interaction.editReply({content:"🔒 Closing ticket…"});
        await closeTicket(ch,interaction.member||interaction.user,reason,interaction.guild);
        return;
      }
    }

  } catch(err){
    console.error("[Interaction]",err.message);
    await sendErrorLog(err,"Interaction handler");
    try{if(interaction.isRepliable()&&!interaction.replied&&!interaction.deferred)await interaction.reply({content:"❌ An error occurred.",flags:MessageFlags.Ephemeral});}catch{}
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  GUILD EVENTS
// ═══════════════════════════════════════════════════════════════════════════

client.on("guildCreate", async g => {
  console.log(`Joined: ${g.name}`); updateStatus();
  await cacheInvites(g).catch(()=>{});
  const ch=g.channels.cache.filter(c=>c.type===ChannelType.GuildText&&c.permissionsFor(g.members.me)?.has(PermissionFlagsBits.SendMessages)).sort((a,b)=>a.rawPosition-b.rawPosition).first();
  if(ch)await ch.send({embeds:[new EmbedBuilder().setColor(BRAND_COLOR).setTitle(`🧸 ${BOT_NAME} v${BOT_VERSION} — Setup`).setDescription(`Thanks for adding me to **${g.name}**!\n\n**Required setup:**\n\`${PREFIX}setlog #channel\`\n\`${PREFIX}setreviews #channel\`\n\`${PREFIX}settranscripts #channel\`\n\`${PREFIX}ticketpanel\`\n\`${PREFIX}ticketrole add @role\`\n\`${PREFIX}antiraid enable\`\n\`${PREFIX}antinuke enable\`\n\n**AI:** ${GROQ_API_KEY?"✅ Enabled":"❌ Add GROQ_API_KEY to .env"}\n**Image Gen:** ${STABILITY_API_KEY?"✅ Stability AI":OPENAI_API_KEY?"✅ DALL-E 3":"🟡 Pollinations (free)"}\n**Lofi VC:** Auto-joins <#${LOFI_VC_CHANNEL_ID}>`).setFooter({text:`${BOT_NAME} v${BOT_VERSION} • Made with 💗 by ${BOT_OWNER}`}).setTimestamp()]}).catch(()=>{});
  try{const hg=client.guilds.cache.get(HOME_GUILD_ID);if(!hg)return;const lch=await hg.channels.fetch(GUILD_JOIN_LOG_CHANNEL).catch(()=>null);if(lch?.isTextBased()){const o=await client.users.fetch(g.ownerId).catch(()=>null);await lch.send({embeds:[E.success("✅ Joined Server").addFields({name:"Server",value:g.name,inline:true},{name:"ID",value:g.id,inline:true},{name:"Owner",value:o?.tag||g.ownerId,inline:true},{name:"Members",value:`${g.memberCount}`,inline:true},{name:"Total",value:`${client.guilds.cache.size}`,inline:true}).setTimestamp()]});}}catch{}
});

client.on("guildDelete", async g => {
  console.log(`Left: ${g.name}`); updateStatus();
  try{const hg=client.guilds.cache.get(HOME_GUILD_ID);if(!hg)return;const ch=await hg.channels.fetch(GUILD_LEAVE_LOG_CHANNEL).catch(()=>null);if(ch?.isTextBased())await ch.send({embeds:[E.error("❌ Left Server").addFields({name:"Server",value:g.name,inline:true},{name:"ID",value:g.id,inline:true},{name:"Total",value:`${client.guilds.cache.size}`,inline:true}).setTimestamp()]});}catch{}
});

// ═══════════════════════════════════════════════════════════════════════════
//  INVITE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

client.on("inviteCreate", inv=>{ if(!inv.guild)return;if(!data.inviteCache[inv.guild.id])data.inviteCache[inv.guild.id]={};data.inviteCache[inv.guild.id][inv.code]=inv.uses||0;saveData();});
client.on("inviteDelete", inv=>{ if(!inv.guild)return;if(data.inviteCache[inv.guild.id])delete data.inviteCache[inv.guild.id][inv.code];saveData();});

client.on("guildMemberAdd", async member=>{
  try{
    await handleAntiRaidJoin(member);
    const g=member.guild;
    const newInv=await g.invites.fetch().catch(()=>null);
    if(newInv){const cached=data.inviteCache[g.id]||{};let inviterId=null;newInv.forEach(inv=>{if((inv.uses||0)>(cached[inv.code]||0))inviterId=inv.inviter?.id;cached[inv.code]=inv.uses||0;});data.inviteCache[g.id]=cached;if(inviterId){if(!data.invites[g.id])data.invites[g.id]={};if(!data.invites[g.id][inviterId])data.invites[g.id][inviterId]={invited:0,left:0};data.invites[g.id][inviterId].invited++;}saveData();}
    await logMod(g,E.success("📥 Member Joined").addFields({name:"User",value:`<@${member.id}> (${member.user.tag})`},{name:"Account Age",value:`<t:${Math.floor(member.user.createdTimestamp/1000)}:R>`}).setThumbnail(member.user.displayAvatarURL()).setTimestamp());
  }catch{}
});

client.on("guildMemberRemove", async member=>{
  try{if(data.invites[member.guild.id]){for(const inv of Object.values(data.invites[member.guild.id])){inv.left++;break;}saveData();}
  await logMod(member.guild,E.error("📤 Member Left").addFields({name:"User",value:`<@${member.id}> (${member.user.tag})`}).setThumbnail(member.user.displayAvatarURL()).setTimestamp());}catch{}
});

// ═══════════════════════════════════════════════════════════════════════════
//  EXTENDED LOGGING
// ═══════════════════════════════════════════════════════════════════════════

client.on("messageDelete",async msg=>{try{if(!msg.guild||msg.author?.bot||msg.partial||!msg.content)return;await logMod(msg.guild,E.error("🗑️ Message Deleted").addFields({name:"Author",value:`<@${msg.author.id}>`,inline:true},{name:"Channel",value:`<#${msg.channel.id}>`,inline:true},{name:"Content",value:msg.content.slice(0,1024)}).setTimestamp());}catch{}});
client.on("messageUpdate",async(o,n)=>{try{if(!n.guild||n.author?.bot||o.partial||n.partial||o.content===n.content)return;await logMod(n.guild,E.warn("✏️ Message Edited").addFields({name:"Author",value:`<@${n.author.id}>`,inline:true},{name:"Channel",value:`<#${n.channel.id}>`,inline:true},{name:"Before",value:(o.content||"—").slice(0,1024)},{name:"After",value:(n.content||"—").slice(0,1024)},{name:"Link",value:`[Jump](${n.url})`,inline:true}).setTimestamp());}catch{}});
client.on("roleCreate",async r=>{try{await logMod(r.guild,E.success("🎭 Role Created").addFields({name:"Name",value:r.name,inline:true},{name:"ID",value:r.id,inline:true}).setTimestamp());}catch{}});
client.on("roleDelete",async r=>{
  try{await logMod(r.guild,E.error("🎭 Role Deleted").addFields({name:"Name",value:r.name,inline:true},{name:"ID",value:r.id,inline:true}).setTimestamp());
  const logs=await r.guild.fetchAuditLogs({type:AuditLogEvent.RoleDelete,limit:1}).catch(()=>null);
  if(logs){const e=logs.entries.first();if(e)await checkNuke(r.guild,e.executor.id,"roleDelete");}}catch{}
});
client.on("channelCreate",async ch=>{try{if(!ch.guild)return;await logMod(ch.guild,E.success("💬 Channel Created").addFields({name:"Name",value:ch.name,inline:true},{name:"ID",value:ch.id,inline:true}).setTimestamp());}catch{}});
client.on("channelDelete",async ch=>{
  try{if(!ch.guild)return;await logMod(ch.guild,E.error("💬 Channel Deleted").addFields({name:"Name",value:ch.name,inline:true},{name:"ID",value:ch.id,inline:true}).setTimestamp());
  const logs=await ch.guild.fetchAuditLogs({type:AuditLogEvent.ChannelDelete,limit:1}).catch(()=>null);
  if(logs){const e=logs.entries.first();if(e)await checkNuke(ch.guild,e.executor.id,"channelDelete");}}catch{}
});
client.on("guildBanAdd",async ban=>{
  try{await logMod(ban.guild,E.error("🔨 Member Banned").addFields({name:"User",value:`${ban.user.tag} (${ban.user.id})`},{name:"Reason",value:ban.reason||"No reason"}).setTimestamp());
  const logs=await ban.guild.fetchAuditLogs({type:AuditLogEvent.MemberBanAdd,limit:1}).catch(()=>null);
  if(logs){const e=logs.entries.first();if(e)await checkNuke(ban.guild,e.executor.id,"ban");}}catch{}
});
client.on("guildBanRemove",async ban=>{try{await logMod(ban.guild,E.success("🔓 Member Unbanned").addFields({name:"User",value:`${ban.user.tag} (${ban.user.id})`}).setTimestamp());}catch{}});
client.on("guildMemberUpdate",async(o,n)=>{try{const changes=[];if(o.nickname!==n.nickname)changes.push(`Nick: **${o.nickname||"None"}** → **${n.nickname||"None"}**`);const added=n.roles.cache.filter(r=>!o.roles.cache.has(r.id));const removed=o.roles.cache.filter(r=>!n.roles.cache.has(r.id));if(added.size)changes.push(`Roles added: ${added.map(r=>`<@&${r.id}>`).join(", ")}`);if(removed.size)changes.push(`Roles removed: ${removed.map(r=>`<@&${r.id}>`).join(", ")}`);if(!changes.length)return;await logMod(n.guild,E.info("👤 Member Updated").addFields({name:"User",value:`<@${n.id}>`},{name:"Changes",value:changes.join("\n")}).setTimestamp());}catch{}});
client.on("voiceStateUpdate",async(o,n)=>{try{if(o.channelId===n.channelId)return;let desc="";if(!o.channelId&&n.channelId)desc=`<@${n.id}> joined **${n.channel?.name}**`;else if(o.channelId&&!n.channelId)desc=`<@${o.id}> left **${o.channel?.name}**`;else desc=`<@${n.id}> moved from **${o.channel?.name}** to **${n.channel?.name}**`;await logMod(n.guild,E.info("🔊 Voice Update").setDescription(desc).setTimestamp());}catch{}});

// ═══════════════════════════════════════════════════════════════════════════
//  ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

client.on("error", async err => { console.error("Client error:", err); await sendErrorLog(err,"Client error"); });
process.on("unhandledRejection", async err => { console.error("Unhandled rejection:", err); await sendErrorLog(err,"Unhandled rejection"); });
process.on("uncaughtException",  async err => { console.error("Uncaught exception:", err); await sendErrorLog(err,"Uncaught exception"); });

// ═══════════════════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════════════════

client.login(TOKEN);

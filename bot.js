"use strict";

const fs = require("fs");
const path = require("path");
const {
  Client, GatewayIntentBits, Partials, ChannelType, PermissionFlagsBits,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
  AuditLogEvent, ActivityType, AttachmentBuilder, REST, Routes, SlashCommandBuilder,
} = require("discord.js");
require("dotenv").config();

// ── ENV ──────────────────────────────────────────────────────────────────────
const TOKEN      = process.env.DISCORD_TOKEN?.trim()     || "";
const CLIENT_ID  = process.env.CLIENT_ID?.trim()         || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY?.trim()    || "";
if (!TOKEN) { console.error("❌ DISCORD_TOKEN missing"); process.exit(1); }

const ENV = {
  HOME:   process.env.HOME_GUILD_ID?.trim()            || "",
  ERR:    process.env.ERROR_CHANNEL_ID?.trim()         || "",
  LVL:    process.env.LEVELUP_CHANNEL_ID?.trim()       || "",
  STICKY: process.env.STICKY_CHANNEL_ID?.trim()        || "",
  ORDER:  process.env.ORDER_CHANNEL_ID?.trim()         || "",
  FORUM:  process.env.FORUM_SUPPORT_CHANNEL_ID?.trim() || "",
  PAD:    process.env.PARTNER_AD_CHANNEL_ID?.trim()    || "",
};

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const NAME  = "Snuggles Scripting";
const VER   = "12.0.0";
const OWNER = "Snuggles";
const FT    = `${NAME} v${VER}`;

const C = {
  brand:   0xFF8FB1,
  success: 0x57F287,
  warn:    0xFEE75C,
  error:   0xED4245,
  info:    0x5865F2,
  gold:    0xF1C40F,
  xp:      0x2ECC71,
  ai:      0x7289DA,
  img:     0xE91E8C,
  scam:    0xFF0000,
  note:    0x9B59B6,
  mod:     0xEB459E,
  raid:    0xFF4757,
  nuke:    0xFF6B35,
  roblox:  0x00A2FF,
};

const IMG_STYLES = {
  realistic: "ultra realistic, photographic, 8k, sharp detail",
  anime:     "anime style, vibrant colors, Studio Ghibli inspired",
  cartoon:   "cartoon, colorful, bold outlines, fun style",
  fantasy:   "fantasy art, epic, magical atmosphere, highly detailed",
  minimal:   "minimalist, clean, simple, elegant design",
  pixel:     "pixel art, 16-bit retro game style",
  oil:       "oil painting, impressionist, textured canvas strokes",
  sketch:    "detailed pencil sketch, lineart, black and white",
};

const OS = {
  not_started:        { label: "Not Started",       emoji: "🔴", color: 0xED4245 },
  in_progress:        { label: "In Progress",        emoji: "🔵", color: 0x5865F2 },
  almost_complete:    { label: "Almost Complete",    emoji: "🟠", color: 0xFFA500 },
  partially_complete: { label: "Partially Complete", emoji: "🟡", color: 0xFEE75C },
  completed:          { label: "Completed",          emoji: "🟢", color: 0x57F287 },
  cancelled:          { label: "Cancelled",          emoji: "⚪", color: 0x95A5A6 },
  on_hold:            { label: "On Hold",            emoji: "⏸️", color: 0x9B59B6 },
  revision:           { label: "In Revision",        emoji: "🔄", color: 0xF1C40F },
};

const SHOP = [
  { id: "role_color",     name: "Custom Role Color",   price: 500,  emoji: "🎨", desc: "Request a custom role color — staff will apply it." },
  { id: "code_review",    name: "Code Review Voucher", price: 300,  emoji: "🔍", desc: "One in-depth code review from our scripting staff." },
  { id: "priority_queue", name: "Priority Queue",      price: 750,  emoji: "⚡", desc: "Your next commission gets bumped to front of queue." },
  { id: "vip_ping",       name: "VIP Ping Access",     price: 1000, emoji: "🔔", desc: "Get pinged for exclusive announcements & early access." },
  { id: "og_badge",       name: "OG Member Badge",     price: 2000, emoji: "🏅", desc: "Exclusive badge marking you as an OG member." },
  { id: "ai_image",       name: "AI Image Pack",       price: 150,  emoji: "🖼️", desc: "5 free AI-generated images via /imagine." },
];

const WORK = [
  { text: "Debugged a gnarly client script",            r: [80,  200] },
  { text: "Built a full datastore system from scratch", r: [100, 250] },
  { text: "Fixed a critical RemoteEvent security bug",  r: [60,  150] },
  { text: "Optimised a client-side UI framework",       r: [50,  180] },
  { text: "Wrote a complete admin command system",      r: [120, 280] },
  { text: "Helped a beginner solve a tricky bug",       r: [30,  80]  },
  { text: "Reviewed and refactored legacy Lua code",    r: [90,  220] },
  { text: "Built an advanced matchmaking system",       r: [150, 350] },
  { text: "Created a custom UI component library",      r: [110, 260] },
  { text: "Wrote an anti-exploit detection module",     r: [130, 300] },
];

const TIPS = [
  "Use `task.wait()` instead of deprecated `wait()` — more accurate and frame-aligned.",
  "Cache `:GetService()` at the top — repeated lookups add up in hot loops.",
  "Parent UI to `PlayerGui` **after** setting all properties to avoid recalculations.",
  "RemoteEvents are fire-and-forget; RemoteFunctions **block** the calling thread.",
  "DataStore writes are rate-limited — prefer `:UpdateAsync` over `:SetAsync`.",
  "**NEVER trust the client.** Validate every RemoteEvent argument server-side.",
  "Wrap DataStore calls in `pcall`/`xpcall` — errors shouldn't crash your game.",
  "Profile **before** optimising — open MicroProfiler (`Ctrl+F6`) and find the bottleneck.",
  "Use `Vector3.zero` and `Vector3.one` — fewer object allocations.",
  "`:Destroy()` instances when done — all connections clean up automatically.",
];

const QUOTES = [
  "Code is poetry — write it like someone you respect will read it.",
  "The best script is the one you can understand six months from now.",
  "Clean code always beats clever code.",
  "Every bug is a lesson disguised as frustration.",
  "Comment the *why*, not the *what*.",
];

const BALL = [
  "It is certain.", "Without a doubt.", "Yes — definitely.", "Most likely.", "Outlook good.",
  "Reply hazy, try again.", "Ask again later.", "Don't count on it.", "My reply is no.", "Very doubtful.",
];

const TRIVIA = [
  { q: "What Lua function replaces deprecated `wait()` in modern Roblox?", a: ["task.wait"],       hint: "It's inside the `task` library." },
  { q: "What does `pcall` stand for?",                                      a: ["protected call"],  hint: "It prevents crashes on errors." },
  { q: "Which service handles player data persistence in Roblox?",          a: ["datastoreservice"],hint: "Use `game:GetService()`." },
  { q: "What event fires on Players when a player joins?",                  a: ["playeradded"],     hint: "It's on the `Players` service." },
  { q: "What keyword makes a Lua variable local to its scope?",             a: ["local"],           hint: "Best practice for all variables." },
];

const DAILY = [
  { text: "🎁 **Code Review Tip** — comment your trickiest function and tag staff!", coins: 50  },
  { text: "🎁 **5% Discount Voucher** — DM staff with code `SNUGSAVE5`.",            coins: 75  },
  { text: "🎁 **Priority Queue Token** — your next ticket gets a faster response.",   coins: 100 },
  { text: "🎁 **Double Vibe Day** — extra good luck for anything Roblox-related!",    coins: 80  },
  { text: "🎁 **AI Image Token** — use `/imagine` to generate something cool!",       coins: 55  },
];

const RULES = [
  "**1. Be Respectful** — Treat everyone with kindness. No harassment, hate speech, slurs, bullying, or personal attacks of any kind.",
  "**2. No Spam or Flooding** — Don't spam messages, reactions, images, or mentions. Repeated flooding will result in a timeout.",
  "**3. Keep It SFW** — All content must be safe for work. No NSFW images, links, references, or discussions anywhere in this server.",
  "**4. Use the Right Channels** — Post in the appropriate channels. Off-topic content will be removed. Check the channel descriptions.",
  "**5. No Scams or Phishing** — Sharing phishing links, scam DMs, or fake giveaways is an instant permanent ban.",
  "**6. No Advertising** — Do not promote servers, products, or services without explicit staff permission. Use the ticket system to apply for partnerships.",
  "**7. No Impersonation** — Impersonating staff, other members, or public figures is strictly prohibited.",
  "**8. English in Main Channels** — Please use English in main channels so everyone can communicate. Other languages are fine in DMs.",
  "**9. Respect Staff Decisions** — Staff decisions are final. If you disagree, open a support ticket — do not argue in public channels.",
  "**10. No Doxxing or Privacy Violations** — Never share anyone's real name, address, phone number, or personal info without their consent.",
  "**11. No Illegal Content** — Do not share anything illegal including pirated content, malware, exploits, or cheat software.",
  "**12. No Political or Religious Debates** — Heated political and religious debates are not welcome here. Keep things peaceful.",
  "**13. No Drama or Toxicity** — Leave personal conflicts outside the server. Persistent negativity or drama will result in removal.",
  "**14. No Minimodding** — Don't attempt to moderate other users. If there's an issue, report it to staff via ticket.",
  "**15. Follow Discord's Guidelines** — All users must comply with [Discord's TOS](https://discord.com/terms) and [Community Guidelines](https://discord.com/guidelines) at all times.",
];

const SERVICES = [
  { name: "🛠️ Custom Scripts", value: "Gameplay systems, tools, weapons, vehicles, NPCs, and more." },
  { name: "📋 Commissions",    value: "Full commissioned work — from small tweaks to complete game systems." },
  { name: "⚙️ Game Systems",   value: "Inventory, shop, datastore, leaderboards, matchmaking, admin, anti-exploit." },
  { name: "🎨 UI / GUIs",      value: "Polished in-game interfaces, menus, HUDs, and custom UI frameworks." },
  { name: "🐛 Debugging Help", value: "Stuck on a bug? Use `s!debug` for a template and post in support." },
  { name: "🔎 Code Reviews",   value: "Professional feedback — performance, structure, and best practices." },
];

const DOCS = [
  { name: "📖 Creator Docs",       value: "https://create.roblox.com/docs" },
  { name: "📚 Engine API",         value: "https://create.roblox.com/docs/reference/engine" },
  { name: "🌙 Luau Reference",     value: "https://luau-lang.org/" },
  { name: "💬 DevForum Scripting", value: "https://devforum.roblox.com/c/help-and-feedback/scripting-support/55" },
  { name: "✏️ Style Guide",        value: "https://roblox.github.io/lua-style-guide/" },
];

const SCRIPTS = {
  ui: {
    title: "Basic ScreenGui",
    code: `local Players = game:GetService("Players")
local player = Players.LocalPlayer
local gui = Instance.new("ScreenGui", player:WaitForChild("PlayerGui"))
gui.ResetOnSpawn = false
local frame = Instance.new("Frame", gui)
frame.Size = UDim2.fromOffset(260, 140)
frame.Position = UDim2.fromScale(0.5, 0.5)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.BackgroundColor3 = Color3.fromRGB(24, 24, 28)
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 10)
local label = Instance.new("TextLabel", frame)
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.Text = "Hello, " .. player.Name .. "!"
label.TextColor3 = Color3.new(1, 1, 1)
label.Font = Enum.Font.GothamBold
label.TextSize = 20`,
  },
  datastore: {
    title: "Safe DataStore + Auto-Save",
    code: `local DSS = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local store = DSS:GetDataStore("PlayerData_v1")
local cache = {}
local function load(p)
  local ok, d = pcall(store.GetAsync, store, p.UserId)
  cache[p.UserId] = (ok and d) or { coins = 0, level = 1 }
end
local function save(p)
  local d = cache[p.UserId]; if not d then return end
  local ok, err = pcall(store.SetAsync, store, p.UserId, d)
  if not ok then warn("[DS] Save failed:", err) end
end
Players.PlayerAdded:Connect(load)
Players.PlayerRemoving:Connect(function(p) save(p); cache[p.UserId] = nil end)
game:BindToClose(function() for _, p in Players:GetPlayers() do save(p) end end)`,
  },
  remote: {
    title: "Secure RemoteEvent Pattern",
    code: `local RS = game:GetService("ReplicatedStorage")
local GiveCoins = Instance.new("RemoteEvent", RS)
GiveCoins.Name = "GiveCoins"
GiveCoins.OnServerEvent:Connect(function(player, amount)
  amount = math.clamp(tonumber(amount) or 0, 0, 100)
  print(player.Name, "received", amount, "coins")
end)`,
  },
  movement: {
    title: "Custom Movement Values",
    code: `local Players = game:GetService("Players")
local S = { WalkSpeed = 24, JumpPower = 60 }
local function apply(char)
  local h = char:WaitForChild("Humanoid")
  h.WalkSpeed = S.WalkSpeed; h.JumpPower = S.JumpPower; h.UseJumpPower = true
end
Players.PlayerAdded:Connect(function(p)
  if p.Character then apply(p.Character) end
  p.CharacterAdded:Connect(apply)
end)`,
  },
  admin: {
    title: "Simple Admin Command System",
    code: `local Players = game:GetService("Players")
local ADMINS = { ["YourUsername"] = true }
local commands = {}
commands.kick = function(src, args)
  local t = Players:FindFirstChild(args[1] or "")
  if t then t:Kick("Kicked by admin.") end
end
commands.speed = function(src, args)
  if src.Character then
    src.Character.Humanoid.WalkSpeed = tonumber(args[1]) or 16
  end
end
Players.PlayerAdded:Connect(function(player)
  player.Chatted:Connect(function(msg)
    if not ADMINS[player.Name] then return end
    if msg:sub(1,1) ~= "/" then return end
    local parts = msg:sub(2):split(" ")
    local fn = commands[parts[1]:lower()]
    if fn then fn(player, { table.unpack(parts, 2) }) end
  end)
end)`,
  },
};

const PAY_METHODS = [
  { name: "💵 USD Payments",   value: "PayPal Friends & Family · CashApp · Gift Cards" },
  { name: "🎮 Robux",          value: "Group Payout (buyer pays 30% tax)" },
  { name: "💳 Pricing Guide",  value: "Simple scripts: $5–25 · UI/GUIs: $20–60 · Full systems: $60–250+" },
];

const SYS = {
  partnership: `You are **Snuggles AI** — partnership manager for **Snuggles Scripting**, a professional Roblox scripting Discord.
Tiers: 🌱 Small (45-69) ✨ Mid (70-119) 🔥 Large (120+) — minimum 45 members required.
Payment: USD (PayPal F&F / CashApp), Robux group payout (buyer pays 30% tax), gift cards.
Tone: Warm, professional, genuine. Reply in ONE complete message. End by asking for their server ad text.`,

  inquiry: `You are **Snuggles AI** — 24/7 support for **Snuggles Scripting**.
Services: Roblox/Luau scripting — game systems, UI, datastores, admin, anti-exploit, matchmaking, weapons, animations.
Pricing: simple scripts $5-25 • UI $20-60 • full systems $60-250+
Payment: USD (PayPal F&F / CashApp), Robux group payout, gift cards. All sales FINAL — no refunds.
ToS: https://docs.google.com/document/d/13dYCdrmj9mU9jWmEYONExBDnfcwYlQfxR6UJdZRsP28
Reply in ONE complete message. Be helpful, confident, warm. Returning customers get 5% loyalty discount.`,

  chat: `You are **Snuggles AI** — a smart, friendly assistant in the Snuggles Scripting Discord.
Help with coding, writing, math, creative projects, analysis, or casual chat.
Be accurate, concise, and genuinely helpful. Respond in one complete message.`,

  img: `You are an expert image prompt engineer. Enhance the user's description into a detailed generation prompt.
Include: subject detail, art style, lighting, mood, colour palette, composition, quality descriptors.
Keep under 180 words. Output ONLY the enhanced prompt — no preamble, no explanation.`,
};

// ── EXPANDED SCAM KEYWORDS ────────────────────────────────────────────────────
const SCAM_PATTERNS = [
  // Free stuff / giveaway scams
  /free\s*(nitro|robux|vbucks|gift\s*card)/i,
  /claim\s*your\s*(free|prize|reward|gift)/i,
  /you\s*(won|have\s*won|just\s*won)/i,
  /congratulations.*won/i,
  /get\s*free\s*(discord|nitro|robux)/i,
  /giveaway.*click/i,

  // Phishing / link bait
  /discordgift\.com/i,
  /discord\.gift\.[a-z]/i,
  /discord-gift/i,
  /discordnitro/i,
  /steamcommunity\.com\.[a-z]/i,
  /click\s*(here|this|the\s*link).{0,30}(free|claim|win|prize)/i,
  /bit\.ly.{0,40}(free|nitro|robux)/i,

  // Trading scams
  /i\s*(will|can)\s*pay\s*(double|2x|triple)/i,
  /trust\s*trade/i,
  /middleman\s*scam/i,
  /send\s*(first|robux\s*first|money\s*first)/i,
  /pay\s*me\s*first/i,

  // Investment / money scams
  /double\s*your\s*(money|robux|coins)/i,
  /invest\s*(now|today|here)/i,
  /guaranteed\s*(profit|return|earning)/i,
  /make\s*\$?\d+.*per\s*(day|week|hour)/i,
  /crypto\s*(investment|opportunity|profit)/i,
  /send\s*\d+.*get\s*\d+\s*(back|return)/i,

  // Fake job / work offers
  /hiring.*\$\d+.*(hour|day|week)/i,
  /work\s*from\s*home.*easy\s*money/i,
  /earn\s*(money|cash|robux)\s*easily/i,
  /passive\s*income.*click/i,

  // Account / credential theft
  /verify\s*your\s*account.*link/i,
  /your\s*account\s*(will\s*be\s*)?deleted/i,
  /account\s*suspended.*click/i,
  /unusual\s*activity.*verify/i,
  /enter\s*your\s*(password|token|credentials)/i,
  /stolen\s*account/i,

  // Explicit scam signals
  /i\s*am\s*scamming/i,
  /running\s*a\s*scam/i,
  /i\s*scammed/i,
];

const SCAM_KEYWORDS = [
  "free nitro", "free robux", "free vbucks", "claim your prize",
  "click this link", "airdrop", "crypto giveaway", "limited time offer",
  "you have been selected", "congratulations you won", "send money first",
  "trust trade", "pay first", "dm me for free", "discord token",
  "account verify link", "your account will be banned", "report to get free",
  "nitro generator", "robux hack", "exploit download", "rat download",
  "keylogger", "grab your", "limited giveaway", "urgent claim",
];

// ── DATA ────────────────────────────────────────────────────────────────────
const DF = path.join(__dirname, "data.json");

function defaultData() {
  return {
    nextOrderId: 1, nextWarnId: 1, nextReviewId: 1, nextScamId: 1,
    orders: [], blacklist: [], warns: {}, modLogChannels: {}, portfolio: [], reviews: [],
    dailyClaims: {}, settings: {},
    stats: {
      ticketsOpened: 0, ticketsClosed: 0, ordersCreated: 0, ordersCompleted: 0,
      reviewsSubmitted: 0, imagesGenerated: 0, massAnnouncementsSent: 0,
    },
    leveling: {}, economy: {}, invites: {}, inviteCache: {}, stickyMessages: {},
    triviaActive: {}, giveaways: {}, antiRaid: {}, antiNuke: {}, reactionRoles: {},
    robloxVerified: {}, verificationCodes: {}, scamReports: {}, serverBackups: {},
    scamWarnings: {},
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DF)) return defaultData();
    const parsed = JSON.parse(fs.readFileSync(DF, "utf8"));
    const base = defaultData();
    const out = {};
    for (const k of Object.keys(base)) {
      if (Array.isArray(base[k]))        out[k] = Array.isArray(parsed[k]) ? parsed[k] : base[k];
      else if (base[k] && typeof base[k] === "object") out[k] = parsed[k] && typeof parsed[k] === "object" ? { ...base[k], ...parsed[k] } : base[k];
      else                               out[k] = parsed[k] ?? base[k];
    }
    return out;
  } catch (e) {
    console.error("data.json load failed:", e.message);
    return defaultData();
  }
}

let _saveTimer = null;
function saveData() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DF, JSON.stringify(data, null, 2)); } catch (e) { console.error("Save failed:", e.message); }
  }, 500);
}

const data = loadData();

const gS  = gid => { if (!data.settings[gid])  data.settings[gid]  = {}; return data.settings[gid]; };
const gE  = uid => { if (!data.economy[uid])    data.economy[uid]   = { coins: 0, lastCoinAt: 0, inventory: [] }; return data.economy[uid]; };
const gL  = uid => { if (!data.leveling[uid])   data.leveling[uid]  = { xp: 0, level: 1, lastXpAt: 0, totalMessages: 0 }; return data.leveling[uid]; };
const gAR = gid => {
  if (!data.antiRaid[gid]) data.antiRaid[gid] = { enabled: false, threshold: 8, window: 10000, action: "kick", autoUnlock: 30000, whitelistedUsers: [], whitelistedRoles: [], notifyChannel: null, dmOnAction: true };
  return data.antiRaid[gid];
};
const gAN = gid => {
  if (!data.antiNuke[gid]) data.antiNuke[gid] = { enabled: false, banThreshold: 5, channelDeleteThreshold: 3, roleDeleteThreshold: 3, kickThreshold: 5, window: 10000, action: "ban", trustedRoles: [], trustedUsers: [], notifyChannel: null };
  return data.antiNuke[gid];
};

// ── UTILS ────────────────────────────────────────────────────────────────────
const XP_MSG = 15, XP_CD = 60000, XP_V = 10, BASE_XP = 100, XP_SC = 1.35;
const COINS_MSG = 5, COINS_CD = 30000;
const xpFor = lv => Math.floor(BASE_XP * Math.pow(XP_SC, lv - 1));
const ri    = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const T     = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

function parseDur(s) {
  const m = String(s || "").toLowerCase().trim().match(/^(\d+)\s*(s|m|h|d)?$/);
  if (!m) return null;
  const ms = parseInt(m[1]) * (T[m[2] || "m"]);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

function fmtDur(ms) {
  const d = Math.floor(ms / T.d), h = Math.floor((ms % T.d) / T.h);
  const m = Math.floor((ms % T.h) / T.m), s = Math.floor((ms % T.m) / T.s);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, (!d && !h && s) ? `${s}s` : null].filter(Boolean).join(" ") || "0s";
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const isAdmin = m  => !!(m?.permissions?.has(PermissionFlagsBits.Administrator));
const isStaff = m  => isAdmin(m) || !!(m?.permissions?.has(PermissionFlagsBits.ManageMessages));
const hP      = (m, f) => !!(m?.permissions?.has(f));
const findOrder  = id => { const n = Number(id); return Number.isFinite(n) ? data.orders.find(o => o.id === n) || null : null; };
const hasOrdered = uid => data.orders.some(o => o.userId === uid);
const gOS        = s => OS[s] || { label: s, emoji: "❓", color: C.brand };

const _cds = new Map();
const CDS = {
  review: 3600000, meme: 8000, "8ball": 3000, rate: 5000, quote: 5000,
  tip: 5000, daily: 86400000, snippet: 5000, dowork: 3600000, trivia: 5000,
  coinflip: 3000, roll: 3000, rps: 3000, serverinfo: 5000, imagine: 30000,
  verify: 300000, reportscammer: 60000, ai: 3000, announce: 30000,
};
const chkCD = (c, u) => { const r = (_cds.get(`${c}:${u}`) || 0) - Date.now(); return r > 0 ? Math.ceil(r / 1000) : 0; };
const useCD = (c, u) => { const ms = CDS[c]; if (ms) _cds.set(`${c}:${u}`, Date.now() + ms); };

// ── SNIPE / AFK CACHES ───────────────────────────────────────────────────────
const snipeCache     = new Map(); // channelId -> { content, author, authorAvatar, timestamp }
const editSnipeCache = new Map(); // channelId -> { before, after, author, authorAvatar, timestamp }
const afkUsers       = new Map(); // userId -> { reason, timestamp }

// ── CLIENT ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
});

// ── EMBEDS ────────────────────────────────────────────────────────────────────
const E = {
  mk: (col, t) => new EmbedBuilder().setColor(col).setTitle(t || null),
  b:  t => new EmbedBuilder().setColor(C.brand).setTitle(t || null),
  ok: t => new EmbedBuilder().setColor(C.success).setTitle(t || null),
  er: t => new EmbedBuilder().setColor(C.error).setTitle(t || null),
  w:  t => new EmbedBuilder().setColor(C.warn).setTitle(t || null),
  i:  t => new EmbedBuilder().setColor(C.info).setTitle(t || null),
  g:  t => new EmbedBuilder().setColor(C.gold).setTitle(t || null),
  xp: t => new EmbedBuilder().setColor(C.xp).setTitle(t || null),
  mo: t => new EmbedBuilder().setColor(C.mod).setTitle(t || null),
  sc: t => new EmbedBuilder().setColor(C.scam).setTitle(t || null),
  rb: t => new EmbedBuilder().setColor(C.roblox).setTitle(t || null),
};
const ft = e => e.setFooter({ text: FT }).setTimestamp();

const aiE = (text, model, user, type) => new EmbedBuilder()
  .setColor(C.ai)
  .setAuthor({ name: "Snuggles AI", iconURL: client.user?.displayAvatarURL() })
  .setDescription(text.length > 4000 ? text.slice(0, 3997) + "…" : text)
  .setFooter({ text: `${{ partnership: "🤝", inquiry: "💬", forum: "📋", chat: "🤖" }[type] || "🤖"} ${model || "AI"} · ${user}` })
  .setTimestamp();

async function logMod(guild, emb) {
  const id = data.modLogChannels[guild?.id];
  if (!id) return;
  const ch = await guild.channels.fetch(id).catch(() => null);
  if (ch?.isTextBased()) ch.send({ embeds: [emb] }).catch(() => {});
}

async function errLog(err, ctx = "") {
  try {
    if (!ENV.HOME || !ENV.ERR) return;
    const g = client.guilds.cache.get(ENV.HOME);
    if (!g) return;
    const ch = await g.channels.fetch(ENV.ERR).catch(() => null);
    if (!ch?.isTextBased()) return;
    ch.send({ embeds: [E.er("🚨 Error").addFields({ name: "Context", value: ctx || "—" }, { name: "Error", value: `\`\`\`${String(err?.message || err).slice(0, 900)}\`\`\`` }).setTimestamp()] });
  } catch {}
}

async function rep(interaction, payload, eph = false) {
  try {
    const flags = eph ? MessageFlags.Ephemeral : undefined;
    const opt = typeof payload === "string" ? { content: payload, flags } : { ...payload, flags };
    if (interaction.deferred || interaction.replied) return interaction.editReply(opt);
    return interaction.reply(opt);
  } catch (e) { console.error("[rep]", e.message); }
}

// ── SLASH COMMANDS ────────────────────────────────────────────────────────────
function buildSlash() {
  function addOpt(b, type, name, desc, req, extra) {
    const map = {
      string: "addStringOption", integer: "addIntegerOption",
      user: "addUserOption", role: "addRoleOption", channel: "addChannelOption",
    };
    return b[map[type]](opt => {
      opt.setName(name).setDescription(desc);
      if (req != null) opt.setRequired(req);
      if (extra?.min  != null) opt.setMinValue(extra.min);
      if (extra?.max  != null) opt.setMaxValue(extra.max);
      if (extra?.choices) opt.addChoices(...extra.choices);
      return opt;
    });
  }

  const statusChoices = Object.entries(OS).map(([v, s]) => ({ name: `${s.emoji} ${s.label}`, value: v }));
  const styleChoices  = Object.keys(IMG_STYLES).map(s => ({ name: s, value: s }));
  const scriptChoices = [
    { name: "UI", value: "ui" }, { name: "DataStore", value: "datastore" },
    { name: "RemoteEvent", value: "remote" }, { name: "Movement", value: "movement" },
    { name: "Admin System", value: "admin" },
  ];
  const rpsChoices    = [{ name: "Rock 🪨", value: "rock" }, { name: "Paper 📄", value: "paper" }, { name: "Scissors ✂️", value: "scissors" }];
  const actionChoices = [{ name: "Kick", value: "kick" }, { name: "Ban", value: "ban" }, { name: "Alert Only", value: "none" }];
  const nukeChoices   = [{ name: "Ban", value: "ban" }, { name: "Kick", value: "kick" }, { name: "Strip Roles", value: "strip" }];

  const simple = [
    ["help",    "📖 All commands",     [["integer", "page", "Page 1-6", false, { min: 1, max: 6 }]]],
    ["info",    "🧸 Bot info"],
    ["ping",    "📶 Latency"],
    ["status",  "🟢 Status"],
    ["rules",   "📜 Rules"],
    ["uptime",  "⏱️ Uptime"],
    ["invite",  "🔗 Invite bot"],
    ["setup",   "⚙️ Setup guide"],
    ["ai",      "🤖 Chat with AI",     [["string", "message", "Your message", true]]],
    ["ai-reset","🧹 Clear AI history"],
    ["imagine", "🎨 Generate image",   [["string", "prompt", "Describe image", true], ["string", "style", "Art style", false, { choices: styleChoices }]]],
    ["aioff",   "🔇 Disable AI in ticket"],
    ["aion",    "🔊 Enable AI in ticket"],
    ["services","🛍️ Services"],
    ["prices",  "💳 Pricing"],
    ["pay",     "💸 Payment links"],
    ["orderinfo","📦 Check order",     [["integer", "id", "Order ID", true]]],
    ["discount","🎟️ Loyalty discount"],
    ["ticket",  "🎫 Open ticket"],
    ["portfolio","🎨 Portfolio",       [["integer", "page", "Page", false]]],
    ["script",  "📜 Lua scripts",      [["string", "type", "Type", true, { choices: scriptChoices }]]],
    ["snippet", "💡 Random snippet"],
    ["docs",    "📚 Docs"],
    ["debug",   "🐛 Bug template"],
    ["tip",     "💡 Tip"],
    ["level",   "📊 Check XP",         [["user", "user", "User", false]]],
    ["rank",    "🏅 Stats card",        [["user", "user", "User", false]]],
    ["leaderboard","🏆 Top 10 XP"],
    ["balance", "💰 Balance",          [["user", "user", "User", false]]],
    ["dowork",  "💼 Earn coins"],
    ["daily",   "🎁 Daily reward"],
    ["shop",    "🛒 Coin shop"],
    ["buy",     "🛍️ Buy item",         [["string", "item", "Item ID", true]]],
    ["review",  "⭐ Submit review",     [["integer", "rating", "1-5 stars", true, { min: 1, max: 5 }], ["string", "type", "Commission type", true], ["string", "message", "Your review", true]]],
    ["vouch",   "✅ Quick vouch",       [["string", "text", "Your vouch", true]]],
    ["quote",   "💭 Quote"],
    ["meme",    "😂 Meme"],
    ["8ball",   "🎱 Magic 8-ball",      [["string", "question", "Your question", true]]],
    ["rate",    "📊 Rate something",    [["string", "thing", "What to rate", true]]],
    ["coinflip","🪙 Flip coin"],
    ["roll",    "🎲 Roll dice",         [["integer", "max", "Max value", false, { min: 2, max: 10000 }]]],
    ["rps",     "🎮 Rock paper scissors",[["string", "choice", "Your pick", true, { choices: rpsChoices }]]],
    ["trivia",  "🧠 Scripting trivia"],
    ["remindme","⏰ Set reminder",      [["string", "time", "e.g. 10m, 1h", true], ["string", "message", "Reminder message", true]]],
    ["color",   "🎨 Preview hex color", [["string", "hex", "Hex e.g. FF8FB1", true]]],
    ["calc",    "🧮 Calculator",        [["string", "expression", "Math expression", true]]],
    ["userinfo","👤 User details",      [["user", "user", "User", false]]],
    ["serverinfo","🏠 Server details"],
    ["avatar",  "🖼️ Get avatar",        [["user", "user", "User", false]]],
    ["banner",  "🖼️ Get banner",        [["user", "user", "User", false]]],
    ["servericon","🖼️ Server icon"],
    ["stats",   "📈 Bot stats"],
    ["invites", "📨 Invite count",      [["user", "user", "User", false]]],
    ["inviteleaderboard","📨 Top inviters"],
    ["verify",  "🟣 Link Roblox",       [["string", "username", "Roblox username", true]]],
    ["checkverify","✅ Complete verify", [["string", "code", "Verification code", true]]],
    ["whois",   "🔍 Roblox lookup",     [["user", "user", "Discord user", false]]],
    ["unverify","❌ Unlink Roblox"],
    ["verifypanel","🟣 Post verify panel",[["channel", "channel", "Channel", true]]],
    ["reportscammer","🚨 Report scammer",[["user", "user", "Scammer", true], ["string", "evidence", "Evidence", true], ["string", "amount", "Amount scammed", false], ["string", "roblox", "Roblox username", false]]],
    ["scammerlist","📋 Scam reports"],
    ["setscamchannel","🚨 Set scam channel",[["channel", "channel", "Channel", true]]],
    ["ban",     "🔨 Ban member",         [["user", "user", "User", true], ["string", "reason", "Reason", false], ["integer", "days", "Delete msg days (0-7)", false, { min: 0, max: 7 }]]],
    ["softban", "🧹 Softban",            [["user", "user", "User", true], ["string", "reason", "Reason", false]]],
    ["kick",    "👢 Kick member",         [["user", "user", "User", true], ["string", "reason", "Reason", false]]],
    ["mute",    "🔇 Timeout member",      [["user", "user", "User", true], ["string", "duration", "e.g. 10m, 1h", true], ["string", "reason", "Reason", false]]],
    ["unmute",  "🔊 Remove timeout",      [["user", "user", "User", true]]],
    ["warn",    "⚠️ Warn member",         [["user", "user", "User", true], ["string", "reason", "Reason", true]]],
    ["warns",   "📋 View warnings",       [["user", "user", "User", true]]],
    ["unwarn",  "✅ Remove warning",      [["integer", "id", "Warning ID", true]]],
    ["clearwarns","🗑️ Clear warnings",   [["user", "user", "User", true]]],
    ["modlogs", "📔 Mod history",         [["user", "user", "User", true]]],
    ["purge",   "🗑️ Bulk delete",        [["integer", "count", "1-100", true, { min: 1, max: 100 }], ["user", "user", "Filter user", false]]],
    ["lock",    "🔒 Lock channel"],
    ["unlock",  "🔓 Unlock channel"],
    ["slowmode","🐢 Set slowmode",        [["integer", "seconds", "0-21600", true, { min: 0, max: 21600 }]]],
    ["nick",    "✏️ Set nickname",        [["user", "user", "User", true], ["string", "name", "New nickname", false]]],
    ["announce","📢 Send announcement",   [["string", "message", "Announcement message", true], ["channel", "channel", "Channel to post in (optional)", false]]],
    ["massdm",  "📨 Mass DM all members", [["string", "message", "DM message to send", true]]],
    ["say",     "💬 Send as bot",         [["string", "message", "Message", true]]],
    ["embed",   "📋 Custom embed",        [["string", "title", "Title", true], ["string", "body", "Body", true], ["string", "color", "Hex color", false]]],
    ["poll",    "📊 Create poll",         [["string", "question", "Question", true], ["string", "options", "Options separated by |", true]]],
    ["giveaway","🎉 Start giveaway",      [["string", "duration", "e.g. 1h, 1d", true], ["string", "prize", "Prize", true], ["integer", "winners", "Winners (default 1)", false, { min: 1, max: 10 }]]],
    ["addorder","📦 Add order",           [["user", "user", "Customer", true], ["string", "details", "Details", true]]],
    ["updateorder","🔄 Update order",     [["integer", "id", "Order ID", true], ["string", "status", "Status", true, { choices: statusChoices }], ["string", "note", "Note", false]]],
    ["complete","✅ Mark order complete",  [["integer", "id", "Order ID", true]]],
    ["blacklist","🚫 Toggle blacklist",   [["user", "user", "User", true]]],
    ["setlog",  "📔 Set mod log channel", [["channel", "channel", "Channel", false]]],
    ["setreviews","⭐ Set reviews channel",[["channel", "channel", "Channel", false]]],
    ["settranscripts","📄 Set transcripts channel",[["channel", "channel", "Channel", false]]],
    ["setverifyrole","🟣 Set verify role", [["role", "role", "Role", true]]],
    ["setlevelupchannel","📊 Set level-up channel",[["channel", "channel", "Channel", true]]],
    ["ticketpanel","🎫 Post ticket panel"],
    ["close",   "🔒 Close ticket",        [["string", "reason", "Reason", true]]],
    ["addnote", "📝 Add staff note",      [["string", "text", "Note", true]]],
    ["givecoins","💰 Give coins",         [["user", "user", "User", true], ["integer", "amount", "Amount", true, { min: 1 }]]],

    // ── 22 NEW COMMANDS ───────────────────────────────────────────────────────
    ["serverscan",  "🔍 Server security scan"],
    ["roleinfo",    "🎭 Role information",       [["role",    "role",    "Role to inspect",    true]]],
    ["channelinfo", "📡 Channel information",    [["channel", "channel", "Channel to inspect", false]]],
    ["membercount", "👥 Detailed member count"],
    ["snipe",       "👻 Last deleted message"],
    ["editsnipe",   "✏️ Last edited message"],
    ["nuke",        "💥 Delete & recreate channel",[["string", "reason", "Reason", false]]],
    ["listbans",    "🔨 List recent bans"],
    ["steal",       "😎 Steal an emoji",         [["string", "emoji", "Emoji or URL", true], ["string", "name", "Name for the emoji", true]]],
    ["joke",        "😂 Random joke"],
    ["fact",        "💡 Random fun fact"],
    ["timestamp",   "🕐 Generate Discord timestamp",[["string", "offset", "Time offset e.g. 1h, 30m (blank = now)", false]]],
    ["firstmessage","📌 Jump to first message",  [["channel", "channel", "Channel", false]]],
    ["botperms",    "🔑 Bot permissions here"],
    ["mock",        "🐸 Mocking spongebob text", [["string", "text", "Text to mock", true]]],
    ["encode",      "🔒 Base64 encode/decode",   [["string", "text", "Text", true], ["string", "mode", "Mode", false, { choices: [{ name: "Encode", value: "encode" }, { name: "Decode", value: "decode" }] }]]],
    ["afk",         "💤 Set/clear AFK status",   [["string", "reason", "AFK reason (blank to clear)", false]]],
    ["clearscam",   "🚫 Clear scam offense count",[["user",   "user",   "User to clear",      true]]],
    ["boosters",    "💎 List server boosters"],
    ["perms",       "🔑 Check user permissions", [["user",    "user",   "User to check",      false]]],
    ["define",      "📖 Dictionary definition",  [["string", "word",   "Word to define",     true]]],
    ["notes",       "📝 View all staff notes",   [["user",    "user",   "User",               true]]],
  ];

  const cmds = simple.map(([name, desc, opts]) => {
    let b = new SlashCommandBuilder().setName(name).setDescription(desc);
    if (opts) for (const opt of opts) b = addOpt(b, ...opt);
    return b;
  });

  // Reaction roles subcommands
  const rr = new SlashCommandBuilder().setName("reactionrole").setDescription("🎭 Reaction roles");
  rr.addSubcommand(s => { let b = s.setName("add").setDescription("Add reaction role"); b = addOpt(b, "string", "messageid", "Message ID", true); b = addOpt(b, "string", "emoji", "Emoji", true); b = addOpt(b, "role", "role", "Role", true); return b; });
  rr.addSubcommand(s => { let b = s.setName("remove").setDescription("Remove reaction role"); b = addOpt(b, "string", "messageid", "Message ID", true); b = addOpt(b, "string", "emoji", "Emoji", true); return b; });
  rr.addSubcommand(s => s.setName("list").setDescription("List reaction roles"));
  rr.addSubcommand(s => { let b = s.setName("panel").setDescription("Post role panel"); b = addOpt(b, "string", "title", "Panel title", true); b = addOpt(b, "string", "description", "Panel description", true); return b; });
  cmds.push(rr);

  // Anti-raid subcommands
  const ar = new SlashCommandBuilder().setName("antiraid").setDescription("🛡️ Anti-Raid config");
  ar.addSubcommand(s => s.setName("enable").setDescription("Enable anti-raid"));
  ar.addSubcommand(s => s.setName("disable").setDescription("Disable anti-raid"));
  ar.addSubcommand(s => s.setName("status").setDescription("View settings"));
  ar.addSubcommand(s => { let b = s.setName("config").setDescription("Configure"); b = addOpt(b, "integer", "threshold", "Joins to trigger", false, { min: 2, max: 50 }); b = addOpt(b, "integer", "window", "Window seconds", false, { min: 3, max: 60 }); b = addOpt(b, "string", "action", "Action", false, { choices: actionChoices }); b = addOpt(b, "integer", "autounlock", "Auto-unlock seconds", false, { min: 0, max: 3600 }); b = addOpt(b, "channel", "notify", "Notify channel", false); return b; });
  ar.addSubcommand(s => addOpt(s.setName("whitelist").setDescription("Exempt a user"),   "user", "user", "User", true));
  ar.addSubcommand(s => addOpt(s.setName("unwhitelist").setDescription("Remove exemption"), "user", "user", "User", true));
  cmds.push(ar);

  // Anti-nuke subcommands
  const an = new SlashCommandBuilder().setName("antinuke").setDescription("☢️ Anti-Nuke config");
  an.addSubcommand(s => s.setName("enable").setDescription("Enable anti-nuke"));
  an.addSubcommand(s => s.setName("disable").setDescription("Disable anti-nuke"));
  an.addSubcommand(s => s.setName("status").setDescription("View settings"));
  an.addSubcommand(s => { let b = s.setName("config").setDescription("Configure"); b = addOpt(b, "integer", "banth", "Ban threshold", false, { min: 1, max: 20 }); b = addOpt(b, "integer", "channelth", "Channel delete threshold", false, { min: 1, max: 10 }); b = addOpt(b, "integer", "roleth", "Role delete threshold", false, { min: 1, max: 10 }); b = addOpt(b, "integer", "kickth", "Kick threshold", false, { min: 1, max: 20 }); b = addOpt(b, "string", "action", "Action", false, { choices: nukeChoices }); b = addOpt(b, "channel", "notify", "Notify channel", false); return b; });
  an.addSubcommand(s => addOpt(s.setName("trust").setDescription("Trust a user"),    "user", "user", "User", true));
  an.addSubcommand(s => addOpt(s.setName("untrust").setDescription("Remove trust"), "user", "user", "User", true));
  cmds.push(an);

  // Backup subcommands
  const bk = new SlashCommandBuilder().setName("backup").setDescription("💾 Server backup");
  bk.addSubcommand(s => s.setName("create").setDescription("Create a backup"));
  bk.addSubcommand(s => s.setName("list").setDescription("List saved backups"));
  bk.addSubcommand(s => addOpt(s.setName("view").setDescription("View a backup"), "string", "id", "Backup ID", true));
  cmds.push(bk);

  return cmds.map(c => c.toJSON());
}

const slashCommands = buildSlash();

async function registerSlash() {
  if (!CLIENT_ID || !TOKEN) return console.warn("⚠️ Skipping slash registration — missing CLIENT_ID or TOKEN");
  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    console.log(`📡 Registering ${slashCommands.length} slash commands…`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashCommands });
    console.log(`✅ Registered ${slashCommands.length} slash commands`);
  } catch (e) {
    console.error("Slash registration failed:", e.message);
  }
}

// ── HELP ─────────────────────────────────────────────────────────────────────
function buildHelp(page = 1) {
  const icon = client.user?.displayAvatarURL();
  const auth = { name: `${NAME} v${VER}`, iconURL: icon };
  const ftp  = p => ({ text: `Page ${p}/6  ·  ${FT}` });
  const DIV  = "────────────────────────────────";
  const pages = [
    E.b("📖 Help — General & AI").setAuthor(auth).setDescription(`> Prefix: \`s!\`  ·  Slash: \`/\`  — both work!\n${DIV}`)
      .addFields(
        { name: "🌐 General",       value: "`help [page]`  `info`  `ping`  `status`  `rules`\n`uptime`  `invite`  `setup`  `stats`" },
        { name: "🤖 AI & Images",   value: "`ai <message>` — Chat with Snuggles AI\n`ai-reset` — Wipe conversation history\n`imagine <prompt> [style]` — Generate an AI image (Imagen 3)\n`aioff` / `aion` — Toggle AI in ticket *(staff)*\n\n**Styles:** `realistic` `anime` `cartoon` `fantasy` `minimal` `pixel` `oil` `sketch`" },
        { name: "📢 Announcements", value: "`announce <message> [#channel]` — @everyone post *(admin)*\n`massdm <message>` — DM every member *(admin)*" },
        { name: "💼 Commissions",   value: "`services`  `prices`  `pay`  `ticket`  `discount`\n`orderinfo <id>`  `portfolio [page]`" },
      ).setFooter(ftp(1)),

    E.i("📖 Help — Scripting & Economy").setAuthor(auth).setDescription(DIV)
      .addFields(
        { name: "🖥️ Scripting",  value: "`script <type>` — Example Lua scripts\n  Types: `ui` `datastore` `remote` `movement` `admin`\n`snippet`  `docs`  `debug`  `tip`" },
        { name: "📊 Leveling",   value: "`level [@user]`  `rank [@user]`  `leaderboard`\n`setlevelupchannel <#ch>` *(admin)*" },
        { name: "💰 Economy",    value: "`balance [@user]`  `dowork` *(1h)*  `daily` *(24h)*\n`shop`  `buy <id>`\n\n**Items:** `role_color` 500🪙  `code_review` 300🪙\n`priority_queue` 750🪙  `vip_ping` 1000🪙  `og_badge` 2000🪙  `ai_image` 150🪙" },
        { name: "⭐ Reviews",    value: "`review <1-5> <type> <msg>`  `vouch <text>`" },
      ).setFooter(ftp(2)),

    E.g("📖 Help — Fun, Info & Utilities").setAuthor(auth).setDescription(DIV)
      .addFields(
        { name: "🎮 Fun & Games", value: "`8ball <q>`  `quote`  `meme`  `rate <thing>`\n`coinflip`  `roll [max]`  `rps <choice>`\n`trivia` — Win 🪙!  `remindme <time> <msg>`\n`color <hex>`  `calc <expr>`  `joke`  `fact`  `mock <text>`\n`encode <text> [encode/decode]`  `afk [reason]`" },
        { name: "ℹ️ Information", value: "`userinfo [@user]`  `serverinfo`  `avatar [@user]`\n`banner [@user]`  `servericon`  `invites [@user]`  `inviteleaderboard`\n`roleinfo <@role>`  `channelinfo [#ch]`  `membercount`\n`boosters`  `perms [@user]`  `botperms`\n`timestamp [offset]`  `firstmessage [#ch]`" },
        { name: "🔍 Utilities",   value: "`snipe` — Last deleted message\n`editsnipe` — Last edited message\n`define <word>` — Dictionary definition\n`serverscan` — Security audit *(admin)*" },
        { name: "🟣 Roblox",      value: "`verify <username>`  `checkverify <code>`\n`whois [@user]`  `unverify`  `verifypanel <#ch>` *(admin)*" },
      ).setFooter(ftp(3)),

    E.mk(C.error, "📖 Help — Moderation & Admin").setAuthor(auth).setDescription(DIV)
      .addFields(
        { name: "🔨 Moderation *(Manage Messages+)*", value: "`ban <@user> [reason] [days]`  `softban`  `kick`\n`mute <@user> <time>`  `unmute`\n`warn <@user> <reason>`  `warns`  `unwarn <id>`  `clearwarns`\n`modlogs`  `purge <count>`  `lock`  `unlock`  `slowmode`  `nick`\n`listbans`  `notes <@user>`" },
        { name: "⚙️ Admin *(Administrator)*",          value: "`announce`  `massdm`  `say`  `embed`  `poll`  `giveaway`\n`nuke [reason]`  `steal <emoji> <name>`  `clearscam <@user>`\n`ticketpanel`  `close`  `addnote`  `addorder`  `updateorder`\n`complete`  `blacklist`  `givecoins`\n`setlog`  `setreviews`  `settranscripts`  `setverifyrole`\n`setscamchannel`  `setlevelupchannel`  `serverscan`" },
        { name: "🚨 Scam Reports *(Staff)*",           value: "`reportscammer <@user> <evidence>`  `scammerlist`" },
        { name: "💾 Backups *(Admin)*",                value: "`backup create`  `backup list`  `backup view <id>`" },
      ).setFooter(ftp(4)),

    E.mk(C.mod, "📖 Help — Security").setAuthor(auth).setDescription(DIV)
      .addFields(
        { name: "🛡️ Anti-Raid *(Admin)*",            value: "`antiraid enable / disable / status`\n`antiraid config [threshold] [window] [action] [autounlock] [#notify]`\n  `threshold` — Joins to trigger *(default 8)*\n  `window` — Detection window sec *(default 10)*\n  `action` — `kick` · `ban` · `none`\n`antiraid whitelist / unwhitelist <@user>`" },
        { name: "☢️ Anti-Nuke *(Admin)*",             value: "`antinuke enable / disable / status`\n`antinuke config [banth] [channelth] [roleth] [kickth] [action] [#notify]`\n  `banth` — Ban threshold *(default 5)*\n  `channelth` — Channel deletion threshold *(default 3)*\n  `action` — `ban` · `kick` · `strip`\n`antinuke trust / untrust <@user>`" },
        { name: "🎭 Reaction Roles *(Manage Roles)*", value: "`reactionrole add <msgID> <emoji> <@role>`\n`reactionrole remove <msgID> <emoji>`\n`reactionrole list`  `reactionrole panel <title> <desc>`" },
        { name: "🔍 Server Scan *(Admin)*",           value: "`serverscan` — Full security audit:\n  New accounts, no-avatar members, joined today,\n  scam offenses, anti-raid/nuke status, blacklist count" },
      ).setFooter(ftp(5)),

    E.mk(C.note, "📖 Help — Tickets & Setup").setAuthor(auth).setDescription(DIV)
      .addFields(
        { name: "🎫 Ticket System", value: "Post panel with `ticketpanel` — members choose:\n  📦 **Order** — Commission work *(staff reviewed)*\n  🤝 **Partnership** — Partner with us *(AI, 45+ members)*\n  ❓ **Inquiry** — Support & questions *(AI 24/7)*\n\n**In-ticket:** `close <reason>`  `addnote <text>`  `aioff`  `aion`" },
        { name: "⚙️ Quick Setup",   value: "`setup` — Full setup guide\n`ticketpanel` — Post support panel\n`setlog / setreviews / settranscripts`\n`setverifyrole`  `setlevelupchannel`  `setscamchannel`" },
      ).setFooter(ftp(6)),
  ];

  const p = Math.max(1, Math.min(page, pages.length));
  return pages[p - 1];
}

// ── AI ────────────────────────────────────────────────────────────────────────
const tConvos    = new Map();
const tAIOff     = new Set();
const pAwaitAd   = new Map();
const uChat      = new Map();
const aiProcessing = new Set();

async function callGemini(messages, system, opts = {}) {
  if (!GEMINI_KEY) return { text: null, model: null, error: "No API key configured." };
  try {
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: opts.maxTokens || 800, temperature: opts.temp ?? 0.7 },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const errData = (() => { try { return JSON.parse(errText); } catch { return {}; } })();
      const msg = errData?.error?.message || `HTTP ${res.status}`;
      console.error(`[Gemini] ${res.status}:`, msg);
      return { text: null, model: null, error: msg };
    }
    const j = await res.json();
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    if (!text) {
      const reason = j.candidates?.[0]?.finishReason || "unknown";
      return { text: null, model: null, error: `No response generated (reason: ${reason})` };
    }
    return { text, model: "Gemini 2.0 Flash" };
  } catch (e) {
    console.error("[Gemini]", e.message);
    return { text: null, model: null, error: e.message };
  }
}

// Image generation using Imagen 3 (primary) with Gemini Flash fallback
async function generateImageGemini(prompt) {
  if (!GEMINI_KEY) throw new Error("No GEMINI_API_KEY configured.");

  // Primary: Imagen 3
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: { text: prompt },
          safetyFilterLevel: "BLOCK_ONLY_HIGH",
          personGeneration: "ALLOW_ADULT",
          numberOfImages: 1,
          aspectRatio: "1:1",
        }),
      }
    );
    if (res.ok) {
      const j = await res.json();
      const b64 = j.generatedImages?.[0]?.image?.imageBytes;
      if (b64) return { buffer: Buffer.from(b64, "base64"), ext: "png", source: "Imagen 3" };
    }
    const errText = await res.text().catch(() => "");
    const errData = (() => { try { return JSON.parse(errText); } catch { return {}; } })();
    console.warn("[Imagen3] fallback:", errData?.error?.message || `HTTP ${res.status}`);
  } catch (e) {
    console.warn("[Imagen3] error, trying fallback:", e.message);
  }

  // Fallback: Gemini 2.0 Flash experimental image generation
  const models = ["gemini-2.0-flash-exp-image-generation", "gemini-2.0-flash-exp"];
  for (const model of models) {
    try {
      const res2 = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        }
      );
      if (!res2.ok) continue;
      const j2 = await res2.json();
      const parts = j2.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
      if (imgPart) {
        const mimeType = imgPart.inlineData.mimeType;
        const ext = mimeType.includes("png") ? "png" : "jpg";
        return { buffer: Buffer.from(imgPart.inlineData.data, "base64"), ext, source: "Gemini AI" };
      }
    } catch (e2) {
      console.warn(`[ImgGen:${model}]`, e2.message);
    }
  }
  throw new Error("Image generation is temporarily unavailable. All AI image models failed to respond. Please try again later.");
}

async function enhancePrompt(raw) {
  const { text } = await callGemini(
    [{ role: "user", content: `Enhance this image prompt: "${raw}"` }],
    SYS.img, { maxTokens: 220, temp: 0.8 }
  );
  return text || raw;
}

async function callTicketAI(chId, msg, type, ctx) {
  if (!tConvos.has(chId)) tConvos.set(chId, []);
  const h = tConvos.get(chId);
  h.push({ role: "user", content: msg });
  while (h.length > 20) h.shift();
  const sys = (SYS[type] || SYS.inquiry) + (ctx ? `\n\n## Ticket Form\n${ctx}` : "") + "\n\nIMPORTANT: Respond in ONE complete message.";
  const r = await callGemini(h, sys, { maxTokens: 900 });
  if (r.text) h.push({ role: "assistant", content: r.text });
  return r;
}

// ── ROBLOX ────────────────────────────────────────────────────────────────────
async function fetchRxUser(username) {
  try {
    const r = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!r.ok) return null;
    return (await r.json()).data?.[0] || null;
  } catch { return null; }
}

async function fetchRxProfile(uid) {
  try {
    const [ur, sr] = await Promise.all([
      fetch(`https://users.roblox.com/v1/users/${uid}`),
      fetch(`https://friends.roblox.com/v1/users/${uid}/friends/count`).catch(() => null),
    ]);
    const u = ur.ok ? await ur.json() : null;
    const st = sr?.ok ? await sr.json() : null;
    if (!u) return null;
    return { id: u.id, name: u.name, displayName: u.displayName, description: u.description || "", created: u.created, isBanned: u.isBanned, friendCount: st?.count ?? null };
  } catch { return null; }
}

async function fetchRxAvatar(uid) {
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uid}&size=150x150&format=Png`);
    if (!r.ok) return null;
    return (await r.json()).data?.[0]?.imageUrl || null;
  } catch { return null; }
}

const genCode = () => "SNUG-" + Math.random().toString(36).substring(2, 8).toUpperCase();

// ── STATUS ────────────────────────────────────────────────────────────────────
const STA = [
  n => ({ name: `${n} server${n !== 1 ? "s" : ""}`, type: ActivityType.Watching }),
  _  => ({ name: `s!help | ${NAME}`, type: ActivityType.Playing }),
  _  => ({ name: "commissions open!", type: ActivityType.Playing }),
  _  => ({ name: `${Object.keys(data.robloxVerified).length} verified scripters`, type: ActivityType.Watching }),
  _  => ({ name: "type s!help for commands", type: ActivityType.Playing }),
];
let _si = 0;
const updStat = () => {
  const n = client.guilds.cache.size;
  const s = STA[_si++ % STA.length](n);
  client.user?.setActivity(s.name, { type: s.type });
};

// ── ANTI-RAID ────────────────────────────────────────────────────────────────
const raidT = new Map(), nukeT = new Map();

async function handleRaidJoin(member) {
  const s = gAR(member.guild.id);
  if (!s.enabled) return;
  if (s.whitelistedUsers?.includes(member.id)) return;
  if (s.whitelistedRoles?.some(r => member.roles.cache.has(r))) return;
  if (!raidT.has(member.guild.id)) raidT.set(member.guild.id, { joins: [], locked: false, actioned: new Set() });
  const t = raidT.get(member.guild.id), now = Date.now();
  t.joins = t.joins.filter(j => now - j < s.window);
  t.joins.push(now);
  if (t.joins.length >= s.threshold && !t.locked) {
    t.locked = true;
    if (s.notifyChannel) {
      const ch = await member.guild.channels.fetch(s.notifyChannel).catch(() => null);
      if (ch?.isTextBased()) ch.send({ embeds: [E.mk(C.raid, "🛡️ RAID DETECTED").setDescription(`> **${t.joins.length}** joins in **${s.window / 1000}s**\n> **Action:** ${s.action.toUpperCase()}\n> **Auto-Unlock:** ${s.autoUnlock ? fmtDur(s.autoUnlock) : "Manual"}`).setTimestamp()] }).catch(() => {});
    }
    if (s.autoUnlock > 0) setTimeout(() => { const tr = raidT.get(member.guild.id); if (tr) { tr.locked = false; tr.actioned.clear(); } }, s.autoUnlock);
  }
  if (t.locked && s.action !== "none" && !t.actioned.has(member.id)) {
    t.actioned.add(member.id);
    if (s.dmOnAction) member.user.send({ content: `🛡️ You were **${s.action === "ban" ? "banned" : "kicked"}** from **${member.guild.name}** — anti-raid triggered. Contact staff if this was an error.` }).catch(() => {});
    if (s.action === "ban") member.ban({ reason: "Anti-Raid" }).catch(() => {});
    if (s.action === "kick") member.kick("Anti-Raid").catch(() => {});
  }
}

async function checkNuke(guild, userId, type) {
  const s = gAN(guild.id);
  if (!s.enabled || userId === client.user?.id) return;
  if (s.trustedUsers?.includes(userId)) return;
  const key = `${guild.id}:${userId}`;
  if (!nukeT.has(key)) nukeT.set(key, { channelDeletes: [], bans: [], roleDeletes: [], kicks: [] });
  const t = nukeT.get(key), now = Date.now();
  const MAP = {
    channelDelete: { arr: "channelDeletes", th: s.channelDeleteThreshold, label: "channel deletions" },
    ban:           { arr: "bans",           th: s.banThreshold,           label: "bans" },
    roleDelete:    { arr: "roleDeletes",    th: s.roleDeleteThreshold,    label: "role deletions" },
    kick:          { arr: "kicks",          th: s.kickThreshold,          label: "kicks" },
  };
  const cfg = MAP[type];
  if (!cfg) return;
  t[cfg.arr] = t[cfg.arr].filter(x => now - x < s.window);
  t[cfg.arr].push(now);
  if (t[cfg.arr].length >= cfg.th) { t[cfg.arr] = []; await triggerNuke(guild, userId, `${cfg.th} ${cfg.label} in ${s.window / 1000}s`, s); }
}

async function triggerNuke(guild, userId, reason, s) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (s.trustedRoles?.some(r => member.roles.cache.has(r))) return;
  try {
    if (s.action === "ban")   await member.ban({ reason: `Anti-Nuke: ${reason}` });
    if (s.action === "kick")  await member.kick(`Anti-Nuke: ${reason}`);
    if (s.action === "strip") await member.roles.set([], `Anti-Nuke: ${reason}`).catch(() => {});
    member.user.send({ content: `🚨 Anti-Nuke triggered in **${guild.name}** — Action: **${s.action}** — Reason: ${reason}` }).catch(() => {});
  } catch {}
  if (s.notifyChannel) {
    const ch = await guild.channels.fetch(s.notifyChannel).catch(() => null);
    if (ch?.isTextBased()) ch.send({ embeds: [E.mk(C.nuke, "☢️ ANTI-NUKE TRIGGERED").addFields({ name: "👤 User", value: `<@${userId}> (${member.user.tag})`, inline: true }, { name: "⚡ Action", value: s.action.toUpperCase(), inline: true }, { name: "📋 Reason", value: reason }).setTimestamp()] }).catch(() => {});
  }
}

// ── SCAM DETECTION ────────────────────────────────────────────────────────────
function isScamMessage(content) {
  const lower = content.toLowerCase();
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(content)) return true;
  }
  for (const keyword of SCAM_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  return false;
}

async function handleScamDetection(message) {
  if (!message.guild || message.author.bot) return;
  if (isStaff(message.member)) return;
  if (!isScamMessage(message.content)) return;

  const uid = message.author.id;
  const gid = message.guild.id;
  const key = `${gid}:${uid}`;
  if (!data.scamWarnings[key]) data.scamWarnings[key] = 0;
  data.scamWarnings[key]++;
  saveData();

  const count = data.scamWarnings[key];

  try { await message.delete(); } catch {}

  const actions = [];
  let actionTaken = "Warned";

  if (count >= 3) {
    const member = message.member;
    if (member?.bannable) {
      await member.ban({ reason: "Repeated scam/phishing messages — auto-banned." }).catch(() => {});
      actionTaken = "Banned";
    }
  } else if (count >= 2) {
    const ms = 10 * 60 * 1000;
    if (message.member?.moderatable) {
      await message.member.timeout(ms, "Scam/phishing message detected.").catch(() => {});
      actionTaken = "Timed out (10 minutes)";
    }
  }

  const warnEmb = E.sc("🚨 Potential Scam Detected")
    .setDescription([
      `⚠️ <@${uid}>'s message was **automatically removed** because it matched our scam filters.`,
      "",
      "**If you were sharing something legitimate**, please contact staff — this may be a false positive.",
      "",
      `📊 **Offense count:** ${count}/3`,
      count >= 3 ? "🔨 **Action:** Banned for repeated scam behavior." : count >= 2 ? "⏱️ **Action:** Timed out for 10 minutes." : "⚠️ **Action:** Message removed — final warning.",
    ].join("\n"))
    .setThumbnail(message.author.displayAvatarURL())
    .addFields(
      { name: "👤 User",    value: `${message.author.tag} (<@${uid}>)`, inline: true },
      { name: "📋 Action",  value: actionTaken,                          inline: true },
      { name: "⚠️ Offense", value: `${count}/3`,                         inline: true },
    )
    .setFooter({ text: FT }).setTimestamp();

  // Post to scam channel if set
  const s = gS(gid);
  if (s.scamChannelId) {
    const ch = await message.guild.channels.fetch(s.scamChannelId).catch(() => null);
    if (ch?.isTextBased()) ch.send({ embeds: [warnEmb] }).catch(() => {});
  } else {
    message.channel.send({ embeds: [warnEmb] }).catch(() => {});
  }
}

// ── TICKET PANELS ─────────────────────────────────────────────────────────────
function buildTicketPanel() {
  const emb = E.b(`🧸 ${NAME} — Support Center`)
    .setDescription([
      "> Choose your ticket type below to get started.", "",
      "📦 **Order** — Commission a custom Lua script or game system",
      "🤝 **Partnership** — Partner your server with ours *(45+ members, AI handled)*",
      "❓ **Inquiry** — Questions, pricing, or general support *(AI 24/7)*", "",
      "*Powered by Snuggles AI — instant responses anytime!* 💗",
    ].join("\n"))
    .setFooter({ text: `${NAME} v${VER} · AI-Powered Support` }).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_order").setLabel("Order").setStyle(ButtonStyle.Primary).setEmoji("📦"),
    new ButtonBuilder().setCustomId("ticket_partner").setLabel("Partnership").setStyle(ButtonStyle.Success).setEmoji("🤝"),
    new ButtonBuilder().setCustomId("ticket_inquiry").setLabel("Inquiry").setStyle(ButtonStyle.Secondary).setEmoji("❓"),
  );
  return { emb, row };
}

function buildVerifyPanel() {
  const emb = E.rb("🟣 Roblox Account Verification")
    .setDescription([
      "Link your Roblox account to get your server nickname updated and receive the verified role.", "",
      "**1️⃣ Start** — Click the button below and enter your Roblox username",
      "**2️⃣ Add Code** — Paste the code into your [Roblox bio](https://www.roblox.com/my/account) → **About** tab",
      "**3️⃣ Confirm** — Run `/checkverify <code>` and you're done!", "",
      "*Your nickname will automatically update to your Roblox display name.* 🟣",
    ].join("\n"))
    .setFooter({ text: `${NAME} · Roblox Verification` }).setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("verify_start").setLabel("Verify Roblox Account").setStyle(ButtonStyle.Primary).setEmoji("🟣"),
  );
  return { emb, row };
}

// ── OPEN TICKET ───────────────────────────────────────────────────────────────
async function openTicket(guild, member, type, answers) {
  if (!guild || !member) return { ok: false, error: "Must be used in a server." };
  const s = gS(guild.id);
  const safeName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "user";
  let chanName = `ticket-${safeName}`;
  const maxOpen = s.maxOpenTickets || 1;
  const existing = guild.channels.cache.filter(c => c.type === ChannelType.GuildText && c.name.startsWith("ticket-") && c.permissionOverwrites.cache.has(member.id));
  if (existing.size >= maxOpen) return { ok: false, error: `You already have **${existing.size}** open ticket(s). Max is **${maxOpen}**.` };
  if (guild.channels.cache.find(c => c.name === chanName)) chanName += `-${Date.now().toString(36).slice(-4)}`;
  const staffRoles = s.ticketStaffRoles || [];
  const ow = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];
  for (const r of staffRoles) ow.push({ id: r, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages] });
  guild.roles.cache.forEach(r => { if (r.permissions.has(PermissionFlagsBits.ManageMessages) && !r.managed && !staffRoles.includes(r.id)) ow.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }); });
  let created;
  try {
    created = await guild.channels.create({ name: chanName, type: ChannelType.GuildText, topic: `[${type}] ${member.user.tag}`, permissionOverwrites: ow, parent: s.ticketCategoryId || undefined, reason: `Ticket by ${member.user.tag}` });
  } catch { return { ok: false, error: "Failed to create channel — check **Manage Channels** permission." }; }
  data.stats.ticketsOpened = (data.stats.ticketsOpened || 0) + 1;
  saveData();
  const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close_btn").setLabel("Close Ticket").setStyle(ButtonStyle.Danger).setEmoji("🔒"));
  let emb, ctx = "";
  if (type === "order") {
    ctx = `Roblox: ${answers.username}\nService: ${answers.service}\nDesc: ${answers.description}\nBudget: ${answers.budget}\nPayment: ${answers.payment}`;
    emb = E.b("📦 New Commission Order").setDescription(`> Welcome <@${member.id}>! Staff will review your order shortly.${hasOrdered(member.id) ? "\n> 🎟️ **Returning customer — 5% loyalty discount!**" : ""}`)
      .addFields({ name: "👤 Roblox Username", value: answers.username || "—", inline: true }, { name: "🛠️ Service Type", value: answers.service || "—", inline: true }, { name: "💳 Payment Method", value: answers.payment || "—", inline: true }, { name: "💰 Budget", value: answers.budget || "—", inline: true }, { name: "📝 Description", value: answers.description || "—" })
      .setFooter({ text: `Order · ${member.user.tag}` }).setTimestamp();
  } else if (type === "partnership") {
    ctx = `Server: ${answers.serverName}\nInvite: ${answers.invite}\nMembers: ${answers.memberCount}\nFocus: ${answers.focus}\nOffering: ${answers.offering}`;
    emb = E.ok("🤝 Partnership Request").addFields({ name: "🏠 Server Name", value: answers.serverName || "—", inline: true }, { name: "👥 Member Count", value: answers.memberCount || "—", inline: true }, { name: "🎯 Server Focus", value: answers.focus || "—", inline: true }, { name: "🔗 Invite Link", value: answers.invite || "—" }, { name: "🤝 What You Offer", value: answers.offering || "—" })
      .setFooter({ text: `Partnership · ${member.user.tag}` }).setTimestamp();
  } else {
    ctx = `Name: ${answers.name}\nTopic: ${answers.topic}\nDetails: ${answers.details}\nUrgency: ${answers.urgency || "Not specified"}`;
    emb = E.i("❓ Support Inquiry").addFields({ name: "👤 Name", value: answers.name || "—", inline: true }, { name: "❓ Topic", value: answers.topic || "—", inline: true }, { name: "⚡ Urgency", value: answers.urgency || "Not specified", inline: true }, { name: "📝 Details", value: answers.details || "—" })
      .setFooter({ text: `Inquiry · ${member.user.tag}` }).setTimestamp();
  }
  await created.send({ content: `<@${member.id}> Welcome to your ticket!${s.ticketGreeting ? "\n> " + s.ticketGreeting : ""}`, embeds: [emb], components: [closeRow] });
  if (type !== "order") {
    setImmediate(async () => {
      try {
        if (type === "partnership") {
          const count = parseInt(String(answers.memberCount || "0").replace(/,/g, "").match(/\d+/)?.[0] || "0", 10);
          if (count > 0 && count < 45) {
            await created.send({ embeds: [E.er("❌ Partnership Requirement Not Met").setDescription(`We require a minimum of **45 members**. You currently have **${count}**.\n\nFeel free to re-apply once you've grown! 🌸`).setFooter({ text: "Re-apply anytime!" }).setTimestamp()] });
            setTimeout(() => created.delete("Partnership declined").catch(() => {}), 15000);
            return;
          }
          pAwaitAd.set(created.id, { member, answers, count });
        }
        const prompt = type === "partnership"
          ? `New partnership. ${ctx}\nMember count meets 45 minimum. Greet them and ask for their server ad.`
          : `New inquiry.\n${ctx}\nRespond helpfully.`;
        const { text, model } = await callTicketAI(created.id, prompt, type, ctx);
        if (text) await created.send({ embeds: [aiE(text, model, member.user.username, type)] });
      } catch (e) { console.error("[TicketAI]", e.message); }
    });
  }
  return { ok: true, channel: created };
}

// ── CLOSE TICKET ──────────────────────────────────────────────────────────────
async function closeTicket(channel, closer, reason, guild) {
  let ownerId = null;
  for (const [id, o] of channel.permissionOverwrites.cache) { if (o.type === 1) { ownerId = id; break; } }
  const msgs = [];
  let lastId;
  for (let i = 0; i < 10; i++) {
    const b = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) }).catch(() => null);
    if (!b?.size) break;
    msgs.push(...b.values());
    lastId = b.last().id;
    if (b.size < 100) break;
  }
  msgs.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const tr = [
    `Transcript: #${channel.name}`, `Server: ${guild.name}`,
    `Closed by: ${closer.user?.tag || closer.tag || "—"}`,
    `Reason: ${reason}`, `Messages: ${msgs.length}`, `Date: ${new Date().toISOString()}`,
    "─".repeat(50), "",
    ...msgs.map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || "[no text]"}${m.embeds.length ? ` [${m.embeds.length} embed]` : ""}`),
  ].join("\n");
  const file = { attachment: Buffer.from(tr, "utf8"), name: `${channel.name}-transcript.txt` };
  const st = gS(guild.id);
  const tcId = st.transcriptsChannelId || data.modLogChannels[guild.id];
  if (tcId) {
    const tc = await guild.channels.fetch(tcId).catch(() => null);
    if (tc?.isTextBased()) tc.send({ embeds: [E.b("🎟️ Ticket Closed").addFields({ name: "Channel", value: `#${channel.name}` }, { name: "Closed By", value: closer.user?.tag || closer.tag || "—", inline: true }, { name: "Reason", value: reason, inline: true }).setTimestamp()], files: [file] }).catch(() => {});
  }
  if (ownerId) {
    try { const u = await client.users.fetch(ownerId); u.send({ embeds: [E.b("🎟️ Ticket Closed").setDescription(`**#${channel.name}** has been closed.\n**Reason:** ${reason}`)], files: [{ attachment: Buffer.from(tr, "utf8"), name: `${channel.name}-transcript.txt` }] }); } catch {}
  }
  tConvos.delete(channel.id); tAIOff.delete(channel.id); pAwaitAd.delete(channel.id); aiProcessing.delete(channel.id);
  data.stats.ticketsClosed = (data.stats.ticketsClosed || 0) + 1;
  saveData();
  await channel.send({ embeds: [E.w("🔒 Closing in 5 seconds…").setDescription(`**Reason:** ${reason}`)] }).catch(() => {});
  setTimeout(() => channel.delete(`Ticket closed: ${reason}`).catch(() => {}), 5000);
}

// ── ORDER BOARD ───────────────────────────────────────────────────────────────
async function updateOrderBoard() {
  if (!ENV.HOME || !ENV.ORDER) return;
  try {
    const g = client.guilds.cache.get(ENV.HOME);
    if (!g) return;
    const ch = await g.channels.fetch(ENV.ORDER).catch(() => null);
    if (!ch?.isTextBased()) return;
    const active = data.orders.filter(o => o.status !== "completed" && o.status !== "cancelled");
    const done   = data.orders.filter(o => o.status === "completed" && Date.now() - new Date(o.updatedAt).getTime() < 86400000);
    const emb    = E.b("📋 Commission Order Board").setDescription(`Updated <t:${Math.floor(Date.now() / 1000)}:R> — **${active.length}** active · **${done.length}** completed today`).setFooter({ text: `${NAME} · Auto-updates every 3 hours` }).setTimestamp();
    if (!active.length) emb.addFields({ name: "✅ Queue Clear", value: "No active orders right now!" });
    else for (const o of active.slice(0, 10)) {
      const si = gOS(o.status);
      emb.addFields({ name: `${si.emoji} ${si.label} — #${o.id}`, value: `<@${o.userId}> · Updated <t:${Math.floor(new Date(o.updatedAt).getTime() / 1000)}:R>\n\`${o.details.slice(0, 80)}${o.details.length > 80 ? "…" : ""}\`` });
    }
    if (active.length > 10) emb.addFields({ name: `+${active.length - 10} more`, value: "Use `/orderinfo <id>` to check any order." });
    const st = gS(ENV.HOME);
    if (st.orderBoardMsgId) try { await ch.messages.delete(st.orderBoardMsgId); } catch {}
    const sent = await ch.send({ embeds: [emb] });
    st.orderBoardMsgId = sent.id;
    saveData();
  } catch {}
}

// ── REACTION ROLES ────────────────────────────────────────────────────────────
async function handleRR(reaction, user, add) {
  try {
    if (user.bot) return;
    const guild = reaction.message.guild;
    if (!guild) return;
    const gRR = data.reactionRoles[guild.id];
    if (!gRR) return;
    const msgRR = gRR[reaction.message.id];
    if (!msgRR) return;
    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const roleId = msgRR[emoji] || msgRR[reaction.emoji.name];
    if (!roleId) return;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    const role = guild.roles.cache.get(roleId);
    if (!role) return;
    if (add) await member.roles.add(role, "Reaction Role").catch(() => {});
    else     await member.roles.remove(role, "Reaction Role").catch(() => {});
  } catch (e) { console.error("[RR]", e.message); }
}

// ── LEVELING ──────────────────────────────────────────────────────────────────
async function grantXP(msg) {
  const lv = gL(msg.author.id), now = Date.now();
  if (now - lv.lastXpAt < XP_CD) return;
  lv.lastXpAt = now;
  lv.totalMessages = (lv.totalMessages || 0) + 1;
  lv.xp += Math.max(1, XP_MSG + ri(-XP_V, XP_V));
  const needed = xpFor(lv.level);
  if (lv.xp >= needed) {
    lv.xp -= needed; lv.level++; saveData();
    const s = gS(msg.guild.id), lvChId = s.levelUpChannelId || ENV.LVL;
    if (!lvChId) return;
    const ch = msg.guild?.channels.cache.get(lvChId) || msg.channel;
    ch.send({ content: `<@${msg.author.id}>`, embeds: [E.xp("🎉 Level Up!").setDescription(`Congrats <@${msg.author.id}>! You reached **Level ${lv.level}** 🚀`).setThumbnail(msg.author.displayAvatarURL()).addFields({ name: "⭐ Next Level", value: `${xpFor(lv.level)} XP needed`, inline: true }).setFooter({ text: FT }).setTimestamp()] }).catch(() => {});
  } else saveData();
}

async function grantCoins(msg) {
  const eco = gE(msg.author.id), now = Date.now();
  if (now - eco.lastCoinAt < COINS_CD) return;
  eco.lastCoinAt = now;
  eco.coins = (eco.coins || 0) + COINS_MSG;
  saveData();
}

async function cacheInvites(guild) {
  try {
    const inv = await guild.invites.fetch();
    if (!data.inviteCache[guild.id]) data.inviteCache[guild.id] = {};
    inv.forEach(i => { data.inviteCache[guild.id][i.code] = i.uses || 0; });
  } catch {}
}

// ── STICKY ────────────────────────────────────────────────────────────────────
async function refreshSticky(channel) {
  if (!ENV.STICKY || channel.id !== ENV.STICKY) return;
  const prev = data.stickyMessages[channel.id];
  if (prev) try { await channel.messages.delete(prev); } catch {}
  const sent = await channel.send({ embeds: [E.b().setDescription("✨ **Enjoying our services?**\n\nLeave a review with `/review <1-5> <type> <message>` — your feedback means everything to us! 💗").setFooter({ text: `${FT} · Sticky` })] }).catch(() => null);
  if (sent) { data.stickyMessages[channel.id] = sent.id; saveData(); }
}

// ── GIVEAWAYS ─────────────────────────────────────────────────────────────────
async function checkGiveaways() {
  const now = Date.now();
  for (const [msgId, ga] of Object.entries(data.giveaways)) {
    if (ga.ended || ga.endAt > now) continue;
    ga.ended = true; saveData();
    try {
      const g = client.guilds.cache.get(ga.guildId);
      if (!g) continue;
      const ch = await g.channels.fetch(ga.channelId).catch(() => null);
      if (!ch) continue;
      const msg = await ch.messages.fetch(msgId).catch(() => null);
      if (!msg) continue;
      const rxn = msg.reactions.cache.get("🎉");
      let entrants = [];
      if (rxn) {
        let last;
        while (true) {
          const b = await rxn.users.fetch({ limit: 100, ...(last ? { after: last } : {}) }).catch(() => null);
          if (!b?.size) break;
          entrants.push(...b.filter(u => !u.bot).map(u => u.id));
          if (b.size < 100) break;
          last = b.last().id;
        }
      }
      const winners = Math.min(ga.winners || 1, entrants.length);
      if (!entrants.length) { await ch.send({ embeds: [E.w("🎉 Giveaway Ended").setDescription(`**${ga.prize}** — No valid entries.`).setTimestamp()] }); continue; }
      const picked = [], pool = [...entrants];
      for (let i = 0; i < winners; i++) { const idx = Math.floor(Math.random() * pool.length); picked.push(pool.splice(idx, 1)[0]); }
      await ch.send({ content: picked.map(id => `<@${id}>`).join(" "), embeds: [E.ok("🎉 Giveaway — Winner(s)!").addFields({ name: "🎁 Prize", value: ga.prize }, { name: "🏆 Winner(s)", value: picked.map(id => `<@${id}>`).join(", ") }, { name: "📊 Entries", value: `${entrants.length}` }).setFooter({ text: FT }).setTimestamp()], allowedMentions: { users: picked } });
    } catch {}
  }
}

// ── SERVER BACKUP ─────────────────────────────────────────────────────────────
async function createBackup(guild) {
  const bk = { id: `backup-${Date.now()}`, name: guild.name, icon: guild.iconURL(), createdAt: new Date().toISOString(), channels: [], roles: [], settings: gS(guild.id) };
  guild.channels.cache.forEach(ch => { bk.channels.push({ name: ch.name, type: ch.type, position: ch.rawPosition, topic: ch.topic || null, parent: ch.parentId || null, nsfw: ch.nsfw || false, rateLimitPerUser: ch.rateLimitPerUser || 0 }); });
  guild.roles.cache.filter(r => !r.managed && r.id !== guild.id).forEach(r => { bk.roles.push({ name: r.name, color: r.color, hoist: r.hoist, position: r.position, permissions: r.permissions.bitfield.toString(), mentionable: r.mentionable }); });
  if (!data.serverBackups[guild.id]) data.serverBackups[guild.id] = [];
  data.serverBackups[guild.id].push(bk);
  if (data.serverBackups[guild.id].length > 5) data.serverBackups[guild.id].shift();
  saveData();
  return bk;
}

// ── MASS DM ───────────────────────────────────────────────────────────────────
async function sendMassDM(guild, message, senderTag) {
  let members;
  try {
    members = await guild.members.fetch();
  } catch (e) {
    throw new Error("Failed to fetch members — make sure the bot has **Server Members Intent** enabled.");
  }

  const humanMembers = members.filter(m => !m.user.bot);
  let sent = 0, failed = 0;

  const dmText = `📢 **Announcement from ${guild.name}**\n\n${message}\n\n*— ${senderTag}*`;

  for (const [, member] of humanMembers) {
    try {
      await member.user.send({ content: dmText });
      sent++;
    } catch {
      failed++;
    }
    // 25ms delay — fast but within Discord rate limits
    await sleep(25);
  }

  data.stats.massAnnouncementsSent = (data.stats.massAnnouncementsSent || 0) + 1;
  saveData();
  return { sent, failed, total: humanMembers.size };
}

// ── COMMAND EXECUTOR ──────────────────────────────────────────────────────────
async function exec(cmd, ctx) {
  const { guild, member, user } = ctx;
  if (data.blacklist.includes(user.id) && cmd !== "blacklist")
    return ctx.reply({ embeds: [E.er("🚫 Blacklisted").setDescription("You are blacklisted from using this bot.")] }, true);
  if (CDS[cmd]) {
    const w = chkCD(cmd, user.id);
    if (w > 0) return ctx.reply({ embeds: [E.w("⏰ Cooldown").setDescription(`Please wait **${w}s** before using this again.`)] }, true);
    useCD(cmd, user.id);
  }

  switch (cmd) {
    // ── GENERAL ──────────────────────────────────────────────────────────────
    case "help": {
      const p = ctx.gi("page") || parseInt(ctx.ga(0) || "1") || 1;
      return ctx.reply({ embeds: [buildHelp(p)] });
    }
    case "setup":
      return ctx.reply({ embeds: [E.b("⚙️ Server Setup Guide").setDescription("Follow these steps to fully configure the bot.").addFields({ name: "**Step 1 — Logging**", value: "`/setlog #ch` · `/setreviews #ch` · `/settranscripts #ch`" }, { name: "**Step 2 — Roblox Verification**", value: "`/setverifyrole @role` then `/verifypanel #channel`" }, { name: "**Step 3 — Tickets**", value: "Run `/ticketpanel` in your support channel" }, { name: "**Step 4 — Level-Up Channel**", value: "`/setlevelupchannel #channel`" }, { name: "**Step 5 — Scam Reports**", value: "`/setscamchannel #channel`" }, { name: "**Step 6 — Security**", value: "`/antiraid enable` → `/antiraid config`\n`/antinuke enable` → `/antinuke config`\n`/antinuke trust @youradmin`" }).setFooter({ text: FT }).setTimestamp()] });
    case "info": {
      const up = process.uptime(), h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s2 = Math.floor(up % 60);
      return ctx.reply({ embeds: [E.b(`🧸 ${NAME}`).setThumbnail(client.user?.displayAvatarURL()).addFields({ name: "🤖 Tag", value: client.user?.tag || "—", inline: true }, { name: "📦 Version", value: `v${VER}`, inline: true }, { name: "👑 Owner", value: OWNER, inline: true }, { name: "🌐 Servers", value: `${client.guilds.cache.size}`, inline: true }, { name: "⏱️ Uptime", value: `${h}h ${m}m ${s2}s`, inline: true }, { name: "📋 Orders", value: `${data.orders.length}`, inline: true }, { name: "🤖 AI", value: GEMINI_KEY ? "✅ Gemini" : "❌ Disabled", inline: true }, { name: "🖼️ Images", value: GEMINI_KEY ? "✅ Gemini AI" : "❌ Disabled", inline: true }, { name: "🟣 Verified", value: `${Object.keys(data.robloxVerified).length} users`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "ping": {
      if (ctx.slash) {
        const sent = await ctx.i.reply({ embeds: [E.i("📶 Measuring…")], fetchReply: true });
        const ms = sent.createdTimestamp - ctx.i.createdTimestamp;
        return ctx.i.editReply({ embeds: [E.ok("📶 Pong!").addFields({ name: "⏱️ Round-trip", value: `${ms}ms`, inline: true }, { name: "💓 Gateway", value: `${Math.round(client.ws.ping)}ms`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
      }
      return ctx.reply({ embeds: [E.ok("📶 Pong!").addFields({ name: "💓 Gateway", value: `${Math.round(client.ws.ping)}ms`, inline: true }).setFooter({ text: FT })] });
    }
    case "status": {
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const ar = guild ? gAR(guild.id) : null, an = guild ? gAN(guild.id) : null;
      return ctx.reply({ embeds: [E.ok("🟢 All Systems Operational").addFields({ name: "🤖 Bot", value: `🟢 Online · ${Math.round(client.ws.ping)}ms`, inline: true }, { name: "📋 Active Orders", value: `${data.orders.filter(o => o.status !== "completed" && o.status !== "cancelled").length}`, inline: true }, { name: "🤖 Gemini AI", value: GEMINI_KEY ? "🟢 Ready" : "🔴 No Key", inline: true }, { name: "🖼️ Image Gen", value: GEMINI_KEY ? "🟢 Gemini AI" : "🔴 No Key", inline: true }, { name: "🟣 Verified", value: `${Object.keys(data.robloxVerified).length} users`, inline: true }, { name: "🛡️ Anti-Raid", value: ar?.enabled ? "🟢 Active" : "🔴 Off", inline: true }, { name: "☢️ Anti-Nuke", value: an?.enabled ? "🟢 Active" : "🔴 Off", inline: true }, { name: "🌐 Servers", value: `${client.guilds.cache.size}`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "rules": {
      const rulesEmb = E.b("📜 Server Rules")
        .setDescription("Please read and follow all rules. Violations result in warnings, timeouts, or bans.")
        .setFooter({ text: `${RULES.length} Rules · ${FT}` })
        .setTimestamp();
      const half = Math.ceil(RULES.length / 2);
      rulesEmb.addFields(
        { name: "Rules 1–" + half,            value: RULES.slice(0, half).join("\n\n"),      inline: false },
        { name: "Rules " + (half+1) + "–" + RULES.length, value: RULES.slice(half).join("\n\n"), inline: false },
      );
      return ctx.reply({ embeds: [rulesEmb] });
    }
    case "uptime":
      return ctx.reply({ embeds: [E.b("⏱️ Uptime").setDescription(`Online for **${fmtDur(Math.floor(process.uptime() * 1000))}**`).setFooter({ text: FT })] });
    case "invite":
      return ctx.reply({ embeds: [E.b("🔗 Invite the Bot").setDescription(`[**Click here to invite ${NAME}**](https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands)`).setFooter({ text: FT })] });

    // ── AI ────────────────────────────────────────────────────────────────────
    case "ai": {
      if (!GEMINI_KEY) return ctx.reply({ embeds: [E.er("🤖 AI Disabled").setDescription("The AI is not configured. Please contact server staff.")] }, true);
      const prompt = ctx.gs("message") || ctx.gas().join(" ");
      if (!prompt) return ctx.reply({ embeds: [E.w("Usage: `s!ai <message>`")] });
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      else ctx.channel.sendTyping().catch(() => {});
      if (!uChat.has(user.id)) uChat.set(user.id, []);
      const hist = uChat.get(user.id);
      hist.push({ role: "user", content: prompt });
      while (hist.length > 20) hist.shift();
      const { text, model, error } = await callGemini(hist, SYS.chat, { maxTokens: 1000, temp: 0.75 });
      if (!text) {
        return ctx.reply({ embeds: [E.w("🤖 AI Unavailable").setDescription("The AI couldn't generate a response right now. Please try again in a moment.\n\nIf this keeps happening, contact staff.").setFooter({ text: FT })] });
      }
      hist.push({ role: "assistant", content: text });
      return ctx.reply({ embeds: [aiE(text, model, user.username, "chat")], allowedMentions: { users: [] } });
    }
    case "ai-reset":
      uChat.delete(user.id);
      return ctx.reply({ embeds: [E.ok("✅ AI Memory Cleared").setDescription("Your conversation history has been wiped.")] }, true);
    case "aioff":
    case "aion": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      if (!ctx.channel?.name?.startsWith("ticket-")) return ctx.reply({ embeds: [E.w("Only works inside ticket channels.")] }, true);
      if (cmd === "aioff") tAIOff.add(ctx.channel.id);
      else tAIOff.delete(ctx.channel.id);
      return ctx.reply({ content: cmd === "aioff" ? "🔇 AI disabled for this ticket." : "🔊 AI re-enabled for this ticket." });
    }

    // ── IMAGE GENERATION ──────────────────────────────────────────────────────
    case "imagine": {
      if (!GEMINI_KEY) return ctx.reply({ embeds: [E.er("🖼️ Image Gen Disabled").setDescription("No `GEMINI_API_KEY` configured. Please contact staff.")] }, true);
      const prompt = ctx.gs("prompt") || ctx.gas().join(" ");
      const style  = ctx.gs("style") || null;
      if (!prompt) return ctx.reply({ embeds: [E.w("Usage: `s!imagine <prompt> [style]`\n\n**Styles:** " + Object.keys(IMG_STYLES).map(s => `\`${s}\``).join(" "))] });
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      else ctx.channel.sendTyping().catch(() => {});
      try {
        const fullPrompt = style ? `${prompt}, ${IMG_STYLES[style]}` : prompt;
        const enhanced   = await enhancePrompt(fullPrompt);
        const { buffer, ext } = await generateImageGemini(enhanced);
        const ts  = Date.now();
        const att = new AttachmentBuilder(buffer, { name: `snuggles-ai-${ts}.${ext}` });
        data.stats.imagesGenerated = (data.stats.imagesGenerated || 0) + 1;
        saveData();
        return ctx.reply({
          embeds: [new EmbedBuilder()
            .setColor(C.img)
            .setAuthor({ name: "Snuggles AI — Image Generator", iconURL: client.user?.displayAvatarURL() })
            .setTitle("🎨 Image Generated!")
            .setDescription(`**Prompt:** ${prompt}${style ? `\n**Style:** \`${style}\`` : ""}\n*Enhanced & generated by Gemini AI*`)
            .setImage(`attachment://snuggles-ai-${ts}.${ext}`)
            .addFields({ name: "🔧 Engine", value: "Gemini AI", inline: true }, { name: "📐 Quality", value: "High quality", inline: true })
            .setFooter({ text: `Snuggles AI · ${user.username}` }).setTimestamp()],
          files: [att],
        });
      } catch (e) {
        console.error("[ImageGen]", e.message);
        return ctx.reply({ embeds: [E.er("🖼️ Image Generation Failed").setDescription(`Something went wrong while generating your image.\n\n**Tip:** Try rephrasing your prompt, or check that the Gemini API key is valid.\n\n\`${e.message.slice(0, 200)}\``).setFooter({ text: FT })] });
      }
    }

    // ── ANNOUNCEMENTS & MASS DM ───────────────────────────────────────────────
    case "announce": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("❌ Administrator permission required.")] }, true);
      const message = ctx.gs("message") || ctx.gas().join(" ");
      if (!message) return ctx.reply({ embeds: [E.w("Usage: `s!announce <message> [#channel]`")] });
      const targetCh = ctx.gc("channel") || ctx.channel;
      const emb = new EmbedBuilder()
        .setColor(C.brand)
        .setTitle("📢 Announcement")
        .setDescription(message)
        .setFooter({ text: `Announced by ${user.tag} · ${guild.name}` })
        .setTimestamp();
      await targetCh.send({ content: "@everyone", embeds: [emb], allowedMentions: { parse: ["everyone"] } });
      return ctx.reply({ embeds: [E.ok(`✅ Announcement posted in <#${targetCh.id}>!`).setFooter({ text: FT })] }, true);
    }

    case "massdm": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("❌ Administrator permission required.")] }, true);
      const message = ctx.gs("message") || ctx.gas().join(" ");
      if (!message) return ctx.reply({ embeds: [E.w("Usage: `s!massdm <message>`\n\nThis will DM every member in the server.")] });

      // Confirm with a preview
      if (ctx.slash) await ctx.i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

      const memberCount = guild.memberCount;
      await ctx.reply({
        embeds: [E.w("📨 Mass DM — Starting…")
          .setDescription(`Sending to **${memberCount}** members. This may take a few minutes.\n\n📋 **Preview:**\n>>> ${message.slice(0, 300)}${message.length > 300 ? "…" : ""}`)
          .setFooter({ text: "This runs in the background — you'll get a result when done." })],
      });

      // Run in background
      sendMassDM(guild, message, user.tag)
        .then(async ({ sent, failed, total }) => {
          const resultEmb = E.ok("📨 Mass DM Complete!")
            .setDescription(`Your announcement has been sent to the server.`)
            .addFields(
              { name: "✅ Delivered",    value: `${sent}`,   inline: true },
              { name: "❌ Failed",       value: `${failed}`, inline: true },
              { name: "👥 Total Members",value: `${total}`,  inline: true },
              { name: "📋 Note",         value: "Failed DMs are usually members with DMs disabled — this is normal.", inline: false },
            )
            .setFooter({ text: FT }).setTimestamp();
          try { await user.send({ embeds: [resultEmb] }); } catch {}
          await logMod(guild, resultEmb).catch(() => {});
        })
        .catch(async e => {
          try { await user.send({ embeds: [E.er("📨 Mass DM Failed").setDescription(e.message)] }); } catch {}
        });
      break;
    }

    // ── SERVICES & COMMISSIONS ────────────────────────────────────────────────
    case "services":
      return ctx.reply({ embeds: [E.b("🛍️ Services Offered").addFields(SERVICES).setFooter({ text: FT }).setTimestamp()] });
    case "prices":
      return ctx.reply({ embeds: [E.ok("💳 Pricing & Payment").addFields(...PAY_METHODS, { name: "⚠️ Refund Policy", value: "All sales are **FINAL** — absolutely no refunds under any circumstances." }).setFooter({ text: FT }).setTimestamp()] });
    case "pay":
      return ctx.reply({ embeds: [E.b("💸 Payment Details").addFields({ name: "💵 CashApp", value: "[$siahhispaid](https://cash.app/$siahhispaid)", inline: true }, { name: "🅿️ PayPal", value: "[paypal.me/snugglesscripting](https://paypal.me/snugglesscripting)", inline: true }, { name: "⚠️ Important", value: "**Friends & Family only.** All sales are final — no refunds." }).setFooter({ text: FT })] });

    case "orderinfo": {
      const id = ctx.gi("id") || parseInt(ctx.ga(0), 10);
      const o  = findOrder(id);
      if (!o) return ctx.reply({ embeds: [E.er("Order Not Found").setDescription("No order with that ID exists.")] }, true);
      const si = gOS(o.status);
      const emb = E.mk(si.color, `📦 Order #${o.id}`)
        .addFields({ name: "📊 Status", value: `${si.emoji} ${si.label}`, inline: true }, { name: "👤 Customer", value: `<@${o.userId}>`, inline: true }, { name: "📅 Created", value: `<t:${Math.floor(new Date(o.createdAt).getTime() / 1000)}:f>`, inline: true }, { name: "🔄 Updated", value: `<t:${Math.floor(new Date(o.updatedAt).getTime() / 1000)}:R>`, inline: true }, { name: "📝 Details", value: o.details });
      if (o.note) emb.addFields({ name: "📋 Staff Note", value: o.note });
      return ctx.reply({ embeds: [emb.setFooter({ text: FT }).setTimestamp()] });
    }
    case "discount": {
      const orders = data.orders.filter(o => o.userId === user.id);
      if (!orders.length) return ctx.reply({ embeds: [E.i("🎟️ Loyalty Discount").setDescription("No orders yet! After your first commission you'll receive **5% off** all future orders. 💗")] });
      return ctx.reply({ embeds: [E.ok("🎟️ Loyalty Discount Active!").setDescription("You qualify for **5% off** your next commission!\n\nOpen a ticket and mention this when ordering.").addFields({ name: "Your Orders", value: `${orders.length} total`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "ticket":
      return ctx.reply({ embeds: [E.b("🎫 Opening a Ticket").setDescription("Use the **ticket panel** in the support channel.\n\n📦 **Order** — Commission work *(staff reviewed)*\n🤝 **Partnership** — Partner with us *(AI handled, 45 member min)*\n❓ **Inquiry** — Questions & support *(AI 24/7)*").setFooter({ text: FT })] });

    // ── SCRIPTING ─────────────────────────────────────────────────────────────
    case "portfolio": {
      if (!data.portfolio.length) return ctx.reply({ embeds: [E.b("🎨 Portfolio").setDescription("No portfolio entries yet.").setFooter({ text: FT })] });
      const total = data.portfolio.length;
      let page = ctx.gi("page") || parseInt(ctx.ga(0) || "1") || 1;
      if (page > total) page = total;
      const work = [...data.portfolio].reverse()[page - 1];
      const isVid = /\.(mov|mp4|webm)(?:\?|$)/i.test(work.url || "");
      const emb   = E.b(`🎨 ${work.title || `Portfolio #${work.id}`}`).setURL(work.url).addFields({ name: "🆔 ID", value: `#${work.id}`, inline: true }, { name: "📝 Type", value: isVid ? "🎥 Video" : "🖼️ Image", inline: true }).setFooter({ text: `Page ${page}/${total} · ${FT}` });
      if (!isVid) emb.setImage(work.url);
      return ctx.reply({ embeds: [emb] });
    }
    case "script": {
      const t  = (ctx.gs("type") || ctx.ga(0) || "").toLowerCase();
      const ex = SCRIPTS[t];
      if (!ex) return ctx.reply({ embeds: [E.w("Invalid Type").setDescription("Available: `ui` · `datastore` · `remote` · `movement` · `admin`")] }, true);
      return ctx.reply({ embeds: [E.b(`📜 ${ex.title}`).setDescription("```lua\n" + ex.code + "\n```").setFooter({ text: FT })] });
    }
    case "snippet": {
      const SNIPS = [
        { title: "Safe WaitForChild", code: `local part = workspace:WaitForChild("MyPart", 5)\nif not part then warn("MyPart did not appear!") end` },
        { title: "Smooth Tween", code: `local TS = game:GetService("TweenService")\nTS:Create(part, TweenInfo.new(0.5, Enum.EasingStyle.Quad), {Position = part.Position + Vector3.new(0, 5, 0)}):Play()` },
        { title: "Touch Debounce", code: `local db = {}\npart.Touched:Connect(function(hit)\n  if db[hit.Parent] then return end\n  db[hit.Parent] = true\n  print(hit.Parent.Name, "touched!")\n  task.wait(1)\n  db[hit.Parent] = nil\nend)` },
        { title: "Iterate Players", code: `for _, player in game.Players:GetPlayers() do\n  print(player.Name, player.UserId)\nend` },
      ];
      const s2 = SNIPS[ri(0, SNIPS.length - 1)];
      return ctx.reply({ embeds: [E.i(`💡 ${s2.title}`).setDescription("```lua\n" + s2.code + "\n```").setFooter({ text: FT })] });
    }
    case "docs":
      return ctx.reply({ embeds: [E.b("📚 Roblox Resources").addFields(DOCS.map(d => ({ name: d.name, value: d.value }))).setFooter({ text: FT })] });
    case "debug":
      return ctx.reply({ embeds: [E.w("🐛 Bug Report Template").setDescription("```\nGoal:\n<what you're trying to achieve>\n\nProblem:\n<what's going wrong>\n\nError Message:\n<paste from Output window>\n\nRelevant Code:\n<the broken section>\n\nWhat I Tried:\n<steps already attempted>\n```").setFooter({ text: FT })] });
    case "tip":
      return ctx.reply({ embeds: [E.b("💡 Scripting Tip").setDescription(TIPS[ri(0, TIPS.length - 1)]).setFooter({ text: FT })] });

    // ── LEVELING ──────────────────────────────────────────────────────────────
    case "level": {
      const target = ctx.gu("user") || user;
      const lv = gL(target.id), needed = xpFor(lv.level);
      const prog = Math.min(20, Math.floor((lv.xp / needed) * 20));
      return ctx.reply({ embeds: [E.xp(`📊 Level — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields({ name: "🏆 Level", value: `${lv.level}`, inline: true }, { name: "✨ XP", value: `${lv.xp} / ${needed}`, inline: true }, { name: "💬 Messages", value: `${lv.totalMessages || 0}`, inline: true }, { name: "📈 Progress", value: `\`${"█".repeat(prog)}${"░".repeat(20 - prog)}\` ${Math.floor((lv.xp / needed) * 100)}%` }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "rank": {
      const target = ctx.gu("user") || user;
      const lv = gL(target.id), eco = gE(target.id), needed = xpFor(lv.level);
      const sorted = Object.entries(data.leveling).sort((a, b) => b[1].level !== a[1].level ? b[1].level - a[1].level : b[1].xp - a[1].xp);
      const rank   = sorted.findIndex(([id]) => id === target.id) + 1;
      const roblox = data.robloxVerified[target.id];
      return ctx.reply({ embeds: [E.xp(`🏅 Stats — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields({ name: "🌐 Server Rank", value: rank > 0 ? `#${rank}` : "Unranked", inline: true }, { name: "🏆 Level", value: `${lv.level}`, inline: true }, { name: "✨ XP", value: `${lv.xp} / ${needed}`, inline: true }, { name: "💰 Coins", value: `${eco.coins || 0} 🪙`, inline: true }, { name: "💬 Messages", value: `${lv.totalMessages || 0}`, inline: true }, { name: "⚠️ Warnings", value: `${(data.warns[target.id] || []).length}`, inline: true }, ...(roblox ? [{ name: "🟣 Roblox", value: `[${roblox.robloxName}](https://www.roblox.com/users/${roblox.robloxId}/profile)`, inline: true }] : [])).setFooter({ text: FT }).setTimestamp()] });
    }
    case "leaderboard": {
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const top = Object.entries(data.leveling).map(([id, d]) => ({ id, level: d.level || 1, xp: d.xp || 0 })).sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp).slice(0, 10);
      if (!top.length) return ctx.reply({ embeds: [E.b("📊 Leaderboard").setDescription("No data yet!").setFooter({ text: FT })] });
      const medals = ["🥇", "🥈", "🥉"];
      const lines  = await Promise.all(top.map(async (e, i) => {
        let name = `<@${e.id}>`;
        try { const u = await client.users.fetch(e.id); name = `**${u.username}**`; } catch {}
        return `${medals[i] || `**${i + 1}.**`} ${name} — Level **${e.level}** · ${e.xp} XP`;
      }));
      return ctx.reply({ embeds: [E.g("🏆 XP Leaderboard").setDescription(lines.join("\n")).setFooter({ text: FT }).setTimestamp()] });
    }

    // ── ECONOMY ───────────────────────────────────────────────────────────────
    case "balance": {
      const target = ctx.gu("user") || user;
      const eco    = gE(target.id);
      const items  = (eco.inventory || []).map(id => SHOP.find(i => i.id === id)?.emoji || id).join(" ") || "None";
      return ctx.reply({ embeds: [E.g(`💰 Balance — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields({ name: "💰 Coins", value: `${eco.coins || 0} 🪙`, inline: true }, { name: "🎒 Inventory", value: items, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "dowork": {
      const eco = gE(user.id), job = WORK[ri(0, WORK.length - 1)], earned = ri(job.r[0], job.r[1]);
      eco.coins = (eco.coins || 0) + earned;
      saveData();
      return ctx.reply({ embeds: [E.ok("💼 Work Complete!").setDescription(`> *${job.text}*\n\n**+ ${earned} 🪙 earned!**`).addFields({ name: "💰 New Balance", value: `${eco.coins} 🪙`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "daily": {
      const uid = user.id, last = data.dailyClaims[uid] || 0, elapsed = Date.now() - last;
      if (elapsed < 86400000) {
        const r = 86400000 - elapsed;
        return ctx.reply({ embeds: [E.w("⏰ Already Claimed").setDescription(`Come back in **${Math.floor(r / 3600000)}h ${Math.floor((r % 3600000) / 60000)}m**!`)] }, true);
      }
      data.dailyClaims[uid] = Date.now();
      const reward = DAILY[ri(0, DAILY.length - 1)];
      gE(uid).coins = (gE(uid).coins || 0) + reward.coins;
      saveData();
      return ctx.reply({ embeds: [E.ok("🎁 Daily Reward Claimed!").setDescription(`${reward.text}\n\n**+ ${reward.coins} 🪙**`).setFooter({ text: FT }).setTimestamp()] });
    }
    case "shop":
      return ctx.reply({ embeds: [E.g("🛒 Coin Shop").setDescription("Use `s!buy <id>` or `/buy <id>` to purchase.").addFields(SHOP.map(i => ({ name: `${i.emoji} ${i.name} — ${i.price} 🪙`, value: `${i.desc}\n\`ID: ${i.id}\`` }))).setFooter({ text: FT }).setTimestamp()] });
    case "buy": {
      const id   = (ctx.gs("item") || ctx.ga(0) || "").toLowerCase();
      const item = SHOP.find(i => i.id === id);
      if (!item) return ctx.reply({ embeds: [E.er("Item Not Found").setDescription("Use `s!shop` to browse available items.")] }, true);
      const eco  = gE(user.id);
      if ((eco.coins || 0) < item.price) return ctx.reply({ embeds: [E.er("Insufficient Coins").setDescription(`You need **${item.price} 🪙** but only have **${eco.coins || 0} 🪙**.`)] }, true);
      if ((eco.inventory || []).includes(id)) return ctx.reply({ embeds: [E.w("Already Owned").setDescription("You already own this item.")] }, true);
      eco.coins -= item.price;
      if (!eco.inventory) eco.inventory = [];
      eco.inventory.push(id);
      saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Purchased — ${item.emoji} ${item.name}`).addFields({ name: "How to Redeem", value: item.desc }, { name: "Remaining Balance", value: `${eco.coins} 🪙`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }

    // ── REVIEWS ───────────────────────────────────────────────────────────────
    case "review": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const rating = ctx.gi("rating") || parseInt(ctx.ga(0), 10);
      const type   = ctx.gs("type") || ctx.ga(1) || "General";
      const txt    = ctx.gs("message") || ctx.gas().slice(2).join(" ");
      if (!rating || rating < 1 || rating > 5) return ctx.reply({ embeds: [E.w("Rating must be between 1 and 5.")] }, true);
      if (!txt || txt.length < 10) return ctx.reply({ embeds: [E.er("Review must be at least 10 characters.")] }, true);
      const ck = `review:${user.id}:${guild.id}`, last = _cds.get(ck) || 0;
      if (Date.now() - last < 3600000 && last !== 0) return ctx.reply({ embeds: [E.w("⏰ Review cooldown (1hr)")] }, true);
      _cds.set(ck, Date.now());
      const rev = { id: data.nextReviewId++, userId: user.id, username: user.tag, commissionType: type, rating, message: txt, at: new Date().toISOString() };
      data.reviews.push(rev);
      data.stats.reviewsSubmitted = (data.stats.reviewsSubmitted || 0) + 1;
      saveData();
      const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
      const emb   = E.b("⭐ New Review").setThumbnail(user.displayAvatarURL()).addFields({ name: "👤 From", value: user.tag, inline: true }, { name: "🛠️ Type", value: type, inline: true }, { name: "📊 Rating", value: stars, inline: true }, { name: "💬 Review", value: txt }).setFooter({ text: FT }).setTimestamp();
      const s     = gS(guild.id);
      if (s.reviewsChannelId) {
        const ch = await guild.channels.fetch(s.reviewsChannelId).catch(() => null);
        if (ch?.isTextBased()) { await ch.send({ embeds: [emb] }); return ctx.reply({ embeds: [E.ok(`✅ Review posted in <#${s.reviewsChannelId}>! Thank you 💗`).setFooter({ text: FT })] }); }
      }
      return ctx.reply({ embeds: [emb] });
    }
    case "vouch": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const txt  = ctx.gs("text") || ctx.gas().join(" ");
      if (!txt) return ctx.reply({ embeds: [E.w("Usage: `s!vouch <text>`")] }, true);
      const emb  = E.ok("✅ New Vouch").setThumbnail(user.displayAvatarURL()).addFields({ name: "👤 From", value: user.tag }, { name: "💬 Vouch", value: txt }).setFooter({ text: FT }).setTimestamp();
      const s    = gS(guild?.id || "");
      if (s.reviewsChannelId) { const ch = await guild.channels.fetch(s.reviewsChannelId).catch(() => null); if (ch?.isTextBased()) await ch.send({ embeds: [emb] }); }
      return ctx.reply({ embeds: [E.ok("✅ Vouch submitted! Thank you 💗").setFooter({ text: FT })] });
    }

    // ── FUN & GAMES ───────────────────────────────────────────────────────────
    case "quote":
      return ctx.reply({ embeds: [E.b("💭 Quote of the Moment").setDescription(`*${QUOTES[ri(0, QUOTES.length - 1)]}*`).setFooter({ text: FT })] });
    case "meme":
      return ctx.reply({ embeds: [E.b("😂 Meme").setDescription("🚧 Meme feed coming soon! For now, here's a tip instead:\n\n" + TIPS[ri(0, TIPS.length - 1)]).setFooter({ text: FT })] });
    case "8ball": {
      const question = ctx.gs("question") || ctx.gas().join(" ");
      if (!question) return ctx.reply({ embeds: [E.w("Ask me a question! `s!8ball <question>`")] }, true);
      return ctx.reply({ embeds: [E.b("🎱 Magic 8-Ball").addFields({ name: "❓ Question", value: question }, { name: "🎱 Answer", value: BALL[ri(0, BALL.length - 1)] }).setFooter({ text: FT })] });
    }
    case "rate": {
      const thing = ctx.gs("thing") || ctx.gas().join(" ");
      if (!thing) return ctx.reply({ embeds: [E.w("What should I rate? `s!rate <thing>`")] }, true);
      const score = ri(1, 100);
      const bar   = "█".repeat(Math.floor(score / 5)) + "░".repeat(20 - Math.floor(score / 5));
      return ctx.reply({ embeds: [E.g("📊 Rating").addFields({ name: "📝 Item", value: thing }, { name: "⭐ Score", value: `**${score}/100**\n\`${bar}\`` }).setFooter({ text: FT })] });
    }
    case "coinflip":
      return ctx.reply({ embeds: [E.g("🪙 Coin Flip").setDescription(Math.random() < 0.5 ? "🪙 **Heads!**" : "🪙 **Tails!**").setFooter({ text: FT })] });
    case "roll": {
      const max = ctx.gi("max") || parseInt(ctx.ga(0) || "6") || 6;
      return ctx.reply({ embeds: [E.g("🎲 Dice Roll").setDescription(`You rolled **${ri(1, max)}** out of **${max}**`).setFooter({ text: FT })] });
    }
    case "rps": {
      const choices = ["rock", "paper", "scissors"];
      const emojis  = { rock: "🪨", paper: "📄", scissors: "✂️" };
      const wins    = { rock: "scissors", paper: "rock", scissors: "paper" };
      const pick    = (ctx.gs("choice") || ctx.ga(0) || "").toLowerCase();
      if (!choices.includes(pick)) return ctx.reply({ embeds: [E.w("Choose: `rock` · `paper` · `scissors`")] }, true);
      const bot    = choices[ri(0, 2)];
      const result = pick === bot ? "🤝 **Tie!**" : wins[pick] === bot ? "🎉 **You win!**" : "😔 **You lose!**";
      return ctx.reply({ embeds: [E.g("🎮 Rock Paper Scissors").addFields({ name: "Your pick", value: `${emojis[pick]} ${pick}`, inline: true }, { name: "My pick", value: `${emojis[bot]} ${bot}`, inline: true }, { name: "Result", value: result }).setFooter({ text: FT })] });
    }
    case "trivia": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (data.triviaActive[guild.id]) return ctx.reply({ embeds: [E.w("A trivia question is already active! Answer it first.")] }, true);
      const q = TRIVIA[ri(0, TRIVIA.length - 1)];
      data.triviaActive[guild.id] = { answers: q.a, reward: ri(10, 50) };
      saveData();
      setTimeout(() => { if (data.triviaActive[guild.id]) { delete data.triviaActive[guild.id]; saveData(); } }, 30000);
      return ctx.reply({ embeds: [E.b("🧠 Scripting Trivia").setDescription(`**${q.q}**\n\n💡 Hint: *${q.hint}*\n\nType your answer! You have **30 seconds**. Winner gets 🪙!`).setFooter({ text: FT })] });
    }
    case "remindme": {
      const timeStr = ctx.gs("time") || ctx.ga(0) || "";
      const msg2    = ctx.gs("message") || ctx.gas().slice(1).join(" ");
      if (!timeStr || !msg2) return ctx.reply({ embeds: [E.w("Usage: `s!remindme <time> <message>` — e.g. `s!remindme 10m Check the oven`")] }, true);
      const ms = parseDur(timeStr);
      if (!ms) return ctx.reply({ embeds: [E.er("Invalid time format. Use `10s`, `5m`, `2h`, or `1d`.")] }, true);
      await ctx.reply({ embeds: [E.ok("⏰ Reminder Set!").setDescription(`I'll remind you in **${fmtDur(ms)}**:\n> ${msg2}`).setFooter({ text: FT })] });
      setTimeout(async () => {
        try { await user.send({ embeds: [E.ok("⏰ Reminder!").setDescription(`**Here's your reminder:**\n> ${msg2}`).setFooter({ text: FT }).setTimestamp()] }); }
        catch { if (ctx.channel?.isTextBased()) ctx.channel.send({ content: `<@${user.id}> ⏰ Reminder: ${msg2}` }).catch(() => {}); }
      }, ms);
      break;
    }
    case "color": {
      const hex = (ctx.gs("hex") || ctx.ga(0) || "").replace("#", "");
      const num = parseInt(hex, 16);
      if (isNaN(num) || hex.length < 6) return ctx.reply({ embeds: [E.w("Invalid hex color. Example: `FF8FB1`")] }, true);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(num).setTitle("🎨 Color Preview").setDescription(`**Hex:** \`#${hex.toUpperCase()}\`\n**Dec:** \`${num}\``).setFooter({ text: FT })] });
    }
    case "calc": {
      const expr = ctx.gs("expression") || ctx.gas().join(" ");
      if (!expr) return ctx.reply({ embeds: [E.w("Usage: `s!calc <expression>`")] }, true);
      try {
        const safe   = expr.replace(/[^0-9+\-*/().\s%^]/g, "");
        const result = Function(`"use strict"; return (${safe})`)();
        return ctx.reply({ embeds: [E.ok("🧮 Calculator").addFields({ name: "Expression", value: `\`${expr}\`` }, { name: "Result", value: `**${result}**` }).setFooter({ text: FT })] });
      } catch { return ctx.reply({ embeds: [E.er("Invalid expression. Example: `2 + 2 * 10`")] }, true); }
    }

    // ── INFO ──────────────────────────────────────────────────────────────────
    case "userinfo": {
      const target  = ctx.gu("user") || user;
      const gMember = guild ? await guild.members.fetch(target.id).catch(() => null) : null;
      const emb = E.i(`👤 ${target.username}`).setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: "🆔 User ID",      value: target.id,                                               inline: true  },
          { name: "🤖 Bot?",          value: target.bot ? "Yes" : "No",                               inline: true  },
          { name: "📅 Account Created",value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`,  inline: true  },
        );
      if (gMember) {
        if (gMember.joinedTimestamp) emb.addFields({ name: "📥 Joined Server", value: `<t:${Math.floor(gMember.joinedTimestamp / 1000)}:D>`, inline: true });
        const roles = gMember.roles.cache.filter(r => r.id !== guild.id).map(r => `<@&${r.id}>`).join(" ") || "None";
        if (roles !== "None") emb.addFields({ name: "🎭 Roles", value: roles.slice(0, 1000) });
      }
      return ctx.reply({ embeds: [emb.setFooter({ text: FT }).setTimestamp()] });
    }
    case "serverinfo": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const emb = E.i(`🏠 ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .addFields(
          { name: "🆔 Server ID",      value: guild.id,                                                    inline: true  },
          { name: "👑 Owner",           value: `<@${guild.ownerId}>`,                                       inline: true  },
          { name: "📅 Created",         value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,        inline: true  },
          { name: "👥 Members",         value: `${guild.memberCount}`,                                      inline: true  },
          { name: "💬 Channels",        value: `${guild.channels.cache.size}`,                              inline: true  },
          { name: "🎭 Roles",           value: `${guild.roles.cache.size}`,                                 inline: true  },
          { name: "😀 Emojis",          value: `${guild.emojis.cache.size}`,                                inline: true  },
          { name: "🚀 Boosts",          value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
          { name: "🔒 Verification",    value: ["None","Low","Medium","High","Very High"][guild.verificationLevel] || "Unknown", inline: true },
        )
        .setFooter({ text: FT }).setTimestamp();
      return ctx.reply({ embeds: [emb] });
    }
    case "avatar": {
      const target = ctx.gu("user") || user;
      return ctx.reply({ embeds: [E.b(`🖼️ ${target.username}'s Avatar`).setImage(target.displayAvatarURL({ size: 1024 })).setFooter({ text: FT })] });
    }
    case "banner": {
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const target = ctx.gu("user") || user;
      const full   = await client.users.fetch(target.id, { force: true }).catch(() => target);
      const banner = full.bannerURL?.({ size: 1024 });
      if (!banner) return ctx.reply({ embeds: [E.w(`${target.username} doesn't have a banner.`)] }, true);
      return ctx.reply({ embeds: [E.b(`🖼️ ${target.username}'s Banner`).setImage(banner).setFooter({ text: FT })] });
    }
    case "servericon": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const icon = guild.iconURL({ size: 1024 });
      if (!icon) return ctx.reply({ embeds: [E.w("This server has no icon.")] }, true);
      return ctx.reply({ embeds: [E.b(`🖼️ ${guild.name}'s Icon`).setImage(icon).setFooter({ text: FT })] });
    }
    case "stats":
      return ctx.reply({ embeds: [E.b("📈 Bot Stats").addFields({ name: "🎫 Tickets Opened",    value: `${data.stats.ticketsOpened || 0}`,     inline: true }, { name: "🔒 Tickets Closed",    value: `${data.stats.ticketsClosed || 0}`,     inline: true }, { name: "📦 Orders Created",    value: `${data.stats.ordersCreated || 0}`,     inline: true }, { name: "✅ Orders Completed",  value: `${data.stats.ordersCompleted || 0}`,   inline: true }, { name: "⭐ Reviews",           value: `${data.stats.reviewsSubmitted || 0}`,  inline: true }, { name: "🖼️ Images Generated", value: `${data.stats.imagesGenerated || 0}`,   inline: true }, { name: "📨 Mass DMs Sent",     value: `${data.stats.massAnnouncementsSent || 0}`, inline: true }, { name: "🌐 Servers",           value: `${client.guilds.cache.size}`,          inline: true }).setFooter({ text: FT }).setTimestamp()] });

    case "invites": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const target = ctx.gu("user") || user;
      const inv    = data.invites[guild.id]?.[target.id] || 0;
      return ctx.reply({ embeds: [E.i(`📨 Invites — ${target.username}`).addFields({ name: "📨 Invites", value: `${inv}`, inline: true }).setFooter({ text: FT })] });
    }
    case "inviteleaderboard": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const gInv = data.invites[guild.id] || {};
      const top  = Object.entries(gInv).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!top.length) return ctx.reply({ embeds: [E.b("📨 Invite Leaderboard").setDescription("No invite data yet.").setFooter({ text: FT })] });
      const lines = top.map(([id, count], i) => `**${i + 1}.** <@${id}> — **${count}** invite${count !== 1 ? "s" : ""}`);
      return ctx.reply({ embeds: [E.g("📨 Invite Leaderboard").setDescription(lines.join("\n")).setFooter({ text: FT }).setTimestamp()] });
    }

    // ── ROBLOX VERIFICATION ───────────────────────────────────────────────────
    case "verify": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const username = ctx.gs("username") || ctx.gas().join(" ");
      if (!username) return ctx.reply({ embeds: [E.w("Usage: `s!verify <roblox username>`")] }, true);
      if (ctx.slash) await ctx.i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const rxUser = await fetchRxUser(username);
      if (!rxUser) return ctx.reply({ embeds: [E.er("Roblox User Not Found").setDescription(`No Roblox account found for **${username}**. Check the spelling.`)] }, true);
      const code = genCode();
      data.verificationCodes[user.id] = { robloxId: rxUser.id, robloxName: rxUser.name, code, guildId: guild.id, at: new Date().toISOString() };
      saveData();
      return ctx.reply({ embeds: [E.rb("🟣 Roblox Verification — Step 1").addFields({ name: "🟣 Roblox Account", value: rxUser.name, inline: true }, { name: "🔑 Your Code", value: `\`${code}\``, inline: true }, { name: "📝 Instructions", value: `1. Go to your [Roblox profile settings](https://www.roblox.com/my/account)\n2. In the **About** tab, paste this code: \`${code}\`\n3. Save, then run \`/checkverify ${code}\` or \`s!checkverify ${code}\`` }).setFooter({ text: "Code expires in 5 minutes." }).setTimestamp()] }, true);
    }
    case "checkverify": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const code    = ctx.gs("code") || ctx.ga(0) || "";
      const pending = data.verificationCodes[user.id];
      if (!pending) return ctx.reply({ embeds: [E.er("No Pending Verification").setDescription("Start with `/verify <username>` first.")] }, true);
      if (pending.code !== code) return ctx.reply({ embeds: [E.er("Wrong Code").setDescription("That code doesn't match. Use `/verify <username>` to get a new one.")] }, true);
      if (Date.now() - new Date(pending.at).getTime() > 300000) { delete data.verificationCodes[user.id]; saveData(); return ctx.reply({ embeds: [E.er("Code Expired").setDescription("Your verification code expired. Run `/verify <username>` again.")] }, true); }
      if (ctx.slash) await ctx.i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const profile = await fetchRxProfile(pending.robloxId);
      const avatar  = await fetchRxAvatar(pending.robloxId);
      const desc    = profile?.description || "";
      if (!desc.includes(code)) return ctx.reply({ embeds: [E.er("Code Not Found in Bio").setDescription(`The code \`${code}\` wasn't found in your Roblox bio.\n\n1. Go to [Roblox Settings](https://www.roblox.com/my/account) → About tab\n2. Paste: \`${code}\`\n3. Save, then try again.`)] }, true);
      data.robloxVerified[user.id] = { robloxId: pending.robloxId, robloxName: pending.robloxName, verifiedAt: new Date().toISOString() };
      delete data.verificationCodes[user.id];
      saveData();
      const gm = await guild.members.fetch(user.id).catch(() => null);
      if (gm) {
        await gm.setNickname(profile?.displayName || pending.robloxName, "Roblox verification").catch(() => {});
        const s2 = gS(guild.id);
        if (s2.verifyRoleId) { const role = guild.roles.cache.get(s2.verifyRoleId); if (role) gm.roles.add(role, "Roblox Verified").catch(() => {}); }
      }
      const emb = E.ok("✅ Roblox Account Verified!").setDescription(`You are now verified as **[${pending.robloxName}](https://www.roblox.com/users/${pending.robloxId}/profile)**!\n\nYour nickname has been updated.`).addFields({ name: "🟣 Roblox Username", value: pending.robloxName, inline: true }, { name: "🆔 Roblox ID", value: `${pending.robloxId}`, inline: true }).setFooter({ text: FT }).setTimestamp();
      if (avatar) emb.setThumbnail(avatar);
      return ctx.reply({ embeds: [emb] }, true);
    }
    case "whois": {
      const target = ctx.gu("user") || user;
      const roblox = data.robloxVerified[target.id];
      if (!roblox) return ctx.reply({ embeds: [E.w("Not Verified").setDescription(`**${target.username}** has not linked a Roblox account.\n\nThey can use \`/verify <username>\` to do so.`)] }, true);
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const profile = await fetchRxProfile(roblox.robloxId);
      const avatar  = await fetchRxAvatar(roblox.robloxId);
      const emb = E.rb(`🟣 Roblox — ${target.username}`).setThumbnail(avatar || target.displayAvatarURL()).addFields({ name: "🟣 Roblox Username", value: `[${roblox.robloxName}](https://www.roblox.com/users/${roblox.robloxId}/profile)`, inline: true }, { name: "🆔 Roblox ID", value: `${roblox.robloxId}`, inline: true }, { name: "✅ Verified", value: `<t:${Math.floor(new Date(roblox.verifiedAt).getTime() / 1000)}:R>`, inline: true });
      if (profile) {
        if (profile.displayName && profile.displayName !== profile.name) emb.addFields({ name: "📛 Display Name", value: profile.displayName, inline: true });
        if (profile.friendCount != null) emb.addFields({ name: "👥 Friends", value: `${profile.friendCount}`, inline: true });
        if (profile.created) emb.addFields({ name: "📅 Account Created", value: `<t:${Math.floor(new Date(profile.created).getTime() / 1000)}:D>`, inline: true });
        if (profile.description) emb.addFields({ name: "📝 Bio", value: profile.description.slice(0, 300) + (profile.description.length > 300 ? "…" : "") });
        if (profile.isBanned) emb.addFields({ name: "⚠️ Status", value: "This account is **banned**." });
      }
      return ctx.reply({ embeds: [emb.setFooter({ text: FT }).setTimestamp()] });
    }
    case "unverify": {
      if (!data.robloxVerified[user.id]) return ctx.reply({ embeds: [E.w("You don't have a linked Roblox account.")] }, true);
      const name = data.robloxVerified[user.id].robloxName;
      delete data.robloxVerified[user.id];
      saveData();
      return ctx.reply({ embeds: [E.ok("✅ Roblox Account Unlinked").setDescription(`**${name}** has been unlinked from your Discord account.`).setFooter({ text: FT })] });
    }
    case "verifypanel": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const ch = ctx.gc("channel") || guild.channels.cache.get(ctx.ga(0)?.replace(/[<#>]/g, ""));
      if (!ch?.isTextBased()) return ctx.reply({ embeds: [E.w("Please provide a valid text channel.")] }, true);
      const { emb, row } = buildVerifyPanel();
      await ch.send({ embeds: [emb], components: [row] });
      return ctx.reply({ embeds: [E.ok(`✅ Verification panel posted in <#${ch.id}>!`).setFooter({ text: FT })] });
    }

    // ── SCAM REPORTS ──────────────────────────────────────────────────────────
    case "reportscammer": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      if (ctx.slash) await ctx.i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const target   = ctx.gu("user");
      if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const evidence = ctx.gs("evidence") || ctx.gas().slice(1).join(" ") || "No evidence provided";
      const amount   = ctx.gs("amount")   || "Unknown";
      const roblox   = ctx.gs("roblox")   || "Unknown";
      const report   = { id: data.nextScamId++, userId: target.id, userTag: target.tag, robloxName: roblox, evidence, amount, reportedBy: user.id, reporterTag: user.tag, guildId: guild.id, at: new Date().toISOString() };
      if (!Array.isArray(data.scamReports)) data.scamReports = [];
      data.scamReports.push(report);
      saveData();
      const emb = E.sc(`🚨 Scammer Report #${report.id}`).setThumbnail(target.displayAvatarURL()).setDescription("⚠️ **Do NOT** pay, trade with, or engage with this person.").addFields({ name: "👤 Discord", value: `${target.tag} (<@${target.id}>)`, inline: true }, { name: "🆔 Discord ID", value: target.id, inline: true }, { name: "🟣 Roblox", value: roblox, inline: true }, { name: "💸 Amount Scammed", value: amount, inline: true }, { name: "📖 Reported By", value: user.tag, inline: true }, { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }, { name: "📋 Evidence", value: evidence }).setFooter({ text: FT }).setTimestamp();
      const s2 = gS(guild.id);
      if (s2.scamChannelId) {
        const ch = await guild.channels.fetch(s2.scamChannelId).catch(() => null);
        if (ch?.isTextBased()) { await ch.send({ embeds: [emb] }); return ctx.reply({ embeds: [E.ok(`✅ Report #${report.id} posted in <#${s2.scamChannelId}>`)] }); }
      }
      await ctx.reply({ embeds: [E.w("No scam channel set. Use `/setscamchannel`.").setFooter({ text: FT })] });
      await ctx.channel.send({ embeds: [emb] });
      break;
    }
    case "scammerlist": {
      const list = Array.isArray(data.scamReports) ? data.scamReports : [];
      if (!list.length) return ctx.reply({ embeds: [E.ok("✅ No Reports").setDescription("No scammers have been reported.").setFooter({ text: FT })] });
      const recent = list.slice(-10).reverse();
      return ctx.reply({ embeds: [E.sc("🚨 Recent Scam Reports").setDescription(recent.map(r => `**#${r.id}** — ${r.userTag} · Roblox: \`${r.robloxName}\` · Amount: ${r.amount}`).join("\n")).setFooter({ text: `${list.length} total reports · ${FT}` }).setTimestamp()] });
    }
    case "setscamchannel": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const ch = ctx.gc("channel");
      if (!ch) return ctx.reply({ embeds: [E.w("Usage: `/setscamchannel #channel`")] }, true);
      gS(guild.id).scamChannelId = ch.id;
      saveData();
      return ctx.reply({ embeds: [E.ok("✅ Scam Channel Set").setDescription(`Reports will be posted in <#${ch.id}>`).setFooter({ text: FT })] });
    }

    // ── REACTION ROLES ────────────────────────────────────────────────────────
    case "reactionrole": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member) && !hP(member, PermissionFlagsBits.ManageRoles)) return ctx.reply({ embeds: [E.er("You need **Manage Roles** permission.")] }, true);
      const sub = ctx.gsub() || ctx.ga(0) || "";
      if (sub === "add") {
        const msgId = ctx.gs("messageid") || ctx.ga(1), emoji = ctx.gs("emoji") || ctx.ga(2), role = ctx.gr("role") || ctx.grm(3);
        if (!msgId || !emoji || !role) return ctx.reply({ embeds: [E.w("Usage: `s!reactionrole add <msgId> <emoji> <@role>`")] }, true);
        let tMsg = null;
        for (const ch of guild.channels.cache.filter(c => c.isTextBased()).values()) { try { tMsg = await ch.messages.fetch(msgId); if (tMsg) break; } catch {} }
        if (!tMsg) return ctx.reply({ embeds: [E.er("Message not found.")] }, true);
        if (!data.reactionRoles[guild.id]) data.reactionRoles[guild.id] = {};
        if (!data.reactionRoles[guild.id][msgId]) data.reactionRoles[guild.id][msgId] = {};
        data.reactionRoles[guild.id][msgId][emoji] = role.id;
        saveData();
        await tMsg.react(emoji).catch(() => {});
        return ctx.reply({ embeds: [E.ok("✅ Reaction Role Added").addFields({ name: "Message", value: `[Jump](${tMsg.url})`, inline: true }, { name: "Emoji", value: emoji, inline: true }, { name: "Role", value: `<@&${role.id}>`, inline: true }).setFooter({ text: FT })] });
      }
      if (sub === "remove") {
        const msgId = ctx.gs("messageid") || ctx.ga(1), emoji = ctx.gs("emoji") || ctx.ga(2);
        if (!msgId || !emoji) return ctx.reply({ embeds: [E.w("Usage: `s!reactionrole remove <msgId> <emoji>`")] }, true);
        if (data.reactionRoles[guild.id]?.[msgId]?.[emoji]) { delete data.reactionRoles[guild.id][msgId][emoji]; if (!Object.keys(data.reactionRoles[guild.id][msgId]).length) delete data.reactionRoles[guild.id][msgId]; saveData(); return ctx.reply({ embeds: [E.ok("✅ Reaction Role Removed")] }); }
        return ctx.reply({ embeds: [E.er("Reaction role not found.")] }, true);
      }
      if (sub === "list") {
        const gRR = data.reactionRoles[guild.id];
        if (!gRR || !Object.keys(gRR).length) return ctx.reply({ embeds: [E.i("No reaction roles configured yet.")] });
        const lines = [];
        for (const [msgId, emojis] of Object.entries(gRR)) { lines.push(`**Message \`${msgId}\`**`); for (const [e, rId] of Object.entries(emojis)) lines.push(`  ${e} → <@&${rId}>`); }
        return ctx.reply({ embeds: [E.i("🎭 Reaction Roles").setDescription(lines.join("\n")).setFooter({ text: FT }).setTimestamp()] });
      }
      if (sub === "panel") {
        const title = ctx.gs("title") || ctx.gas().slice(1, 2).join(" "), desc = ctx.gs("description") || ctx.gas().slice(2).join(" ");
        if (!title || !desc) return ctx.reply({ embeds: [E.w("Usage: `s!reactionrole panel <title> <description>`")] }, true);
        if (ctx.slash) await ctx.i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const sent = await ctx.channel.send({ embeds: [E.b(title).setDescription(`${desc}\n\n*React below to receive a role!*`).setFooter({ text: FT }).setTimestamp()] });
        return ctx.reply({ content: `✅ Panel posted! Add roles with \`s!reactionrole add ${sent.id} <emoji> <@role>\``, flags: MessageFlags.Ephemeral });
      }
      return ctx.reply({ embeds: [E.w("Subcommands: `add` · `remove` · `list` · `panel`")] }, true);
    }

    // ── NEW COMMANDS ──────────────────────────────────────────────────────────

    case "serverscan": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      let members2;
      try { members2 = await guild.members.fetch(); } catch { return ctx.reply({ embeds: [E.er("Failed to fetch members — check Server Members intent.")] }); }
      const now2 = Date.now(), week = 7 * 24 * 60 * 60 * 1000, day = 86400000;
      const newAccs   = members2.filter(m => !m.user.bot && now2 - m.user.createdTimestamp < week);
      const newJoins2 = members2.filter(m => !m.user.bot && m.joinedTimestamp && now2 - m.joinedTimestamp < day);
      const noRoles2  = members2.filter(m => !m.user.bot && m.roles.cache.size <= 1);
      const noAvatar2 = members2.filter(m => !m.user.bot && !m.user.avatar);
      const bots2     = members2.filter(m => m.user.bot);
      const scamCount = Object.keys(data.scamWarnings).filter(k => k.startsWith(guild.id + ":")).length;
      const riskScore = Math.min(100, newAccs.size * 3 + newJoins2.size * 2 + noAvatar2.size);
      const riskLevel = riskScore >= 40 ? "🔴 High Risk" : riskScore >= 15 ? "🟡 Medium Risk" : "🟢 Low Risk";
      return ctx.reply({ embeds: [
        E.mk(riskScore >= 40 ? C.error : riskScore >= 15 ? C.warn : C.success, `🔍 Server Security Scan`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: "🛡️ Risk Level",         value: `${riskLevel} (Score: **${riskScore}**/100)`,         inline: false },
            { name: "👥 Total Members",       value: `${guild.memberCount}`,                                inline: true  },
            { name: "🤖 Bots",               value: `${bots2.size}`,                                       inline: true  },
            { name: "📅 New Accounts (<7d)",  value: `${newAccs.size}`,                                    inline: true  },
            { name: "📥 Joined Today",        value: `${newJoins2.size}`,                                  inline: true  },
            { name: "🎭 No Roles",            value: `${noRoles2.size}`,                                   inline: true  },
            { name: "👤 No Avatar",           value: `${noAvatar2.size}`,                                  inline: true  },
            { name: "🚨 Scam Offenses",       value: `${scamCount}`,                                       inline: true  },
            { name: "🚫 Blacklisted Users",   value: `${data.blacklist.length}`,                           inline: true  },
            { name: "🛡️ Anti-Raid",          value: gAR(guild.id).enabled ? "🟢 Active" : "🔴 Disabled",  inline: true  },
            { name: "☢️ Anti-Nuke",           value: gAN(guild.id).enabled ? "🟢 Active" : "🔴 Disabled",  inline: true  },
            { name: "💡 Recommendation",      value: riskScore >= 40 ? "⚠️ High risk detected! Enable `/antiraid` immediately and review recent joins." : riskScore >= 15 ? "Monitor new joins closely. Consider running `/antiraid enable`." : "Server looks healthy! Keep security features enabled." },
          )
          .setFooter({ text: `Scanned by ${user.username} · ${FT}` }).setTimestamp()
      ]});
    }

    case "roleinfo": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const role = ctx.slash ? ctx.i.options.getRole("role") : guild.roles.cache.find(r => r.name.toLowerCase() === (ctx.ga(0) || "").toLowerCase() || r.id === ctx.ga(0));
      if (!role) return ctx.reply({ embeds: [E.w("Provide a valid role.")] }, true);
      const membersWithRole = guild.members.cache.filter(m => m.roles.cache.has(role.id));
      const permsNames = role.permissions.toArray().slice(0, 8).map(p => `\`${p.toLowerCase().replace(/_/g, " ")}\``).join(", ") || "None";
      return ctx.reply({ embeds: [
        E.mk(role.color || C.brand, `🎭 Role: ${role.name}`)
          .addFields(
            { name: "🆔 Role ID",       value: role.id,                                                      inline: true },
            { name: "🎨 Color",          value: `#${role.color.toString(16).padStart(6, "0").toUpperCase()}`, inline: true },
            { name: "📊 Position",       value: `${role.position}`,                                          inline: true },
            { name: "👥 Members",        value: `${membersWithRole.size}`,                                   inline: true },
            { name: "🏆 Hoisted",        value: role.hoist ? "Yes" : "No",                                   inline: true },
            { name: "📢 Mentionable",    value: role.mentionable ? "Yes" : "No",                             inline: true },
            { name: "🤖 Managed",        value: role.managed ? "Yes (Bot/Integration)" : "No",               inline: true },
            { name: "📅 Created",        value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`,         inline: true },
            { name: "🔑 Key Permissions",value: permsNames },
          )
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "channelinfo": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const ch2 = (ctx.slash ? ctx.i.options.getChannel("channel") : null) || ctx.channel;
      return ctx.reply({ embeds: [
        E.i(`📡 Channel: #${ch2.name}`)
          .addFields(
            { name: "🆔 Channel ID",  value: ch2.id,                                                         inline: true },
            { name: "📂 Type",         value: ch2.type != null ? ChannelType[ch2.type] || `${ch2.type}` : "Unknown", inline: true },
            { name: "📁 Category",     value: ch2.parent?.name || "None",                                     inline: true },
            { name: "📌 Position",     value: `${ch2.rawPosition ?? "—"}`,                                   inline: true },
            { name: "🔞 NSFW",         value: ch2.nsfw ? "Yes" : "No",                                       inline: true },
            { name: "🐢 Slowmode",     value: ch2.rateLimitPerUser ? `${ch2.rateLimitPerUser}s` : "Off",      inline: true },
            { name: "📅 Created",      value: `<t:${Math.floor(ch2.createdTimestamp / 1000)}:D>`,            inline: true },
            ...(ch2.topic ? [{ name: "📝 Topic", value: ch2.topic.slice(0, 200) }] : []),
          )
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "membercount": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const allM = guild.members.cache;
      const humans = allM.filter(m => !m.user.bot);
      const bots3  = allM.filter(m => m.user.bot);
      const online  = allM.filter(m => !m.user.bot && ["online","idle","dnd"].includes(m.presence?.status || "offline"));
      const boosting = allM.filter(m => m.premiumSince);
      return ctx.reply({ embeds: [
        E.i(`👥 Member Count — ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: "👥 Total",       value: `${guild.memberCount}`,   inline: true },
            { name: "👤 Humans",      value: `${humans.size}`,          inline: true },
            { name: "🤖 Bots",        value: `${bots3.size}`,           inline: true },
            { name: "🟢 Online",      value: `${online.size}`,          inline: true },
            { name: "💎 Boosting",    value: `${boosting.size}`,        inline: true },
            { name: "🏅 Boost Level", value: `${guild.premiumTier}`,    inline: true },
          )
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "snipe": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const sniped = snipeCache.get(ctx.channel.id);
      if (!sniped) return ctx.reply({ embeds: [E.w("👻 Nothing to snipe — no recently deleted messages found.")] });
      return ctx.reply({ embeds: [
        E.mk(C.note, "👻 Sniped Message")
          .setDescription(`"${sniped.content.slice(0, 2000)}"`|| "*[no text content]*")
          .setAuthor({ name: sniped.author, iconURL: sniped.authorAvatar || undefined })
          .addFields({ name: "🕐 Deleted", value: `<t:${Math.floor(sniped.timestamp / 1000)}:R>`, inline: true })
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "editsnipe": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const eSniped = editSnipeCache.get(ctx.channel.id);
      if (!eSniped) return ctx.reply({ embeds: [E.w("✏️ Nothing to edit-snipe — no recently edited messages found.")] });
      return ctx.reply({ embeds: [
        E.mk(C.note, "✏️ Edit Sniped Message")
          .setAuthor({ name: eSniped.author, iconURL: eSniped.authorAvatar || undefined })
          .addFields(
            { name: "📝 Before", value: (eSniped.before || "*empty*").slice(0, 1000) },
            { name: "✏️ After",  value: (eSniped.after  || "*empty*").slice(0, 1000) },
            { name: "🕐 Edited", value: `<t:${Math.floor(eSniped.timestamp / 1000)}:R>`, inline: true },
          )
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "nuke": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const reason3 = ctx.gs("reason") || ctx.gas().join(" ") || "No reason provided";
      const ch3 = ctx.channel;
      const pos3 = ch3.rawPosition;
      const parent3 = ch3.parentId;
      const topic3 = ch3.topic;
      const overw3 = ch3.permissionOverwrites.cache.map(o => ({ id: o.id, type: o.type, allow: o.allow.bitfield.toString(), deny: o.deny.bitfield.toString() }));
      try {
        const newCh = await guild.channels.create({ name: ch3.name, type: ch3.type, parent: parent3 || undefined, topic: topic3 || undefined, reason: `Nuke by ${user.tag}: ${reason3}` });
        await newCh.setPosition(pos3).catch(() => {});
        for (const ow of overw3) {
          await newCh.permissionOverwrites.create(ow.id, {}).catch(() => {});
        }
        await ch3.delete(`Nuke by ${user.tag}: ${reason3}`).catch(() => {});
        await newCh.send({ embeds: [E.ok("💥 Channel Nuked").setDescription(`Channel has been reset by **${user.username}**.\n**Reason:** ${reason3}`).setFooter({ text: FT }).setTimestamp()] });
        await logMod(guild, E.mk(C.error, "💥 Channel Nuked").addFields({ name: "💬 Channel", value: `#${ch3.name}`, inline: true }, { name: "👮 By", value: user.tag, inline: true }, { name: "📋 Reason", value: reason3 }).setTimestamp());
      } catch (e2) { return ctx.reply({ embeds: [E.er("Nuke failed — check my **Manage Channels** permission.")] }, true); }
      break;
    }

    case "listbans": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!hP(member, PermissionFlagsBits.BanMembers)) return ctx.reply({ embeds: [E.er("You need **Ban Members** permission.")] }, true);
      if (ctx.slash) await ctx.i.deferReply().catch(() => {});
      const bans = await guild.bans.fetch().catch(() => null);
      if (!bans) return ctx.reply({ embeds: [E.er("Failed to fetch bans.")] }, true);
      if (!bans.size) return ctx.reply({ embeds: [E.ok("🔨 Ban List — Empty").setDescription("No users are currently banned.").setFooter({ text: FT })] });
      const list2 = bans.first(20).map((b, i) => `**${i + 1}.** ${b.user.tag} — ${b.reason || "No reason"}`).join("\n");
      return ctx.reply({ embeds: [
        E.mk(C.error, `🔨 Ban List — ${bans.size} banned`)
          .setDescription(list2)
          .setFooter({ text: `Showing ${Math.min(bans.size, 20)} of ${bans.size} · ${FT}` }).setTimestamp()
      ]});
    }

    case "steal": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!hP(member, PermissionFlagsBits.ManageEmojisAndStickers)) return ctx.reply({ embeds: [E.er("You need **Manage Emojis** permission.")] }, true);
      const emojiStr = ctx.gs("emoji") || ctx.ga(0);
      const emojiName = ctx.gs("name")  || ctx.ga(1) || "stolen_emoji";
      if (!emojiStr) return ctx.reply({ embeds: [E.w("Provide an emoji or image URL.")] }, true);
      // Try to extract emoji ID from a custom emoji
      const emojiMatch = emojiStr.match(/<a?:[^:]+:(\d+)>/);
      let imageUrl;
      if (emojiMatch) {
        const animated = emojiStr.startsWith("<a:");
        imageUrl = `https://cdn.discordapp.com/emojis/${emojiMatch[1]}.${animated ? "gif" : "png"}`;
      } else if (/^https?:\/\//.test(emojiStr)) {
        imageUrl = emojiStr;
      } else {
        return ctx.reply({ embeds: [E.w("Provide a custom emoji (<:name:id>) or direct image URL.")] }, true);
      }
      try {
        const created = await guild.emojis.create({ name: emojiName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32), attachment: imageUrl, reason: `Stolen by ${user.tag}` });
        return ctx.reply({ embeds: [E.ok("😎 Emoji Stolen!").setDescription(`${created} \`:${created.name}:\` has been added to this server!`).setFooter({ text: FT }).setTimestamp()] });
      } catch (e2) { return ctx.reply({ embeds: [E.er("Failed to steal emoji — check my permissions or try a different image.")], }, true); }
    }

    case "joke": {
      try {
        const jr = await fetch("https://v2.jokeapi.dev/joke/Any?safe-mode&type=single").catch(() => null);
        const jd = jr?.ok ? await jr.json() : null;
        const jokeText = jd?.joke || TIPS[ri(0, TIPS.length - 1)];
        return ctx.reply({ embeds: [E.b("😂 Random Joke").setDescription(jokeText).setFooter({ text: FT })] });
      } catch { return ctx.reply({ embeds: [E.b("😂 Joke").setDescription("Why do programmers prefer dark mode? Because light attracts bugs! 🐛").setFooter({ text: FT })] }); }
    }

    case "fact": {
      try {
        const fr = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en").catch(() => null);
        const fd = fr?.ok ? await fr.json() : null;
        const factText = fd?.text || "The average person walks about 100,000 miles in their lifetime.";
        return ctx.reply({ embeds: [E.b("💡 Random Fact").setDescription(factText).setFooter({ text: FT })] });
      } catch { return ctx.reply({ embeds: [E.b("💡 Fact").setDescription("Honey never spoils — archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.").setFooter({ text: FT })] }); }
    }

    case "timestamp": {
      const offsetStr = ctx.gs("offset") || ctx.ga(0) || "";
      const ms3 = offsetStr ? parseDur(offsetStr) : 0;
      const t3  = Math.floor((Date.now() + (ms3 || 0)) / 1000);
      const formats = [
        { name: "Short Time",      fmt: `<t:${t3}:t>`,  code: `<t:${t3}:t>` },
        { name: "Long Time",       fmt: `<t:${t3}:T>`,  code: `<t:${t3}:T>` },
        { name: "Short Date",      fmt: `<t:${t3}:d>`,  code: `<t:${t3}:d>` },
        { name: "Long Date",       fmt: `<t:${t3}:D>`,  code: `<t:${t3}:D>` },
        { name: "Full Date/Time",  fmt: `<t:${t3}:f>`,  code: `<t:${t3}:f>` },
        { name: "Relative",        fmt: `<t:${t3}:R>`,  code: `<t:${t3}:R>` },
      ];
      const desc = formats.map(f => `**${f.name}:** ${f.fmt} — \`${f.code}\``).join("\n");
      return ctx.reply({ embeds: [E.i("🕐 Discord Timestamp").setDescription(desc).addFields({ name: "Unix", value: `\`${t3}\``, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }

    case "firstmessage": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const fch = (ctx.slash ? ctx.i.options.getChannel("channel") : null) || ctx.channel;
      try {
        const msgs2 = await fch.messages.fetch({ limit: 1, after: "0" });
        const msg2  = msgs2.first();
        if (!msg2) return ctx.reply({ embeds: [E.w("No messages found in that channel.")] }, true);
        return ctx.reply({ embeds: [
          E.i("📌 First Message")
            .setDescription(`[Jump to message](${msg2.url})`)
            .addFields(
              { name: "📝 Content",  value: (msg2.content || "*[no text]*").slice(0, 500), inline: false },
              { name: "👤 Author",   value: `<@${msg2.author.id}>`,                          inline: true  },
              { name: "📅 Sent",     value: `<t:${Math.floor(msg2.createdTimestamp / 1000)}:f>`, inline: true },
            )
            .setFooter({ text: FT }).setTimestamp()
        ]});
      } catch { return ctx.reply({ embeds: [E.er("Could not fetch messages — check my permissions.")] }, true); }
    }

    case "botperms": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const botMember = guild.members.me;
      if (!botMember) return ctx.reply({ embeds: [E.er("Could not fetch bot member.")] }, true);
      const chPerms = ctx.channel.permissionsFor(botMember);
      const gldPerms = botMember.permissions;
      const critPerms = [
        ["SendMessages",           chPerms?.has(PermissionFlagsBits.SendMessages)],
        ["EmbedLinks",             chPerms?.has(PermissionFlagsBits.EmbedLinks)],
        ["AttachFiles",            chPerms?.has(PermissionFlagsBits.AttachFiles)],
        ["ReadMessageHistory",     chPerms?.has(PermissionFlagsBits.ReadMessageHistory)],
        ["ManageMessages",         chPerms?.has(PermissionFlagsBits.ManageMessages)],
        ["ManageChannels",         gldPerms.has(PermissionFlagsBits.ManageChannels)],
        ["ManageRoles",            gldPerms.has(PermissionFlagsBits.ManageRoles)],
        ["KickMembers",            gldPerms.has(PermissionFlagsBits.KickMembers)],
        ["BanMembers",             gldPerms.has(PermissionFlagsBits.BanMembers)],
        ["ModerateMembers",        gldPerms.has(PermissionFlagsBits.ModerateMembers)],
        ["ManageEmojisAndStickers",gldPerms.has(PermissionFlagsBits.ManageEmojisAndStickers)],
        ["ViewAuditLog",           gldPerms.has(PermissionFlagsBits.ViewAuditLog)],
      ];
      const permsDisplay = critPerms.map(([n, v]) => `${v ? "✅" : "❌"} \`${n}\``).join("\n");
      return ctx.reply({ embeds: [
        E.i("🔑 Bot Permissions")
          .setDescription(permsDisplay)
          .addFields({ name: "📢 Channel", value: `<#${ctx.channel.id}>`, inline: true })
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "mock": {
      const mockText = ctx.gs("text") || ctx.gas().join(" ");
      if (!mockText) return ctx.reply({ embeds: [E.w("Provide text to mock.")] }, true);
      const mocked = mockText.split("").map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join("");
      return ctx.reply({ embeds: [E.b("🐸 Mocking Text").setDescription(`> ${mocked}`).setFooter({ text: FT })] });
    }

    case "encode": {
      const encText = ctx.gs("text") || ctx.ga(0);
      if (!encText) return ctx.reply({ embeds: [E.w("Provide text to encode/decode.")] }, true);
      const mode2 = (ctx.gs("mode") || ctx.ga(1) || "encode").toLowerCase();
      try {
        let result2;
        if (mode2 === "decode") {
          result2 = Buffer.from(encText, "base64").toString("utf8");
        } else {
          result2 = Buffer.from(encText, "utf8").toString("base64");
        }
        return ctx.reply({ embeds: [
          E.i(`🔒 Base64 ${mode2 === "decode" ? "Decoded" : "Encoded"}`)
            .addFields({ name: "Input", value: `\`\`\`${encText.slice(0, 500)}\`\`\`` }, { name: "Output", value: `\`\`\`${result2.slice(0, 1000)}\`\`\`` })
            .setFooter({ text: FT })
        ]});
      } catch { return ctx.reply({ embeds: [E.er("Invalid base64 string for decoding.")] }, true); }
    }

    case "afk": {
      const reason4 = ctx.gs("reason") || ctx.gas().join(" ") || "";
      if (!reason4) {
        if (afkUsers.has(user.id)) {
          afkUsers.delete(user.id);
          return ctx.reply({ embeds: [E.ok("✅ Welcome back!").setDescription("Your AFK status has been removed.").setFooter({ text: FT })] });
        }
        return ctx.reply({ embeds: [E.w("Provide a reason: `s!afk <reason>`")] }, true);
      }
      afkUsers.set(user.id, { reason: reason4, timestamp: Date.now() });
      return ctx.reply({ embeds: [E.b("💤 AFK Set").setDescription(`You're now AFK: **${reason4}**\n\nI'll notify anyone who pings you.`).setFooter({ text: FT })] });
    }

    case "clearscam": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const tgt4 = ctx.gu("user"); if (!tgt4) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const key4 = `${guild.id}:${tgt4.id}`;
      const prev4 = data.scamWarnings[key4] || 0;
      delete data.scamWarnings[key4];
      saveData();
      return ctx.reply({ embeds: [E.ok("✅ Scam Offenses Cleared").setDescription(`Cleared **${prev4}** offense(s) for <@${tgt4.id}>.`).setFooter({ text: FT }).setTimestamp()] });
    }

    case "boosters": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const boostM = guild.members.cache.filter(m => m.premiumSince).sort((a, b) => a.premiumSince - b.premiumSince);
      if (!boostM.size) return ctx.reply({ embeds: [E.b("💎 Boosters").setDescription("No members are currently boosting this server.").setFooter({ text: FT })] });
      const lines2 = boostM.map((m, i) => `**${i + 1}.** <@${m.id}> — since <t:${Math.floor(m.premiumSince.getTime() / 1000)}:R>`).join("\n");
      return ctx.reply({ embeds: [
        E.mk(0xFF73FA, `💎 Server Boosters — ${boostM.size}`)
          .setDescription(lines2.slice(0, 4000))
          .addFields({ name: "🏅 Boost Level", value: `${guild.premiumTier}`, inline: true }, { name: "📊 Boosts", value: `${guild.premiumSubscriptionCount || 0}`, inline: true })
          .setFooter({ text: FT }).setTimestamp()
      ]});
    }

    case "perms": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      const tgt5 = ctx.gu("user") || user;
      const m5   = await guild.members.fetch(tgt5.id).catch(() => null);
      if (!m5) return ctx.reply({ embeds: [E.er("User not in this server.")] }, true);
      const perms5 = m5.permissions.toArray();
      const chunkSize = 8;
      const chunks = [];
      for (let i = 0; i < perms5.length; i += chunkSize) chunks.push(perms5.slice(i, i + chunkSize));
      const emb5 = E.i(`🔑 Permissions — ${tgt5.username}`).setThumbnail(tgt5.displayAvatarURL());
      chunks.forEach((chunk, i) => {
        emb5.addFields({ name: i === 0 ? "✅ Has Permissions" : "\u200B", value: chunk.map(p => `\`${p.toLowerCase().replace(/_/g, " ")}\``).join(", "), inline: false });
      });
      return ctx.reply({ embeds: [emb5.setFooter({ text: FT }).setTimestamp()] });
    }

    case "define": {
      const word2 = (ctx.gs("word") || ctx.ga(0) || "").trim();
      if (!word2) return ctx.reply({ embeds: [E.w("Provide a word to define.")] }, true);
      try {
        const dr = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word2)}`).catch(() => null);
        if (!dr?.ok) return ctx.reply({ embeds: [E.w(`No definition found for **${word2}**.`).setFooter({ text: FT })] });
        const dd = await dr.json();
        const entry = Array.isArray(dd) ? dd[0] : null;
        if (!entry) return ctx.reply({ embeds: [E.w(`No definition found for **${word2}**.`).setFooter({ text: FT })] });
        const meaning = entry.meanings?.[0];
        const def5    = meaning?.definitions?.[0];
        const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || "";
        const emb6 = E.b(`📖 ${entry.word}`)
          .setDescription(phonetic ? `*${phonetic}*` : "")
          .addFields({ name: `📝 ${meaning?.partOfSpeech || "Definition"}`, value: def5?.definition || "No definition found." });
        if (def5?.example) emb6.addFields({ name: "💬 Example", value: `*"${def5.example}"*` });
        const synonyms = meaning?.synonyms?.slice(0, 5).join(", ");
        if (synonyms) emb6.addFields({ name: "🔄 Synonyms", value: synonyms, inline: true });
        return ctx.reply({ embeds: [emb6.setFooter({ text: FT }).setTimestamp()] });
      } catch { return ctx.reply({ embeds: [E.er("Dictionary API unavailable. Try again later.")] }, true); }
    }

    case "notes": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const tgt6 = ctx.gu("user"); if (!tgt6) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const allLogs = data.warns[tgt6.id] || [];
      const staffNotes = allLogs.filter(l => l.type === "note");
      const emb7 = E.mo(`📝 Staff Notes — ${tgt6.username}`).setThumbnail(tgt6.displayAvatarURL());
      if (!staffNotes.length) emb7.setDescription("✅ No staff notes recorded for this user.");
      else staffNotes.slice(-10).forEach(n => emb7.addFields({ name: `📝 Note #${n.id} · <t:${Math.floor(new Date(n.at).getTime() / 1000)}:R>`, value: `${n.reason}\n*by <@${n.modId}>*` }));
      return ctx.reply({ embeds: [emb7.setFooter({ text: FT }).setTimestamp()] });
    }

    // ── ANTI-RAID ─────────────────────────────────────────────────────────────
    case "antiraid": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const sub = ctx.gsub() || ctx.ga(0) || "", s = gAR(guild.id);
      if (sub === "enable")  { s.enabled = true;  saveData(); return ctx.reply({ embeds: [E.ok("🛡️ Anti-Raid Enabled").addFields({ name: "Threshold", value: `${s.threshold} joins`, inline: true }, { name: "Window", value: `${s.window / 1000}s`, inline: true }, { name: "Action", value: s.action.toUpperCase(), inline: true }).setFooter({ text: FT })] }); }
      if (sub === "disable") { s.enabled = false; saveData(); return ctx.reply({ embeds: [E.w("🛡️ Anti-Raid Disabled").setFooter({ text: FT })] }); }
      if (sub === "status")  { return ctx.reply({ embeds: [E.mk(s.enabled ? C.success : C.warn, `🛡️ Anti-Raid — ${s.enabled ? "🟢 Active" : "🔴 Disabled"}`).addFields({ name: "⚡ Trigger Threshold", value: `**${s.threshold}** joins`, inline: true }, { name: "⏱️ Detection Window", value: `**${s.window / 1000}** seconds`, inline: true }, { name: "🎯 Action", value: `**${s.action.toUpperCase()}**`, inline: true }, { name: "🔓 Auto-Unlock", value: s.autoUnlock ? `**${fmtDur(s.autoUnlock)}**` : "Manual only", inline: true }, { name: "📨 DM on Action", value: s.dmOnAction ? "Yes" : "No", inline: true }, { name: "👥 Whitelisted Users", value: `**${s.whitelistedUsers?.length || 0}**`, inline: true }, { name: "📢 Notify Channel", value: s.notifyChannel ? `<#${s.notifyChannel}>` : "Not set", inline: true }).setFooter({ text: FT }).setTimestamp()] }); }
      if (sub === "config")  { const threshold = ctx.gi("threshold"), window2 = ctx.gi("window"), action = ctx.gs("action"), autounlock = ctx.gi("autounlock"), notify = ctx.gc("notify"); if (threshold != null) s.threshold = threshold; if (window2 != null) s.window = window2 * 1000; if (action != null) s.action = action; if (autounlock != null) s.autoUnlock = autounlock * 1000; if (notify) s.notifyChannel = notify.id; saveData(); return ctx.reply({ embeds: [E.ok("🛡️ Anti-Raid Updated").addFields({ name: "Threshold", value: `${s.threshold} joins`, inline: true }, { name: "Window", value: `${s.window / 1000}s`, inline: true }, { name: "Action", value: s.action.toUpperCase(), inline: true }, { name: "Auto-Unlock", value: s.autoUnlock ? fmtDur(s.autoUnlock) : "Manual", inline: true }).setFooter({ text: FT })] }); }
      if (sub === "whitelist")   { const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true); if (!s.whitelistedUsers) s.whitelistedUsers = []; if (!s.whitelistedUsers.includes(target.id)) s.whitelistedUsers.push(target.id); saveData(); return ctx.reply({ embeds: [E.ok("✅ User Whitelisted").setDescription(`<@${target.id}> is now exempt from anti-raid.`).setFooter({ text: FT })] }); }
      if (sub === "unwhitelist") { const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true); s.whitelistedUsers = (s.whitelistedUsers || []).filter(id => id !== target.id); saveData(); return ctx.reply({ embeds: [E.ok("✅ Removed from Whitelist").setFooter({ text: FT })] }); }
      return ctx.reply({ embeds: [E.w("Subcommands: `enable` · `disable` · `status` · `config` · `whitelist` · `unwhitelist`")] }, true);
    }

    // ── ANTI-NUKE ─────────────────────────────────────────────────────────────
    case "antinuke": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const sub = ctx.gsub() || ctx.ga(0) || "", s = gAN(guild.id);
      if (sub === "enable")  { s.enabled = true;  saveData(); return ctx.reply({ embeds: [E.ok("☢️ Anti-Nuke Enabled").addFields({ name: "Action", value: s.action.toUpperCase(), inline: true }, { name: "Ban Threshold", value: `${s.banThreshold}`, inline: true }, { name: "Channel Delete Threshold", value: `${s.channelDeleteThreshold}`, inline: true }).setFooter({ text: FT })] }); }
      if (sub === "disable") { s.enabled = false; saveData(); return ctx.reply({ embeds: [E.w("☢️ Anti-Nuke Disabled").setFooter({ text: FT })] }); }
      if (sub === "status")  { return ctx.reply({ embeds: [E.mk(s.enabled ? C.success : C.warn, `☢️ Anti-Nuke — ${s.enabled ? "🟢 Active" : "🔴 Disabled"}`).addFields({ name: "⏱️ Detection Window", value: `**${s.window / 1000}** seconds`, inline: true }, { name: "🎯 Action", value: `**${s.action.toUpperCase()}**`, inline: true }, { name: "📨 Ban Threshold", value: `**${s.banThreshold}** bans`, inline: true }, { name: "💬 Channel Delete Threshold", value: `**${s.channelDeleteThreshold}** del`, inline: true }, { name: "🎭 Role Delete Threshold", value: `**${s.roleDeleteThreshold}** del`, inline: true }, { name: "👢 Kick Threshold", value: `**${s.kickThreshold}** kicks`, inline: true }, { name: "👥 Trusted Users", value: `**${s.trustedUsers?.length || 0}**`, inline: true }, { name: "📢 Notify Channel", value: s.notifyChannel ? `<#${s.notifyChannel}>` : "Not set", inline: true }).setFooter({ text: FT }).setTimestamp()] }); }
      if (sub === "config")  { const banth = ctx.gi("banth"), channelth = ctx.gi("channelth"), roleth = ctx.gi("roleth"), kickth = ctx.gi("kickth"), action = ctx.gs("action"), notify = ctx.gc("notify"); if (banth != null) s.banThreshold = banth; if (channelth != null) s.channelDeleteThreshold = channelth; if (roleth != null) s.roleDeleteThreshold = roleth; if (kickth != null) s.kickThreshold = kickth; if (action != null) s.action = action; if (notify) s.notifyChannel = notify.id; saveData(); return ctx.reply({ embeds: [E.ok("☢️ Anti-Nuke Updated").addFields({ name: "Ban Threshold", value: `${s.banThreshold}`, inline: true }, { name: "Channel Threshold", value: `${s.channelDeleteThreshold}`, inline: true }, { name: "Role Threshold", value: `${s.roleDeleteThreshold}`, inline: true }, { name: "Kick Threshold", value: `${s.kickThreshold}`, inline: true }, { name: "Action", value: s.action.toUpperCase(), inline: true }).setFooter({ text: FT })] }); }
      if (sub === "trust")   { const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true); if (!s.trustedUsers) s.trustedUsers = []; if (!s.trustedUsers.includes(target.id)) s.trustedUsers.push(target.id); saveData(); return ctx.reply({ embeds: [E.ok("✅ User Trusted").setDescription(`<@${target.id}> is now exempt from anti-nuke.`).setFooter({ text: FT })] }); }
      if (sub === "untrust") { const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true); s.trustedUsers = (s.trustedUsers || []).filter(id => id !== target.id); saveData(); return ctx.reply({ embeds: [E.ok("✅ Trust Removed").setFooter({ text: FT })] }); }
      return ctx.reply({ embeds: [E.w("Subcommands: `enable` · `disable` · `status` · `config` · `trust` · `untrust`")] }, true);
    }

    // ── MODERATION ────────────────────────────────────────────────────────────
    case "ban": {
      if (!hP(member, PermissionFlagsBits.BanMembers)) return ctx.reply({ embeds: [E.er("You need **Ban Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const reason = ctx.gs("reason") || "No reason provided", days = ctx.gi("days") ?? 0;
      const tm = await guild.members.fetch(target.id).catch(() => null);
      if (tm && !tm.bannable) return ctx.reply({ embeds: [E.er("I cannot ban this user — they may have a higher role than me.")] }, true);
      try { await guild.bans.create(target.id, { reason: `By ${user.tag}: ${reason}`, deleteMessageSeconds: days * 86400 }); } catch { return ctx.reply({ embeds: [E.er("Ban failed — check my permissions.")] }, true); }
      if (!data.warns[target.id]) data.warns[target.id] = [];
      data.warns[target.id].push({ id: data.nextWarnId++, type: "ban", reason, modId: user.id, at: new Date().toISOString() });
      saveData();
      try { await target.send({ embeds: [E.er(`🔨 You were banned from ${guild.name}`).addFields({ name: "Reason", value: reason }, { name: "Moderator", value: user.tag }).setTimestamp()] }); } catch {}
      const emb = E.mk(C.error, "🔨 Member Banned").addFields({ name: "👤 User", value: `${target.tag}\n<@${target.id}>`, inline: true }, { name: "👮 Moderator", value: user.tag, inline: true }, { name: "🗑️ Messages Deleted", value: days > 0 ? `${days} day(s)` : "None", inline: true }, { name: "📋 Reason", value: reason }).setFooter({ text: FT }).setTimestamp();
      await ctx.reply({ embeds: [emb] }); await logMod(guild, emb); break;
    }
    case "softban": {
      if (!hP(member, PermissionFlagsBits.BanMembers)) return ctx.reply({ embeds: [E.er("You need **Ban Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const reason = ctx.gs("reason") || "Softban";
      try { await guild.bans.create(target.id, { reason: `Softban by ${user.tag}: ${reason}`, deleteMessageSeconds: 7 * 86400 }); await guild.bans.remove(target.id, "Softban unban"); } catch { return ctx.reply({ embeds: [E.er("Softban failed — check my permissions.")] }, true); }
      const emb = E.mk(C.warn, "🧹 Member Softbanned").addFields({ name: "👤 User", value: `${target.tag}\n<@${target.id}>`, inline: true }, { name: "👮 Moderator", value: user.tag, inline: true }, { name: "⚡ Effect", value: "Banned then immediately unbanned\n7 days of messages deleted", inline: true }, { name: "📋 Reason", value: reason }).setFooter({ text: FT }).setTimestamp();
      await ctx.reply({ embeds: [emb] }); await logMod(guild, emb); break;
    }
    case "kick": {
      if (!hP(member, PermissionFlagsBits.KickMembers)) return ctx.reply({ embeds: [E.er("You need **Kick Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const reason = ctx.gs("reason") || "No reason provided";
      const m2 = await guild.members.fetch(target.id).catch(() => null);
      if (!m2?.kickable) return ctx.reply({ embeds: [E.er("Cannot kick this user.")] }, true);
      await m2.kick(`By ${user.tag}: ${reason}`);
      const emb = E.mk(C.warn, "👢 Member Kicked").addFields({ name: "👤 User", value: `${target.tag}\n<@${target.id}>`, inline: true }, { name: "👮 Moderator", value: user.tag, inline: true }, { name: "📋 Reason", value: reason }).setFooter({ text: FT }).setTimestamp();
      await ctx.reply({ embeds: [emb] }); await logMod(guild, emb); break;
    }
    case "mute": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const target = ctx.gu("user"), durStr = ctx.gs("duration") || ctx.ga(1) || "", reason = ctx.gs("reason") || "No reason provided";
      if (!target || !durStr) return ctx.reply({ embeds: [E.w("Usage: `/mute @user <duration> [reason]`")] }, true);
      const ms = parseDur(durStr);
      if (!ms || ms > 28 * T.d) return ctx.reply({ embeds: [E.er("Invalid duration. Max is 28 days.")] }, true);
      const m2 = await guild.members.fetch(target.id).catch(() => null);
      if (!m2?.moderatable) return ctx.reply({ embeds: [E.er("Cannot timeout this user.")] }, true);
      await m2.timeout(ms, `By ${user.tag}: ${reason}`);
      const emb = E.mk(C.warn, "🔇 Member Timed Out").addFields({ name: "👤 User", value: `${target.tag}\n<@${target.id}>`, inline: true }, { name: "⏱️ Duration", value: fmtDur(ms), inline: true }, { name: "👮 Moderator", value: user.tag, inline: true }, { name: "📋 Reason", value: reason }).setFooter({ text: FT }).setTimestamp();
      await ctx.reply({ embeds: [emb] }); await logMod(guild, emb); break;
    }
    case "unmute": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const m2 = await guild.members.fetch(target.id).catch(() => null);
      if (!m2) return ctx.reply({ embeds: [E.er("User not found in server.")] }, true);
      await m2.timeout(null, `Timeout removed by ${user.tag}`);
      return ctx.reply({ embeds: [E.ok("🔊 Timeout Removed").addFields({ name: "👤 User", value: `<@${target.id}>`, inline: true }, { name: "👮 By", value: user.tag, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "warn": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const target = ctx.gu("user"), reason = ctx.gs("reason") || ctx.gas().slice(1).join(" ");
      if (!target || !reason) return ctx.reply({ embeds: [E.w("Usage: `/warn @user <reason>`")] }, true);
      const w = { id: data.nextWarnId++, type: "warn", reason, modId: user.id, at: new Date().toISOString() };
      if (!data.warns[target.id]) data.warns[target.id] = [];
      data.warns[target.id].push(w);
      saveData();
      const emb = E.mk(C.warn, "⚠️ Member Warned").addFields({ name: "👤 User", value: `${target.tag}\n<@${target.id}>`, inline: true }, { name: "📢 Warn ID", value: `#${w.id}`, inline: true }, { name: "📊 Total Warns", value: `${data.warns[target.id].length}`, inline: true }, { name: "👮 Moderator", value: user.tag, inline: true }, { name: "📋 Reason", value: reason }).setFooter({ text: FT }).setTimestamp();
      await ctx.reply({ embeds: [emb] }); await logMod(guild, emb);
      try { const u2 = await client.users.fetch(target.id); u2.send({ embeds: [E.w(`⚠️ You were warned in ${guild.name}`).addFields({ name: "Reason", value: reason }, { name: "Total Warnings", value: `${data.warns[target.id].length}` }).setFooter({ text: FT }).setTimestamp()] }); } catch {}
      break;
    }
    case "warns": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const list = (data.warns[target.id] || []).filter(w => !w.type || w.type === "warn");
      const emb  = E.mk(list.length ? C.warn : C.success, `⚠️ Warnings — ${target.username}`).setThumbnail(target.displayAvatarURL());
      if (!list.length) emb.setDescription("✅ This user has no warnings.");
      else list.slice(-10).forEach(w => emb.addFields({ name: `⚠️ Warning #${w.id}`, value: `**Reason:** ${w.reason || "—"}\n**By:** <@${w.modId}> · <t:${Math.floor(new Date(w.at).getTime() / 1000)}:R>`, inline: true }));
      return ctx.reply({ embeds: [emb.setFooter({ text: FT }).setTimestamp()] });
    }
    case "unwarn": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const id = ctx.gi("id") || parseInt(ctx.ga(0), 10);
      if (!id) return ctx.reply({ embeds: [E.w("Provide a warning ID.")] }, true);
      let found = false;
      for (const uid of Object.keys(data.warns)) { const i = data.warns[uid].findIndex(w => w.id === id); if (i !== -1) { data.warns[uid].splice(i, 1); found = true; break; } }
      if (!found) return ctx.reply({ embeds: [E.er(`Warning #${id} not found.`)] }, true);
      saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Warning #${id} removed.`).setFooter({ text: FT })] });
    }
    case "clearwarns": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const count  = (data.warns[target.id] || []).length;
      data.warns[target.id] = [];
      saveData();
      return ctx.reply({ embeds: [E.ok("✅ Warnings Cleared").setDescription(`Removed **${count}** warning(s) from <@${target.id}>.`).setFooter({ text: FT })] });
    }
    case "modlogs": {
      if (!hP(member, PermissionFlagsBits.ModerateMembers)) return ctx.reply({ embeds: [E.er("You need **Moderate Members** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const logs   = data.warns[target.id] || [];
      const emb    = E.mo(`📔 Mod Logs — ${target.username}`).setThumbnail(target.displayAvatarURL());
      if (!logs.length) emb.setDescription("✅ No mod actions on record.");
      else logs.slice(-10).forEach(l => emb.addFields({ name: `${l.type === "ban" ? "🔨" : l.type === "kick" ? "👢" : "⚠️"} ${(l.type || "warn").toUpperCase()} #${l.id}`, value: `**Reason:** ${l.reason || "—"}\n**By:** <@${l.modId}> · <t:${Math.floor(new Date(l.at).getTime() / 1000)}:R>`, inline: true }));
      return ctx.reply({ embeds: [emb.setFooter({ text: FT }).setTimestamp()] });
    }
    case "purge": {
      if (!hP(member, PermissionFlagsBits.ManageMessages)) return ctx.reply({ embeds: [E.er("You need **Manage Messages** permission.")] }, true);
      const count = ctx.gi("count") || parseInt(ctx.ga(0), 10) || 10, filterUser = ctx.gu("user");
      if (count < 1 || count > 100) return ctx.reply({ embeds: [E.w("Count must be 1-100.")] }, true);
      if (ctx.slash) await ctx.i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const msgs = await ctx.channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (!msgs) return ctx.reply({ embeds: [E.er("Failed to fetch messages.")] }, true);
      let toDelete = msgs.filter(m => !m.pinned && Date.now() - m.createdTimestamp < 1209600000);
      if (filterUser) toDelete = toDelete.filter(m => m.author.id === filterUser.id);
      toDelete = toDelete.first(count);
      const deleted = await ctx.channel.bulkDelete(toDelete, true).catch(() => null);
      return ctx.reply({ embeds: [E.ok("🗑️ Messages Purged").addFields({ name: "Deleted", value: `${deleted?.size || 0} messages`, inline: true }, ...(filterUser ? [{ name: "Filter", value: `<@${filterUser.id}>`, inline: true }] : []))], flags: MessageFlags.Ephemeral });
    }
    case "lock": {
      if (!hP(member, PermissionFlagsBits.ManageChannels)) return ctx.reply({ embeds: [E.er("You need **Manage Channels** permission.")] }, true);
      await ctx.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});
      return ctx.reply({ embeds: [E.ok("🔒 Channel Locked").setDescription("Only staff can send messages here.").setFooter({ text: FT })] });
    }
    case "unlock": {
      if (!hP(member, PermissionFlagsBits.ManageChannels)) return ctx.reply({ embeds: [E.er("You need **Manage Channels** permission.")] }, true);
      await ctx.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {});
      return ctx.reply({ embeds: [E.ok("🔓 Channel Unlocked").setFooter({ text: FT })] });
    }
    case "slowmode": {
      if (!hP(member, PermissionFlagsBits.ManageChannels)) return ctx.reply({ embeds: [E.er("You need **Manage Channels** permission.")] }, true);
      const secs = ctx.gi("seconds") ?? parseInt(ctx.ga(0) || "0");
      await ctx.channel.setRateLimitPerUser(secs).catch(() => {});
      return ctx.reply({ embeds: [E.ok("🐢 Slowmode Set").setDescription(secs === 0 ? "Slowmode disabled." : `Messages limited to one per **${secs}s**.`).setFooter({ text: FT })] });
    }
    case "nick": {
      if (!hP(member, PermissionFlagsBits.ManageNicknames)) return ctx.reply({ embeds: [E.er("You need **Manage Nicknames** permission.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const name   = ctx.gs("name") || ctx.gas().slice(1).join(" ") || null;
      const m2     = await guild.members.fetch(target.id).catch(() => null);
      if (!m2) return ctx.reply({ embeds: [E.er("User not found.")] }, true);
      await m2.setNickname(name, `By ${user.tag}`).catch(() => {});
      return ctx.reply({ embeds: [E.ok("✏️ Nickname Updated").addFields({ name: "User", value: `<@${target.id}>`, inline: true }, { name: "Nickname", value: name || "*(reset)*", inline: true }).setFooter({ text: FT })] });
    }

    // ── ADMIN TOOLS ───────────────────────────────────────────────────────────
    case "say": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const msg2 = ctx.gs("message") || ctx.gas().join(" ");
      if (!msg2) return ctx.reply({ embeds: [E.w("Usage: `s!say <message>`")] }, true);
      await ctx.channel.send({ content: msg2 });
      if (ctx.slash) await ctx.i.reply({ content: "✅ Sent!", flags: MessageFlags.Ephemeral }).catch(() => {});
      break;
    }
    case "embed": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const title = ctx.gs("title") || ctx.gas()[0] || "Embed";
      const body  = ctx.gs("body")  || ctx.gas().slice(1).join(" ") || "No content";
      const color = parseInt((ctx.gs("color") || "FF8FB1").replace("#", ""), 16) || C.brand;
      await ctx.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(title).setDescription(body).setFooter({ text: FT }).setTimestamp()] });
      if (ctx.slash) await ctx.i.reply({ content: "✅ Embed sent!", flags: MessageFlags.Ephemeral }).catch(() => {});
      break;
    }
    case "poll": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const question = ctx.gs("question") || ctx.gas()[0] || "Poll";
      const optsRaw  = ctx.gs("options")  || ctx.gas().slice(1).join(" ") || "";
      const opts     = optsRaw.split("|").map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) return ctx.reply({ embeds: [E.w("Provide at least 2 options separated by `|`")] }, true);
      const nums = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const desc = opts.slice(0, 10).map((o, i) => `${nums[i]} ${o}`).join("\n");
      const sent = await ctx.channel.send({ embeds: [E.b(`📊 ${question}`).setDescription(desc).setFooter({ text: `Poll by ${user.tag}` }).setTimestamp()] });
      for (let i = 0; i < Math.min(opts.length, 10); i++) await sent.react(nums[i]).catch(() => {});
      if (ctx.slash) await ctx.i.reply({ content: "✅ Poll created!", flags: MessageFlags.Ephemeral }).catch(() => {});
      break;
    }
    case "giveaway": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const durStr  = ctx.gs("duration") || ctx.ga(0) || "";
      const prize   = ctx.gs("prize") || ctx.gas().slice(1, 2).join(" ") || "Prize";
      const winners = ctx.gi("winners") || 1;
      const ms      = parseDur(durStr);
      if (!ms) return ctx.reply({ embeds: [E.er("Invalid duration. Example: `1h`, `30m`, `1d`")] }, true);
      const sent = await ctx.channel.send({ embeds: [E.ok("🎉 Giveaway Started!").setDescription(`React with 🎉 to enter!\n\n**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor((Date.now() + ms) / 1000)}:R>`).setFooter({ text: `${winners} winner(s) · ${FT}` }).setTimestamp()] });
      await sent.react("🎉").catch(() => {});
      data.giveaways[sent.id] = { prize, winners, endAt: Date.now() + ms, guildId: guild.id, channelId: ctx.channel.id, ended: false };
      saveData();
      if (ctx.slash) await ctx.i.reply({ content: "✅ Giveaway started!", flags: MessageFlags.Ephemeral }).catch(() => {});
      break;
    }
    case "addorder": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const target  = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const details = ctx.gs("details") || ctx.gas().slice(1).join(" "); if (!details) return ctx.reply({ embeds: [E.w("Provide order details.")] }, true);
      const order   = { id: data.nextOrderId++, userId: target.id, details, status: "not_started", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      data.orders.push(order);
      data.stats.ordersCreated = (data.stats.ordersCreated || 0) + 1;
      saveData();
      updateOrderBoard().catch(() => {});
      return ctx.reply({ embeds: [E.ok(`✅ Order #${order.id} Created`).addFields({ name: "👤 Customer", value: `<@${target.id}>`, inline: true }, { name: "📋 Details", value: details }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "updateorder": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const id = ctx.gi("id") || parseInt(ctx.ga(0), 10), o = findOrder(id);
      if (!o) return ctx.reply({ embeds: [E.er(`Order #${id} not found.`)] }, true);
      const status = ctx.gs("status") || ctx.ga(1), note = ctx.gs("note") || ctx.gas().slice(2).join(" ");
      if (status && OS[status]) o.status = status;
      if (note) o.note = note;
      o.updatedAt = new Date().toISOString();
      saveData();
      updateOrderBoard().catch(() => {});
      const si = gOS(o.status);
      return ctx.reply({ embeds: [E.mk(si.color, `🔄 Order #${o.id} Updated`).addFields({ name: "📊 Status", value: `${si.emoji} ${si.label}`, inline: true }, { name: "👤 Customer", value: `<@${o.userId}>`, inline: true }, ...(note ? [{ name: "📝 Note", value: note }] : [])).setFooter({ text: FT }).setTimestamp()] });
    }
    case "complete": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const id = ctx.gi("id") || parseInt(ctx.ga(0), 10), o = findOrder(id);
      if (!o) return ctx.reply({ embeds: [E.er(`Order #${id} not found.`)] }, true);
      o.status = "completed"; o.updatedAt = new Date().toISOString();
      data.stats.ordersCompleted = (data.stats.ordersCompleted || 0) + 1;
      saveData();
      updateOrderBoard().catch(() => {});
      return ctx.reply({ embeds: [E.ok(`✅ Order #${o.id} Marked Complete`).addFields({ name: "👤 Customer", value: `<@${o.userId}>`, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "blacklist": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const target = ctx.gu("user"); if (!target) return ctx.reply({ embeds: [E.w("Provide a user.")] }, true);
      const idx    = data.blacklist.indexOf(target.id);
      if (idx !== -1) { data.blacklist.splice(idx, 1); saveData(); return ctx.reply({ embeds: [E.ok(`✅ ${target.tag} removed from blacklist.`).setFooter({ text: FT })] }); }
      data.blacklist.push(target.id); saveData();
      return ctx.reply({ embeds: [E.er(`🚫 ${target.tag} blacklisted.`).setFooter({ text: FT })] });
    }
    case "setlog": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const ch = ctx.gc("channel") || ctx.channel;
      data.modLogChannels[guild.id] = ch.id; saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Mod log channel set to <#${ch.id}>`).setFooter({ text: FT })] });
    }
    case "setreviews": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const ch = ctx.gc("channel") || ctx.channel;
      gS(guild.id).reviewsChannelId = ch.id; saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Reviews channel set to <#${ch.id}>`).setFooter({ text: FT })] });
    }
    case "settranscripts": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const ch = ctx.gc("channel") || ctx.channel;
      gS(guild.id).transcriptsChannelId = ch.id; saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Transcripts channel set to <#${ch.id}>`).setFooter({ text: FT })] });
    }
    case "setverifyrole": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const role = ctx.gr("role"); if (!role) return ctx.reply({ embeds: [E.w("Provide a role.")] }, true);
      gS(guild.id).verifyRoleId = role.id; saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Verify role set to <@&${role.id}>`).setFooter({ text: FT })] });
    }
    case "setlevelupchannel": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const ch = ctx.gc("channel"); if (!ch) return ctx.reply({ embeds: [E.w("Provide a channel.")] }, true);
      gS(guild.id).levelUpChannelId = ch.id; saveData();
      return ctx.reply({ embeds: [E.ok(`✅ Level-up channel set to <#${ch.id}>`).setFooter({ text: FT })] });
    }
    case "ticketpanel": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const { emb, row } = buildTicketPanel();
      await ctx.channel.send({ embeds: [emb], components: [row] });
      if (ctx.slash) await ctx.i.reply({ content: "✅ Ticket panel posted!", flags: MessageFlags.Ephemeral }).catch(() => {});
      break;
    }
    case "close": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      if (!ctx.channel?.name?.startsWith("ticket-")) return ctx.reply({ embeds: [E.w("This command only works in ticket channels.")] }, true);
      const reason = ctx.gs("reason") || ctx.gas().join(" ") || "No reason provided";
      await closeTicket(ctx.channel, member, reason, guild);
      break;
    }
    case "addnote": {
      if (!isStaff(member)) return ctx.reply({ embeds: [E.er("Staff only.")] }, true);
      const text = ctx.gs("text") || ctx.gas().join(" ");
      if (!text) return ctx.reply({ embeds: [E.w("Provide a note.")] }, true);
      return ctx.reply({ embeds: [E.mk(C.note, "📝 Staff Note").setDescription(text).addFields({ name: "👮 Added by", value: user.tag, inline: true }).setFooter({ text: FT }).setTimestamp()] });
    }
    case "givecoins": {
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const target = ctx.gu("user"), amount = ctx.gi("amount") || parseInt(ctx.ga(1), 10);
      if (!target || !amount || amount < 1) return ctx.reply({ embeds: [E.w("Usage: `s!givecoins @user <amount>`")] }, true);
      gE(target.id).coins = (gE(target.id).coins || 0) + amount;
      saveData();
      return ctx.reply({ embeds: [E.ok("✅ Coins Given").addFields({ name: "👤 User", value: `<@${target.id}>`, inline: true }, { name: "🪙 Amount", value: `+${amount}`, inline: true }, { name: "💰 New Balance", value: `${gE(target.id).coins}`, inline: true }).setFooter({ text: FT })] });
    }

    // ── BACKUP ────────────────────────────────────────────────────────────────
    case "backup": {
      if (!guild) return ctx.reply({ embeds: [E.er("Server only.")] }, true);
      if (!isAdmin(member)) return ctx.reply({ embeds: [E.er("Administrator only.")] }, true);
      const sub = ctx.gsub() || ctx.ga(0) || "";
      if (sub === "create") {
        if (ctx.slash) await ctx.i.deferReply().catch(() => {});
        const bk = await createBackup(guild);
        return ctx.reply({ embeds: [E.ok("💾 Backup Created").addFields({ name: "🆔 ID", value: bk.id, inline: true }, { name: "💬 Channels", value: `${bk.channels.length}`, inline: true }, { name: "🎭 Roles", value: `${bk.roles.length}`, inline: true }).setFooter({ text: `Max 5 backups stored · ${FT}` }).setTimestamp()] });
      }
      if (sub === "list") {
        const bks = data.serverBackups[guild.id] || [];
        if (!bks.length) return ctx.reply({ embeds: [E.w("No backups found. Use `s!backup create`.")] });
        return ctx.reply({ embeds: [E.b("💾 Server Backups").setDescription(bks.map(b => `\`${b.id}\` — ${b.createdAt}`).join("\n")).setFooter({ text: FT })] });
      }
      if (sub === "view") {
        const bkId = ctx.gs("id") || ctx.ga(1);
        const bk   = (data.serverBackups[guild.id] || []).find(b => b.id === bkId);
        if (!bk) return ctx.reply({ embeds: [E.er("Backup not found.")] }, true);
        return ctx.reply({ embeds: [E.b(`💾 Backup — ${bk.id}`).addFields({ name: "🏠 Server", value: bk.name, inline: true }, { name: "📅 Created", value: bk.createdAt, inline: true }, { name: "💬 Channels", value: `${bk.channels.length}`, inline: true }, { name: "🎭 Roles", value: `${bk.roles.length}`, inline: true }).setFooter({ text: FT })] });
      }
      return ctx.reply({ embeds: [E.w("Subcommands: `create` · `list` · `view <id>`")] }, true);
    }

    default:
      return ctx.reply({ embeds: [E.w(`Unknown command: \`${cmd}\`. Try \`s!help\`.`)] }, true);
  }
}

// ── CONTEXT BUILDER ───────────────────────────────────────────────────────────
function buildCtx(isSlash, thing, channel) {
  if (isSlash) {
    const i = thing;
    return {
      slash: true, i, channel: i.channel || channel,
      guild: i.guild, member: i.member, user: i.user,
      gs:  n => i.options.getString(n),
      gi:  n => i.options.getInteger(n),
      gu:  n => i.options.getUser(n),
      gr:  n => i.options.getRole(n),
      gc:  n => i.options.getChannel(n),
      grm: _  => null,
      ga:  _  => null,
      gas: () => [],
      gsub: () => i.options.getSubcommand(false),
      reply: (p, eph) => rep(i, p, eph),
    };
  } else {
    const msg = thing;
    const parts = msg.args || [];
    return {
      slash: false, i: null, channel: msg.channel,
      guild: msg.guild, member: msg.member, user: msg.author,
      gs:  n => { const idx = ["message","prompt","question","text","reason","duration","status","type","expression","hex","thing","time","code","username","item","evidence","amount","roblox","note","name","description","messageid","emoji","color","body","title","options"].indexOf(n); return idx !== -1 ? parts[idx] || parts.join(" ") || null : parts.join(" ") || null; },
      gi:  n => { const s = msg.gs?.(n) || parts[0]; const v = parseInt(s); return isNaN(v) ? null : v; },
      gu:  _  => msg.mentions?.users?.first() || null,
      gr:  _  => msg.mentions?.roles?.first()  || null,
      gc:  _  => msg.mentions?.channels?.first() || null,
      grm: i  => msg.mentions?.roles?.first()  || null,
      ga:  i  => parts[i] || null,
      gas: () => parts,
      gsub: () => parts[0] || null,
      reply: (p, eph) => {
        if (typeof p === "string") return msg.reply(p).catch(() => {});
        return msg.reply(p).catch(() => {});
      },
    };
  }
}

// ── CLIENT EVENTS ─────────────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} is online`);
  updStat();
  setInterval(updStat, 15000);
  setInterval(checkGiveaways, 60000);
  setInterval(updateOrderBoard, 3 * 60 * 60 * 1000);
  await registerSlash();
  for (const guild of client.guilds.cache.values()) cacheInvites(guild).catch(() => {});
});

client.on("interactionCreate", async interaction => {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const ctx = buildCtx(true, interaction);
      await exec(interaction.commandName, ctx);
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Ticket buttons
      if (["ticket_order", "ticket_partner", "ticket_inquiry"].includes(id)) {
        const type = id === "ticket_order" ? "order" : id === "ticket_partner" ? "partnership" : "inquiry";

        if (type === "order") {
          const modal = new ModalBuilder().setCustomId("modal_order").setTitle("📦 Commission Order");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("username").setLabel("Roblox Username").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("service").setLabel("Service Type").setStyle(TextInputStyle.Short).setPlaceholder("e.g. UI, Datastore, Admin System").setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("description").setLabel("Project Description").setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("budget").setLabel("Budget").setStyle(TextInputStyle.Short).setPlaceholder("e.g. $20 USD or 500 Robux").setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setStyle(TextInputStyle.Short).setPlaceholder("PayPal / CashApp / Robux").setRequired(true)),
          );
          await interaction.showModal(modal);
          return;
        }

        if (type === "partnership") {
          const modal = new ModalBuilder().setCustomId("modal_partnership").setTitle("🤝 Partnership Request");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("serverName").setLabel("Server Name").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("invite").setLabel("Invite Link").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("memberCount").setLabel("Member Count").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("focus").setLabel("Server Focus / Niche").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("offering").setLabel("What You Offer Us").setStyle(TextInputStyle.Paragraph).setRequired(true)),
          );
          await interaction.showModal(modal);
          return;
        }

        if (type === "inquiry") {
          const modal = new ModalBuilder().setCustomId("modal_inquiry").setTitle("❓ Support Inquiry");
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Your Name").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("topic").setLabel("Topic / Subject").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("details").setLabel("Details").setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("urgency").setLabel("Urgency (Low / Medium / High)").setStyle(TextInputStyle.Short).setRequired(false)),
          );
          await interaction.showModal(modal);
          return;
        }
      }

      // Close ticket button
      if (id === "ticket_close_btn") {
        if (!interaction.channel?.name?.startsWith("ticket-")) return rep(interaction, { embeds: [E.w("This only works in ticket channels.")] }, true);
        const modal = new ModalBuilder().setCustomId("modal_close").setTitle("🔒 Close Ticket");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Reason for closing").setStyle(TextInputStyle.Short).setRequired(true).setValue("Resolved")));
        await interaction.showModal(modal);
        return;
      }

      // Verify start button
      if (id === "verify_start") {
        const modal = new ModalBuilder().setCustomId("modal_verify_start").setTitle("🟣 Roblox Verification");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("username").setLabel("Your Roblox Username").setStyle(TextInputStyle.Short).setRequired(true)));
        await interaction.showModal(modal);
        return;
      }
    }

    // Modals
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id === "modal_order") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const answers = { username: interaction.fields.getTextInputValue("username"), service: interaction.fields.getTextInputValue("service"), description: interaction.fields.getTextInputValue("description"), budget: interaction.fields.getTextInputValue("budget"), payment: interaction.fields.getTextInputValue("payment") };
        const { ok, channel: ch, error } = await openTicket(interaction.guild, interaction.member, "order", answers);
        if (!ok) return rep(interaction, { embeds: [E.er(error)] }, true);
        return rep(interaction, { embeds: [E.ok(`✅ Ticket opened in <#${ch.id}>!`)] }, true);
      }

      if (id === "modal_partnership") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const answers = { serverName: interaction.fields.getTextInputValue("serverName"), invite: interaction.fields.getTextInputValue("invite"), memberCount: interaction.fields.getTextInputValue("memberCount"), focus: interaction.fields.getTextInputValue("focus"), offering: interaction.fields.getTextInputValue("offering") };
        const { ok, channel: ch, error } = await openTicket(interaction.guild, interaction.member, "partnership", answers);
        if (!ok) return rep(interaction, { embeds: [E.er(error)] }, true);
        return rep(interaction, { embeds: [E.ok(`✅ Ticket opened in <#${ch.id}>!`)] }, true);
      }

      if (id === "modal_inquiry") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const answers = { name: interaction.fields.getTextInputValue("name"), topic: interaction.fields.getTextInputValue("topic"), details: interaction.fields.getTextInputValue("details"), urgency: interaction.fields.getTextInputValue("urgency") };
        const { ok, channel: ch, error } = await openTicket(interaction.guild, interaction.member, "inquiry", answers);
        if (!ok) return rep(interaction, { embeds: [E.er(error)] }, true);
        return rep(interaction, { embeds: [E.ok(`✅ Ticket opened in <#${ch.id}>!`)] }, true);
      }

      if (id === "modal_close") {
        const reason = interaction.fields.getTextInputValue("reason") || "No reason";
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        await closeTicket(interaction.channel, interaction.member, reason, interaction.guild);
        return;
      }

      if (id === "modal_verify_start") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const username = interaction.fields.getTextInputValue("username");
        const rxUser   = await fetchRxUser(username);
        if (!rxUser) return rep(interaction, { embeds: [E.er("Roblox User Not Found").setDescription(`No account found for **${username}**. Check the spelling.`)] }, true);
        const code = genCode();
        data.verificationCodes[interaction.user.id] = { robloxId: rxUser.id, robloxName: rxUser.name, code, guildId: interaction.guild?.id, at: new Date().toISOString() };
        saveData();
        return rep(interaction, { embeds: [E.rb("🟣 Step 1 Complete — Now add the code to your Roblox bio").addFields({ name: "🟣 Roblox Account", value: rxUser.name, inline: true }, { name: "🔑 Your Code", value: `\`${code}\``, inline: true }, { name: "📝 Instructions", value: `1. Go to [Roblox Settings](https://www.roblox.com/my/account) → About tab\n2. Paste this code: \`${code}\`\n3. Save, then run \`/checkverify ${code}\`` }).setFooter({ text: "Code expires in 5 minutes." }).setTimestamp()] }, true);
      }
    }
  } catch (e) {
    console.error("[Interaction]", e);
    errLog(e, "interactionCreate").catch(() => {});
    try {
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: "❌ Something went wrong. Please try again.", flags: MessageFlags.Ephemeral });
    } catch {}
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  // Scam detection (runs first, before command processing)
  await handleScamDetection(message).catch(() => {});

  // AFK — remove AFK if the user sends a message
  if (afkUsers.has(message.author.id)) {
    const afkData = afkUsers.get(message.author.id);
    afkUsers.delete(message.author.id);
    const awayFor = fmtDur(Date.now() - afkData.timestamp);
    message.reply({ embeds: [E.ok("👋 Welcome Back!").setDescription(`Your AFK status has been removed. You were away for **${awayFor}**.`).setFooter({ text: FT })] }).catch(() => {});
  }

  // AFK — notify if someone mentions an AFK user
  for (const mentioned of message.mentions.users.values()) {
    if (afkUsers.has(mentioned.id)) {
      const afkInfo = afkUsers.get(mentioned.id);
      const awayFor = fmtDur(Date.now() - afkInfo.timestamp);
      message.reply({ embeds: [E.w(`💤 ${mentioned.username} is AFK`).setDescription(`**Reason:** ${afkInfo.reason}\n**Away for:** ${awayFor}`).setFooter({ text: FT })] }).catch(() => {});
      break;
    }
  }

  // XP & coins
  grantXP(message).catch(() => {});
  grantCoins(message).catch(() => {});

  // Sticky messages
  refreshSticky(message.channel).catch(() => {});

  // Ticket AI — respond to messages in ticket channels
  if (message.channel.name?.startsWith("ticket-") && !tAIOff.has(message.channel.id) && GEMINI_KEY) {
    if (aiProcessing.has(message.channel.id)) return;
    const type = message.channel.topic?.match(/^\[(order|partnership|inquiry)\]/)?.[1];
    if (!type || type === "order") return; // Don't AI in order tickets
    aiProcessing.add(message.channel.id);
    setImmediate(async () => {
      try {
        message.channel.sendTyping().catch(() => {});
        const { text, model } = await callTicketAI(message.channel.id, message.content, type, "");
        if (text) await message.channel.send({ embeds: [aiE(text, model, message.author.username, type)] });
      } catch (e) { console.error("[TicketAI msg]", e.message); }
      finally { aiProcessing.delete(message.channel.id); }
    });
    return;
  }

  // Partnership ad follow-up
  if (pAwaitAd.has(message.channel.id) && !message.author.bot) {
    const pending = pAwaitAd.get(message.channel.id);
    if (message.author.id === pending.member.id) {
      const ad = message.content;
      pAwaitAd.delete(message.channel.id);
      setImmediate(async () => {
        try {
          if (ENV.PAD) {
            const padCh = client.guilds.cache.get(ENV.HOME)?.channels.cache.get(ENV.PAD);
            if (padCh?.isTextBased()) {
              const emb = E.ok("🤝 New Partnership Ad").setDescription(ad).addFields({ name: "🏠 Server", value: pending.answers.serverName, inline: true }, { name: "👥 Members", value: `${pending.answers.memberCount}`, inline: true }, { name: "🔗 Invite", value: pending.answers.invite, inline: true }).setFooter({ text: FT }).setTimestamp();
              await padCh.send({ embeds: [emb] });
            }
          }
          const { text, model } = await callTicketAI(message.channel.id, `The partner just sent their server ad: "${ad}". Confirm receipt and tell them staff will review the partnership and post their ad.`, "partnership", "");
          if (text) await message.channel.send({ embeds: [aiE(text, model, message.author.username, "partnership")] });
        } catch (e) { console.error("[PadAd]", e.message); }
      });
      return;
    }
  }

  // Trivia answers
  if (message.guild && data.triviaActive[message.guild.id]) {
    const ta = data.triviaActive[message.guild.id];
    if (ta.answers.some(a => message.content.toLowerCase().includes(a))) {
      delete data.triviaActive[message.guild.id];
      gE(message.author.id).coins = (gE(message.author.id).coins || 0) + ta.reward;
      saveData();
      message.reply({ embeds: [E.ok("🎉 Correct!").setDescription(`**${message.author.username}** got it right and won **${ta.reward} 🪙**!`).setFooter({ text: FT })] }).catch(() => {});
      return;
    }
  }

  // Prefix commands — supports s! and /
  const PREFIX = ["s!", "/"];
  const pfx = PREFIX.find(p => message.content.toLowerCase().startsWith(p));
  if (!pfx) return;

  const raw  = message.content.slice(pfx.length).trim();
  const args = raw.split(/\s+/);
  const cmd  = args.shift()?.toLowerCase();
  if (!cmd) return;

  message.args = args;
  const ctx = buildCtx(false, message, message.channel);
  // Override gs for prefix to be smarter
  ctx.gs = n => {
    const nameMap = { message: 0, prompt: 0, question: 0, text: 0, reason: 1, duration: 1, status: 1, type: 1, expression: 0, hex: 0, thing: 0, time: 0, code: 0, username: 0, item: 0, evidence: 1, note: 0, name: 0, description: 0, body: 1, title: 0, options: 1 };
    const idx = nameMap[n];
    if (idx === undefined) return args.join(" ") || null;
    return args[idx] || null;
  };
  ctx.gi = n => {
    const s = ctx.gs(n) || args[0];
    const v = parseInt(s);
    return isNaN(v) ? null : v;
  };

  await exec(cmd, ctx).catch(e => {
    console.error(`[CMD:${cmd}]`, e);
    message.reply({ embeds: [E.er("❌ An error occurred").setDescription("Something went wrong. Please try again or contact staff.")] }).catch(() => {});
  });
});

// Guild join/leave
client.on("guildCreate", guild => { updStat(); cacheInvites(guild).catch(() => {}); });
client.on("guildDelete", () => updStat());

// Member join — anti-raid
client.on("guildMemberAdd", async member => {
  await handleRaidJoin(member).catch(() => {});
  // Invite tracking
  try {
    const invites = await member.guild.invites.fetch();
    const cache   = data.inviteCache[member.guild.id] || {};
    const used    = invites.find(i => (cache[i.code] || 0) < (i.uses || 0));
    if (used) {
      if (!data.invites[member.guild.id]) data.invites[member.guild.id] = {};
      data.invites[member.guild.id][used.inviterId] = (data.invites[member.guild.id][used.inviterId] || 0) + 1;
      invites.forEach(i => { cache[i.code] = i.uses || 0; });
      data.inviteCache[member.guild.id] = cache;
      saveData();
    }
  } catch {}
});

// Anti-nuke audit events
client.on("guildBanAdd", async (ban) => {
  try { const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }); const e = logs.entries.first(); if (e && Date.now() - e.createdTimestamp < 5000) await checkNuke(ban.guild, e.executorId, "ban"); } catch {}
});
client.on("channelDelete", async channel => {
  if (!channel.guild) return;
  try { const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }); const e = logs.entries.first(); if (e && Date.now() - e.createdTimestamp < 5000) await checkNuke(channel.guild, e.executorId, "channelDelete"); } catch {}
});
client.on("roleDelete", async role => {
  try { const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }); const e = logs.entries.first(); if (e && Date.now() - e.createdTimestamp < 5000) await checkNuke(role.guild, e.executorId, "roleDelete"); } catch {}
});
client.on("guildMemberRemove", async member => {
  if (!member.guild) return;
  try { const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }); const e = logs.entries.first(); if (e && Date.now() - e.createdTimestamp < 5000 && e.targetId === member.id) await checkNuke(member.guild, e.executorId, "kick"); } catch {}
});

// Reaction roles
client.on("messageReactionAdd",    (r, u) => handleRR(r, u, true).catch(() => {}));
client.on("messageReactionRemove", (r, u) => handleRR(r, u, false).catch(() => {}));

// Snipe — cache deleted messages
client.on("messageDelete", msg => {
  if (msg.author?.bot || !msg.guild) return;
  if (msg.content) {
    snipeCache.set(msg.channel.id, {
      content:     msg.content,
      author:      msg.author.tag,
      authorAvatar:msg.author.displayAvatarURL(),
      timestamp:   Date.now(),
    });
  }
});

// Edit-snipe — cache edited messages
client.on("messageUpdate", (oldMsg, newMsg) => {
  if (oldMsg.author?.bot || !oldMsg.guild) return;
  if (oldMsg.content && newMsg.content && oldMsg.content !== newMsg.content) {
    editSnipeCache.set(oldMsg.channel.id, {
      before:      oldMsg.content,
      after:       newMsg.content,
      author:      oldMsg.author.tag,
      authorAvatar:oldMsg.author.displayAvatarURL(),
      timestamp:   Date.now(),
    });
  }
});

// Error handlers
process.on("unhandledRejection", e => console.error("[UnhandledRejection]", e));
process.on("uncaughtException",  e => { console.error("[UncaughtException]", e); });

// ── START ─────────────────────────────────────────────────────────────────────
client.login(TOKEN).catch(e => {
  console.error("❌ Failed to login:", e.message);
  process.exit(1);
});

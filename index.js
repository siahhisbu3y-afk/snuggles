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
const BOT_VERSION = "1.2.0";
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

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {
        nextOrderId: 1,
        nextWarnId: 1,
        orders: [],
        blacklist: [],
        warns: {},
      };
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      nextOrderId: parsed.nextOrderId || 1,
      nextWarnId: parsed.nextWarnId || 1,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      blacklist: Array.isArray(parsed.blacklist) ? parsed.blacklist : [],
      warns:
        parsed.warns && typeof parsed.warns === "object" ? parsed.warns : {},
    };
  } catch (err) {
    console.error("Failed to load data.json, starting fresh:", err);
    return {
      nextOrderId: 1,
      nextWarnId: 1,
      orders: [],
      blacklist: [],
      warns: {},
    };
  }
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
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s).`);
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
  await message.reply("pong 🧸");
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
    await message.reply(
      `Usage: \`${PREFIX}statusorder <id>\` — example: \`${PREFIX}statusorder 3\``,
    );
    return;
  }

  const order = findOrder(id);
  if (!order) {
    await message.reply(`No order found with ID \`${id}\`.`);
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
    await message.reply(
      `Usage: \`${PREFIX}script <type>\` — available types: \`${available}\``,
    );
    return;
  }

  const example = SCRIPT_EXAMPLES[type];
  if (!example) {
    await message.reply(
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
    "**Debug Request Template**\n\n" +
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
      "Copy the template below, fill it out, and post it in the help channel or your ticket. The more specific you are, the faster we can help.",
    )
    .setColor(WARN_COLOR);

  await message.channel.send({ embeds: [embed] });
  await message.channel.send(template);
}

async function handleAddOrder(message, args) {
  if (!isAdmin(message.member)) {
    await message.reply("This command is admin only.");
    return;
  }

  if (args.length < 2) {
    await message.reply(`Usage: \`${PREFIX}addorder <@user> <details>\``);
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.reply("First argument must be a user mention or user ID.");
    return;
  }

  const details = args.slice(1).join(" ").trim();
  if (!details) {
    await message.reply("Please include order details after the user.");
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
  saveData();

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
    await message.reply("This command is admin only.");
    return;
  }

  const id = args[0];
  if (!id) {
    await message.reply(`Usage: \`${PREFIX}complete <id>\``);
    return;
  }

  const order = findOrder(id);
  if (!order) {
    await message.reply(`No order found with ID \`${id}\`.`);
    return;
  }

  if (order.status === "completed") {
    await message.reply(`Order #${order.id} is already completed.`);
    return;
  }

  order.status = "completed";
  order.updatedAt = new Date().toISOString();
  saveData();

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
    await message.reply("This command is admin only.");
    return;
  }

  const text = args.join(" ").trim();
  if (!text) {
    await message.reply(`Usage: \`${PREFIX}announce <message>\``);
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

  if (message.deletable) {
    message.delete().catch(() => {});
  }
}

async function handleBlacklist(message, args) {
  if (!isAdmin(message.member)) {
    await message.reply("This command is admin only.");
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.reply(`Usage: \`${PREFIX}blacklist <@user>\``);
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
    .setColor(idx === -1 ? ERROR_COLOR : SUCCESS_COLOR);

  await message.channel.send({ embeds: [embed] });
}

async function handleBan(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.BanMembers)) {
    await message.reply("You need the **Ban Members** permission to use this.");
    return;
  }
  if (
    !message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)
  ) {
    await message.reply("I'm missing the **Ban Members** permission.");
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.reply(`Usage: \`${PREFIX}ban <@user> <reason>\``);
    return;
  }
  const reason = args.slice(1).join(" ").trim() || "No reason provided";

  if (userId === message.author.id) {
    await message.reply("You can't ban yourself.");
    return;
  }

  try {
    await message.guild.bans.create(userId, {
      reason: `By ${message.author.tag}: ${reason}`,
    });

    const embed = new EmbedBuilder()
      .setTitle("User Banned")
      .setColor(ERROR_COLOR)
      .addFields(
        { name: "User", value: `<@${userId}> (${userId})` },
        { name: "Reason", value: reason },
        { name: "Moderator", value: `${message.author.tag}` },
      )
      .setTimestamp(new Date());

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Ban failed:", err);
    await message.reply(
      "Failed to ban that user. Check my role hierarchy and permissions.",
    );
  }
}

async function handleKick(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.KickMembers)) {
    await message.reply(
      "You need the **Kick Members** permission to use this.",
    );
    return;
  }
  if (
    !message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)
  ) {
    await message.reply("I'm missing the **Kick Members** permission.");
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.reply(`Usage: \`${PREFIX}kick <@user> [reason]\``);
    return;
  }
  const reason = args.slice(1).join(" ").trim() || "No reason provided";

  if (userId === message.author.id) {
    await message.reply("You can't kick yourself.");
    return;
  }

  let target;
  try {
    target = await message.guild.members.fetch(userId);
  } catch {
    await message.reply("That user isn't in this server.");
    return;
  }

  if (!target.kickable) {
    await message.reply("I can't kick that user (role hierarchy issue).");
    return;
  }

  try {
    await target.kick(`By ${message.author.tag}: ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle("User Kicked")
      .setColor(WARN_COLOR)
      .addFields(
        { name: "User", value: `<@${userId}> (${userId})` },
        { name: "Reason", value: reason },
        { name: "Moderator", value: `${message.author.tag}` },
      )
      .setTimestamp(new Date());

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Kick failed:", err);
    await message.reply("Failed to kick that user.");
  }
}

async function handleMute(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) {
    await message.reply(
      "You need the **Timeout Members** permission to use this.",
    );
    return;
  }
  if (
    !message.guild.members.me.permissions.has(
      PermissionFlagsBits.ModerateMembers,
    )
  ) {
    await message.reply("I'm missing the **Timeout Members** permission.");
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId || !args[1]) {
    await message.reply(
      `Usage: \`${PREFIX}mute <@user> <time> [reason]\` — e.g. \`${PREFIX}mute @user 10m spamming\``,
    );
    return;
  }

  const ms = parseDuration(args[1]);
  if (!ms) {
    await message.reply(
      "Invalid duration. Use formats like `30s`, `10m`, `2h`, `1d`.",
    );
    return;
  }

  const MAX_MS = 28 * TIME_UNITS.d;
  if (ms > MAX_MS) {
    await message.reply("Maximum mute duration is 28 days.");
    return;
  }

  const reason = args.slice(2).join(" ").trim() || "No reason provided";

  let target;
  try {
    target = await message.guild.members.fetch(userId);
  } catch {
    await message.reply("That user isn't in this server.");
    return;
  }

  if (!target.moderatable) {
    await message.reply("I can't mute that user (role hierarchy issue).");
    return;
  }

  try {
    await target.timeout(ms, `By ${message.author.tag}: ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle("User Muted")
      .setColor(WARN_COLOR)
      .addFields(
        { name: "User", value: `<@${userId}> (${userId})` },
        { name: "Duration", value: formatDuration(ms), inline: true },
        { name: "Reason", value: reason, inline: true },
        { name: "Moderator", value: `${message.author.tag}` },
      )
      .setTimestamp(new Date());

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Mute failed:", err);
    await message.reply("Failed to mute that user.");
  }
}

async function handleWarn(message, args) {
  if (!hasPerm(message.member, PermissionFlagsBits.ModerateMembers)) {
    await message.reply(
      "You need the **Timeout Members** permission to issue warnings.",
    );
    return;
  }

  const userId = parseUserId(args[0]);
  if (!userId) {
    await message.reply(`Usage: \`${PREFIX}warn <@user> <reason>\``);
    return;
  }
  const reason = args.slice(1).join(" ").trim();
  if (!reason) {
    await message.reply("Please include a reason for the warning.");
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
    await message.reply(
      "You need the **Manage Server** permission to post partnerships.",
    );
    return;
  }

  if (args.length < 2) {
    await message.reply(
      `Usage: \`${PREFIX}partner <invite> <info about the server>\``,
    );
    return;
  }

  const invite = args[0];
  const info = args.slice(1).join(" ").trim();

  if (
    !/^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\//i.test(invite)
  ) {
    await message.reply(
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

  if (message.deletable) {
    message.delete().catch(() => {});
  }
}

async function handleTicket(message) {
  await openTicketForUser(message.channel, message.member, null);
}

async function handleTicketPanel(message) {
  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageChannels)
  ) {
    await message.reply(
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
  if (message.deletable) message.delete().catch(() => {});
}

async function handleClose(message) {
  const channel = message.channel;
  if (!channel.name || !channel.name.startsWith("ticket-")) {
    await message.reply("This command only works inside a ticket channel.");
    return;
  }

  await message.reply("Closing this ticket in 5 seconds...");
  setTimeout(() => {
    channel.delete(`Ticket closed by ${message.author.tag}`).catch((err) => {
      console.error("Failed to delete ticket channel:", err);
    });
  }, 5000);
}

async function handleAddNote(message, args) {
  const channel = message.channel;
  if (!channel.name || !channel.name.startsWith("ticket-")) {
    await message.reply("This command only works inside a ticket channel.");
    return;
  }

  if (
    !isAdmin(message.member) &&
    !hasPerm(message.member, PermissionFlagsBits.ManageMessages)
  ) {
    await message.reply(
      "You need to be staff (Manage Messages) to add internal notes.",
    );
    return;
  }

  const text = args.join(" ").trim();
  if (!text) {
    await message.reply(`Usage: \`${PREFIX}addnote <text>\``);
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
  if (message.deletable) message.delete().catch(() => {});
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
  partner: handlePartner,
};

const ADMIN_BYPASS = new Set(["blacklist"]);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const handler = commands[commandName];
  if (!handler) return;

  if (data.blacklist.includes(message.author.id)) {
    if (!(ADMIN_BYPASS.has(commandName) && isAdmin(message.member))) {
      try {
        await message.reply("You are blacklisted from using this bot.");
      } catch {}
      return;
    }
  }

  try {
    await handler(message, args);
  } catch (err) {
    console.error(`Error handling ${PREFIX}${commandName}:`, err);
    try {
      await message.reply("Something went wrong while running that command.");
    } catch {}
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

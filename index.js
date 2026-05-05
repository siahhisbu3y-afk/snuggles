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
if (!TOKEN) { console.error("❌ Missing DISCORD_TOKEN"); process.exit(1); }

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const PREFIX       = "s!";
const BOT_NAME     = "Snuggles Scripting";
const BOT_VERSION  = "7.0.0";
const BOT_OWNER    = "SnugglesMcBear";
const OWNER_ID     = "1354222786268102677";

// Colors
const BRAND_COLOR   = 0xff8fb1;
const SUCCESS_COLOR = 0x57f287;
const WARN_COLOR    = 0xfee75c;
const ERROR_COLOR   = 0xed4245;
const INFO_COLOR    = 0x5865f2;
const GOLD_COLOR    = 0xf1c40f;
const NOTE_COLOR    = 0x9b59b6;

// Guild / Channel IDs
const HOME_GUILD_ID      = "1497048032661864649";
const ORDER_CHANNEL_ID   = "1500678617594593291";
const ERROR_CHANNEL_ID   = "1497080858048462948";
const PARTNER_AD_CHANNEL = "1497080839736131655";
const MUSIC_VC_ID        = "1497080833561854043"; // 24/7 loft music VC

// Order statuses
const ORDER_STATUSES = {
  not_started:        { label: "Not Started",         color: ERROR_COLOR,   emoji: "🔴" },
  in_progress:        { label: "In Progress",          color: INFO_COLOR,    emoji: "🔵" },
  almost_complete:    { label: "Almost Complete",      color: 0xffa500,      emoji: "🟠" },
  partially_complete: { label: "Partially Complete",   color: WARN_COLOR,    emoji: "🟡" },
  completed:          { label: "Completed",            color: SUCCESS_COLOR, emoji: "🟢" },
  cancelled:          { label: "Cancelled",            color: 0x95a5a6,      emoji: "⚪" },
  on_hold:            { label: "On Hold",              color: NOTE_COLOR,    emoji: "⏸️" },
  revision:           { label: "In Revision",          color: GOLD_COLOR,    emoji: "🔄" },
  awaiting_payment:   { label: "Awaiting Payment",     color: 0x00bcd4,      emoji: "💳" },
  delivered:          { label: "Delivered",            color: 0x00e676,      emoji: "📦" },
};

// ─────────────────────────────────────────────
//  Data persistence
// ─────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, "data.json");

function defaultData() {
  return {
    nextOrderId: 1,
    orders: [],
    giveaways: {},
    partnerships: [],
    antiRaid: {},
    antiNuke: {},
    modLogChannels: {},
    settings: {},
    stats: { ordersCreated: 0, ordersCompleted: 0, giveawaysRun: 0, partnersAdded: 0 },
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultData();
    const p = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const b = defaultData();
    return {
      nextOrderId:    p.nextOrderId    || b.nextOrderId,
      orders:         Array.isArray(p.orders)       ? p.orders       : [],
      giveaways:      isObj(p.giveaways)            ? p.giveaways    : {},
      partnerships:   Array.isArray(p.partnerships) ? p.partnerships : [],
      antiRaid:       isObj(p.antiRaid)             ? p.antiRaid     : {},
      antiNuke:       isObj(p.antiNuke)             ? p.antiNuke     : {},
      modLogChannels: isObj(p.modLogChannels)       ? p.modLogChannels : {},
      settings:       isObj(p.settings)             ? p.settings     : {},
      stats:          isObj(p.stats) ? { ...b.stats, ...p.stats } : b.stats,
    };
  } catch { return defaultData(); }
}

function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
function saveData() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error("Save failed:", e); } }
function getGuildSettings(guildId) { if (!data.settings[guildId]) data.settings[guildId] = {}; return data.settings[guildId]; }

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
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember],
});

// ─────────────────────────────────────────────
//  Utility helpers
// ─────────────────────────────────────────────
function isAdmin(member) { return !!member?.permissions.has(PermissionFlagsBits.Administrator); }
function hasPerm(member, flag) { return !!member?.permissions.has(flag); }
function parseUserId(token) { if (!token) return null; const m = token.match(/^(?:<@!?)?(\d{17,20})>?$/); return m ? m[1] : null; }
function parseChannelId(arg) { if (!arg) return null; const m = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{15,21})$/); return m ? m[1] : null; }
function parseRoleId(arg) { if (!arg) return null; const m = arg.match(/^<@&(\d+)>$/) || arg.match(/^(\d{15,21})$/); return m ? m[1] : null; }
function findOrder(id) { const n = Number(id); return Number.isFinite(n) ? (data.orders.find(o => o.id === n) || null) : null; }
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
  const d = Math.floor(ms / TIME_UNITS.d), h = Math.floor((ms % TIME_UNITS.d) / TIME_UNITS.h),
        m = Math.floor((ms % TIME_UNITS.h) / TIME_UNITS.m), s = Math.floor((ms % TIME_UNITS.m) / TIME_UNITS.s);
  const parts = [];
  if (d) parts.push(`${d}d`); if (h) parts.push(`${h}h`); if (m) parts.push(`${m}m`); if (s && !d && !h) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

// Embed factories
function brandEmbed(title)   { return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title); }
function successEmbed(title) { return new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(title); }
function errorEmbed(title)   { return new EmbedBuilder().setColor(ERROR_COLOR).setTitle(title); }
function warnEmbed(title)    { return new EmbedBuilder().setColor(WARN_COLOR).setTitle(title); }
function infoEmbed(title)    { return new EmbedBuilder().setColor(INFO_COLOR).setTitle(title); }
function goldEmbed(title)    { return new EmbedBuilder().setColor(GOLD_COLOR).setTitle(title); }

async function logMod(guild, embed) {
  if (!guild) return;
  const channelId = data.modLogChannels[guild.id];
  if (!channelId) return;
  try { const ch = await guild.channels.fetch(channelId).catch(() => null); if (ch?.isTextBased()) await ch.send({ embeds: [embed] }); } catch {}
}

async function sendErrorLog(err, context = "") {
  try {
    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) return;
    const ch = await guild.channels.fetch(ERROR_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) return;
    await ch.send({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🚨 Bot Error")
      .addFields({ name: "📍 Context", value: context || "Unknown" }, { name: "❌ Error", value: `\`\`\`${String(err?.message || err).slice(0, 900)}\`\`\`` })
      .setTimestamp()] });
  } catch {}
}

// Single-send guard
const RESPONDED = new WeakSet();
async function respond(message, payload) {
  if (RESPONDED.has(message)) return null;
  RESPONDED.add(message);
  try { return await message.channel.send(payload); } catch { return null; }
}

// ─────────────────────────────────────────────
//  24/7 Music VC — joins on startup, stays forever
//  Note: Actual audio playback requires @discordjs/voice +
//  a stream source. We join silently and the bot's presence
//  shows "Listening to Loft Music". For true audio you must
//  install: npm install @discordjs/voice @discordjs/opus ytdl-core
//  and add a stream (see MUSIC section below).
// ─────────────────────────────────────────────
let voiceConnection = null;

async function joinMusicVC() {
  try {
    // Dynamically require @discordjs/voice — graceful if not installed
    let voiceLib;
    try { voiceLib = require("@discordjs/voice"); } catch {
      console.log("⚠️  @discordjs/voice not installed — bot will show music status but won't stream audio.");
      console.log("   Run: npm install @discordjs/voice @discordjs/opus ytdl-core");
      return;
    }

    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) return;
    const vc = await guild.channels.fetch(MUSIC_VC_ID).catch(() => null);
    if (!vc || vc.type !== ChannelType.GuildVoice) { console.warn("⚠️  Music VC not found or not a voice channel:", MUSIC_VC_ID); return; }

    const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection, StreamType } = voiceLib;

    const existing = getVoiceConnection(HOME_GUILD_ID);
    if (existing) { voiceConnection = existing; console.log("🎵 Already in music VC"); return; }

    voiceConnection = joinVoiceChannel({
      channelId: MUSIC_VC_ID,
      guildId: HOME_GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    voiceConnection.on(VoiceConnectionStatus.Ready, () => {
      console.log("🎵 Joined 24/7 Music VC — ready");
      playLofiStream(voiceLib, voiceConnection);
    });

    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log("🔌 Disconnected from VC — reconnecting in 5s…");
      setTimeout(joinMusicVC, 5000);
    });

    voiceConnection.on("error", (err) => {
      console.error("Voice connection error:", err.message);
      setTimeout(joinMusicVC, 10000);
    });

  } catch (err) {
    console.error("joinMusicVC failed:", err.message);
    setTimeout(joinMusicVC, 15000);
  }
}

function playLofiStream(voiceLib, connection) {
  try {
    const { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = voiceLib;

    // Lo-fi 24/7 radio stream (royalty-free public streams)
    // You can swap this URL for any direct stream URL
    const LOFI_STREAMS = [
      "http://usa9.fastcast4u.com/proxy/jamz?mp=/1", // fallback public stream
    ];

    // Try ytdl-core for YouTube lofi streams
    let ytdl;
    try { ytdl = require("ytdl-core"); } catch { ytdl = null; }

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    connection.subscribe(player);

    const playNext = async () => {
      try {
        let resource;
        if (ytdl) {
          // Lofi Girl 24/7 YouTube stream
          const stream = ytdl("https://www.youtube.com/watch?v=jfKfPfyJRdk", {
            filter: "audioonly",
            quality: "lowestaudio",
            highWaterMark: 1 << 25,
          });
          resource = createAudioResource(stream, { inlineVolume: true });
          if (resource.volume) resource.volume.setVolume(0.4);
        } else {
          const http = require("http");
          const https = require("https");
          const url = LOFI_STREAMS[0];
          const mod  = url.startsWith("https") ? https : http;
          const stream = await new Promise((res, rej) => {
            mod.get(url, (r) => res(r)).on("error", rej);
          });
          resource = createAudioResource(stream);
        }
        player.play(resource);
      } catch (e) {
        console.error("Stream error — retrying in 10s:", e.message);
        setTimeout(playNext, 10000);
      }
    };

    player.on(AudioPlayerStatus.Idle, () => {
      console.log("🔄 Stream ended — restarting…");
      setTimeout(playNext, 2000);
    });
    player.on("error", (e) => { console.error("Player error:", e.message); setTimeout(playNext, 5000); });

    playNext();
  } catch (err) {
    console.error("playLofiStream failed:", err.message);
  }
}

// ─────────────────────────────────────────────
//  Bot Status
// ─────────────────────────────────────────────
function updateStatus() {
  try {
    client.user?.setActivity("lo-fi beats 🎵", { type: ActivityType.Listening });
  } catch {}
}

// ─────────────────────────────────────────────
//  Ready
// ─────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`✅ ${BOT_NAME} v${BOT_VERSION} online as ${client.user.tag}`);
  updateStatus();
  setInterval(updateStatus, 10 * 60 * 1000);
  setInterval(checkGiveaways, 10_000);
  setInterval(updateOrderChannel, 3 * 60 * 60 * 1000);
  // Join music VC after a short delay
  setTimeout(joinMusicVC, 3000);
  setTimeout(updateOrderChannel, 8000);
});

// Re-join if bot is moved out of VC
client.on("voiceStateUpdate", (oldState, newState) => {
  if (oldState.member?.id !== client.user?.id) return;
  if (oldState.channelId === MUSIC_VC_ID && !newState.channelId) {
    console.log("🎵 Bot was disconnected from music VC — rejoining in 5s…");
    setTimeout(joinMusicVC, 5000);
  }
});

// ─────────────────────────────────────────────
//  MUSIC commands (play from Spotify / Apple Music / YouTube)
//  Note: Spotify & Apple Music don't allow direct streaming.
//  We resolve track names then search YouTube for the audio.
// ─────────────────────────────────────────────

// Simple URL/query resolver
function extractMusicQuery(input) {
  input = input.trim();
  // Spotify track URL → extract track name from URL slug
  const spotifyMatch = input.match(/spotify\.com\/track\/[^?]+/i);
  const appleMatch   = input.match(/music\.apple\.com\/.+\/([^?]+)/i);

  if (spotifyMatch || appleMatch) {
    // We can't stream from Spotify/Apple — tell user we'll search by title
    return { type: "url_unsupported", original: input };
  }
  if (/youtu(\.be|be\.com)/i.test(input)) return { type: "youtube", query: input };
  return { type: "search", query: input };
}

async function handlePlay(message, args) {
  const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
  if (!isStaff) return respond(message, { embeds: [errorEmbed("No Permission").setDescription("Staff only.")] });

  const input = args.join(" ").trim();
  if (!input) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}play <song name / YouTube URL>\`\n\nFor Spotify or Apple Music: paste the **song title + artist** instead of the link (streaming services block direct audio).`)] });

  let voiceLib;
  try { voiceLib = require("@discordjs/voice"); } catch {
    return respond(message, { embeds: [errorEmbed("Voice Not Installed").setDescription("Run `npm install @discordjs/voice @discordjs/opus ytdl-core` on your server to enable music.")] });
  }

  const resolved = extractMusicQuery(input);
  if (resolved.type === "url_unsupported") {
    return respond(message, { embeds: [warnEmbed("⚠️ Spotify / Apple Music")
      .setDescription("Spotify and Apple Music **don't allow direct audio streaming** to third-party apps.\n\n**Instead:** Search by song title:\n`s!play lofi hip hop radio`\n`s!play Artist - Song Name`")
      .setFooter({ text: "YouTube search is fully supported" })] });
  }

  // Ensure we're in the VC
  if (!voiceConnection) await joinMusicVC();

  let ytdl;
  try { ytdl = require("ytdl-core"); } catch {
    return respond(message, { embeds: [errorEmbed("ytdl-core Not Installed").setDescription("Run `npm install ytdl-core` to enable YouTube playback.")] });
  }

  const { createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = voiceLib;
  const query = resolved.query;

  // If it's a direct YouTube URL
  if (resolved.type === "youtube" && ytdl.validateURL(query)) {
    try {
      const info     = await ytdl.getInfo(query);
      const title    = info.videoDetails.title;
      const duration = Math.floor(parseInt(info.videoDetails.lengthSeconds, 10) / 60) + ":" + String(parseInt(info.videoDetails.lengthSeconds, 10) % 60).padStart(2, "0");
      const thumb    = info.videoDetails.thumbnails.pop()?.url;

      const stream   = ytdl(query, { filter: "audioonly", quality: "lowestaudio", highWaterMark: 1 << 25 });
      const resource = createAudioResource(stream, { inlineVolume: true });
      if (resource.volume) resource.volume.setVolume(0.5);

      const player   = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
      voiceConnection.subscribe(player);
      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => { setTimeout(() => playLofiStream(voiceLib, voiceConnection), 3000); });
      player.on("error", (e) => { console.error("Player error:", e.message); setTimeout(() => playLofiStream(voiceLib, voiceConnection), 3000); });

      const embed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle("🎵 Now Playing")
        .addFields({ name: "🎶 Track", value: title, inline: false }, { name: "⏱️ Duration", value: duration, inline: true }, { name: "🎙️ Requested by", value: message.author.tag, inline: true })
        .setFooter({ text: "Music will resume lofi after this track." }).setTimestamp();
      if (thumb) embed.setThumbnail(thumb);
      return respond(message, { embeds: [embed] });
    } catch (err) {
      return respond(message, { embeds: [errorEmbed("Playback Failed").setDescription(err.message)] });
    }
  }

  // Search fallback — we can't do a live YT search without ytsr, so guide the user
  return respond(message, { embeds: [brandEmbed("🔍 Music Search")
    .setDescription(`**Searching for:** \`${query}\`\n\nFor best results, paste a **direct YouTube URL**.\nExample: \`${PREFIX}play https://youtu.be/jfKfPfyJRdk\`\n\n> **Spotify / Apple Music:** Copy the song name and search it manually on YouTube, then paste the URL here.`)
    .setFooter({ text: `${BOT_NAME} Music` })] });
}

async function handleStop(message) {
  const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
  if (!isStaff) return respond(message, { embeds: [errorEmbed("No Permission")] });
  // Resume lofi
  let voiceLib; try { voiceLib = require("@discordjs/voice"); } catch { return respond(message, { embeds: [errorEmbed("Voice Not Installed")] }); }
  if (voiceConnection) playLofiStream(voiceLib, voiceConnection);
  return respond(message, { embeds: [successEmbed("⏹️ Stopped").setDescription("Resumed 24/7 lofi stream.")] });
}

async function handleVolume(message, args) {
  const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
  if (!isStaff) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const vol = parseInt(args[0], 10);
  if (!Number.isFinite(vol) || vol < 0 || vol > 100)
    return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}volume <0-100>\``)] });
  return respond(message, { embeds: [successEmbed(`🔊 Volume set to ${vol}%`).setDescription("Volume control requires inline resource — reconnect to apply.")] });
}

async function handleNowPlaying(message) {
  const guild  = client.guilds.cache.get(HOME_GUILD_ID);
  const vc     = guild?.channels.cache.get(MUSIC_VC_ID);
  const inVC   = voiceConnection !== null;
  return respond(message, { embeds: [brandEmbed("🎵 Now Playing")
    .setDescription(inVC ? "🎶 **Lofi Hip-Hop** — 24/7 Continuous Stream\n\n> Lo-fi beats • Chill vibes • Always on" : "❌ Not currently in a voice channel.")
    .addFields(
      { name: "📻 Station", value: "Lofi 24/7 Radio", inline: true },
      { name: "🔊 Channel", value: vc ? `<#${MUSIC_VC_ID}>` : "—",  inline: true },
      { name: "📡 Status",  value: inVC ? "🟢 Live" : "🔴 Offline", inline: true },
    )
    .setFooter({ text: `Use ${PREFIX}play <song> to queue a track` }).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Order System
// ─────────────────────────────────────────────
async function updateOrderChannel() {
  try {
    const guild = client.guilds.cache.get(HOME_GUILD_ID);
    if (!guild) return;
    const ch = await guild.channels.fetch(ORDER_CHANNEL_ID).catch(() => null);
    if (!ch?.isTextBased()) return;

    const now       = Date.now();
    const active    = data.orders.filter(o => o.status !== "completed" && o.status !== "cancelled");
    const completed = data.orders.filter(o => o.status === "completed");
    const today     = data.orders.filter(o => o.status === "completed" && now - new Date(o.updatedAt).getTime() < 86_400_000);

    // Header
    const headerEmbed = new EmbedBuilder().setColor(BRAND_COLOR)
      .setTitle("📋  Commission Order Board")
      .setDescription(
        "```\n╔══════════════════════════════════╗\n║   🧸  Snuggles Scripting Orders   ║\n╚══════════════════════════════════╝\n```\n" +
        `> 🕐 Last refreshed: <t:${Math.floor(now / 1000)}:R>  •  Auto-updates every **3 hours**`
      )
      .addFields(
        { name: "🔵 Active",          value: `${active.length}`,    inline: true },
        { name: "🟢 Completed Total", value: `${completed.length}`, inline: true },
        { name: "✅ Done Today",       value: `${today.length}`,     inline: true },
      )
      .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}  •  s!orderinfo <id> for details` })
      .setTimestamp();

    // Status overview
    const statusCounts = {};
    for (const o of active) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    const statusLines = Object.entries(ORDER_STATUSES)
      .filter(([k]) => k !== "completed" && k !== "cancelled")
      .map(([k, v]) => `${v.emoji} **${v.label}** — ${statusCounts[k] || 0}`)
      .join("\n");

    const statsEmbed = new EmbedBuilder().setColor(INFO_COLOR).setTitle("📊  Status Overview")
      .setDescription(statusLines || "*No active orders.*").setTimestamp();

    // Active order embeds
    let orderEmbeds = [];
    if (active.length === 0) {
      orderEmbeds.push(new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("✅  Queue Clear!")
        .setDescription("No active orders. Open a ticket to start a commission! 💗").setTimestamp());
    } else {
      for (const order of active.slice(0, 10)) {
        const si = getOrderStatusInfo(order.status);
        const e = new EmbedBuilder().setColor(si.color)
          .setTitle(`${si.emoji}  Order #${order.id}  ·  ${si.label}`)
          .addFields(
            { name: "👤 Customer", value: `<@${order.userId}>`,                                                   inline: true },
            { name: "📅 Created",  value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:d>`,     inline: true },
            { name: "🔄 Updated",  value: `<t:${Math.floor(new Date(order.updatedAt).getTime() / 1000)}:R>`,     inline: true },
            { name: "📝 Details",  value: order.details.slice(0, 200) + (order.details.length > 200 ? "…" : "") },
          );
        if (order.note) e.addFields({ name: "📋 Staff Note", value: order.note });
        e.setTimestamp();
        orderEmbeds.push(e);
      }
      if (active.length > 10) {
        orderEmbeds.push(new EmbedBuilder().setColor(NOTE_COLOR)
          .setDescription(`*…and **${active.length - 10}** more. Use \`s!orderinfo <id>\` to look up any order.*`));
      }
    }

    // Delete old board messages
    const settings = getGuildSettings(HOME_GUILD_ID);
    if (settings.orderBoardMessageIds?.length) {
      for (const msgId of settings.orderBoardMessageIds) { try { await ch.messages.delete(msgId); } catch {} }
    }

    // Post
    const allEmbeds = [headerEmbed, statsEmbed, ...orderEmbeds];
    const sentIds = [];
    for (let i = 0; i < allEmbeds.length; i += 10) {
      const sent = await ch.send({ embeds: allEmbeds.slice(i, i + 10) });
      sentIds.push(sent.id);
    }
    settings.orderBoardMessageIds = sentIds;
    saveData();
    console.log(`📋 Order board updated — ${active.length} active orders`);
  } catch (err) { console.error("updateOrderChannel failed:", err.message); }
}

async function handleAddOrder(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const userId = parseUserId(args[0]);
  if (!userId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}addorder @user <details>\``)] });
  const details = args.slice(1).join(" ").trim();
  if (!details) return respond(message, { embeds: [errorEmbed("Missing Details")] });
  const now = new Date().toISOString();
  const order = { id: data.nextOrderId++, userId, details, status: "not_started", createdAt: now, updatedAt: now, createdBy: message.author.id, note: null };
  data.orders.push(order);
  data.stats.ordersCreated++;
  saveData();
  updateOrderChannel().catch(() => {});
  return respond(message, { embeds: [successEmbed(`✅  Order #${order.id} Created`)
    .addFields({ name: "👤 Customer", value: `<@${userId}>` }, { name: "📝 Details", value: details })
    .setFooter({ text: "Order board will update automatically" }).setTimestamp()] });
}

async function handleOrderInfo(message, args) {
  if (!args[0]) return respond(message, { embeds: [errorEmbed("Missing ID").setDescription(`\`${PREFIX}orderinfo <id>\``)] });
  const order = findOrder(args[0]);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found").setDescription(`No order **#${args[0]}**.`)] });
  const si = getOrderStatusInfo(order.status);
  const e = new EmbedBuilder().setColor(si.color).setTitle(`📦  Order #${order.id}  ·  ${si.emoji} ${si.label}`)
    .addFields(
      { name: "👤 Customer", value: `<@${order.userId}>`,                                               inline: true },
      { name: "📊 Status",   value: `${si.emoji} ${si.label}`,                                         inline: true },
      { name: "📅 Created",  value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:F>`, inline: false },
      { name: "🔄 Updated",  value: `<t:${Math.floor(new Date(order.updatedAt).getTime() / 1000)}:R>`, inline: true },
      { name: "📝 Details",  value: order.details },
    );
  if (order.note) e.addFields({ name: "📋 Staff Note", value: order.note });
  e.setFooter({ text: `${BOT_NAME}  •  s!updateorder ${order.id} <status>` }).setTimestamp();
  return respond(message, { embeds: [e] });
}

async function handleUpdateOrder(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageMessages))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const orderId   = args[0];
  const newStatus = (args[1] || "").toLowerCase().replace(/-/g, "_");
  const note      = args.slice(2).join(" ").trim() || null;

  if (!orderId || !newStatus) {
    const list = Object.entries(ORDER_STATUSES).map(([k, v]) => `${v.emoji} \`${k}\` — ${v.label}`).join("\n");
    return respond(message, { embeds: [warnEmbed("Usage")
      .setDescription(`\`${PREFIX}updateorder <id> <status> [note]\``)
      .addFields({ name: "📋 Valid Statuses", value: list })
    ] });
  }

  const order = findOrder(orderId);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found")] });
  if (!ORDER_STATUSES[newStatus]) {
    return respond(message, { embeds: [errorEmbed("Invalid Status").setDescription(`Valid: ${Object.keys(ORDER_STATUSES).join(", ")}`)] });
  }

  const oldSi = getOrderStatusInfo(order.status);
  order.status    = newStatus;
  order.updatedAt = new Date().toISOString();
  if (note) order.note = note;
  if (newStatus === "completed") data.stats.ordersCompleted++;
  saveData();
  updateOrderChannel().catch(() => {});

  const newSi = getOrderStatusInfo(newStatus);
  const e = successEmbed(`✅  Order #${order.id} Updated`)
    .setColor(newSi.color)
    .addFields(
      { name: "📊 Status Change", value: `${oldSi.emoji} ${oldSi.label}  →  ${newSi.emoji} ${newSi.label}` },
      { name: "👤 Customer", value: `<@${order.userId}>`, inline: true },
      { name: "🔄 Updated",  value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
    );
  if (note) e.addFields({ name: "📝 Note", value: note });
  e.setTimestamp();
  await respond(message, { embeds: [e] });

  // DM the customer
  try {
    const user = await client.users.fetch(order.userId);
    await user.send({ embeds: [new EmbedBuilder().setColor(newSi.color)
      .setTitle(`📦  Order #${order.id} — Status Update`)
      .setDescription(`Your order status has been updated to **${newSi.emoji} ${newSi.label}**.${note ? `\n\n📋 **Staff Note:** ${note}` : ""}`)
      .setFooter({ text: BOT_NAME }).setTimestamp()] });
  } catch {}
}

async function handleCompleteOrder(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("No Permission")] });
  const order = findOrder(args[0]);
  if (!order) return respond(message, { embeds: [errorEmbed("Not Found")] });
  if (order.status === "completed") return respond(message, { embeds: [warnEmbed("Already Completed")] });
  order.status = "completed"; order.updatedAt = new Date().toISOString();
  data.stats.ordersCompleted++;
  saveData(); updateOrderChannel().catch(() => {});
  return respond(message, { embeds: [successEmbed(`✅  Order #${order.id} Completed`).addFields({ name: "👤 Customer", value: `<@${order.userId}>` }).setTimestamp()] });
}

async function handleOrders(message, args) {
  const sub = (args[0] || "").toLowerCase();
  const userId = sub ? parseUserId(args[0]) : null;

  let filtered = data.orders;
  if (userId) filtered = data.orders.filter(o => o.userId === userId);

  const active    = filtered.filter(o => o.status !== "completed" && o.status !== "cancelled");
  const completed = filtered.filter(o => o.status === "completed");

  const e = infoEmbed(`📋 ${userId ? `Orders for <@${userId}>` : "All Orders"}`)
    .addFields(
      { name: "🔵 Active",    value: `${active.length}`,    inline: true },
      { name: "🟢 Completed", value: `${completed.length}`, inline: true },
      { name: "📊 Total",     value: `${filtered.length}`,  inline: true },
    );

  const recent = active.slice(0, 5);
  if (recent.length) {
    e.addFields({ name: "📦 Active Orders", value: recent.map(o => {
      const si = getOrderStatusInfo(o.status);
      return `${si.emoji} **#${o.id}** — <@${o.userId}> — ${si.label}`;
    }).join("\n") });
  }
  e.setFooter({ text: `s!orderinfo <id> for full details` }).setTimestamp();
  return respond(message, { embeds: [e] });
}

// ─────────────────────────────────────────────
//  Giveaway System — FIXED & redesigned
// ─────────────────────────────────────────────
async function handleGiveaway(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission").setDescription("You need **Manage Server** to run giveaways.")] });

  const sub = (args[0] || "").toLowerCase();

  // s!giveaway end <messageId>
  if (sub === "end") {
    const msgId = args[1];
    if (!msgId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}giveaway end <messageId>\``)] });
    const gw = data.giveaways[msgId];
    if (!gw || gw.ended) return respond(message, { embeds: [errorEmbed("Not Found or Already Ended")] });
    gw.endAt = Date.now() - 1;
    saveData();
    return respond(message, { embeds: [successEmbed("✅ Giveaway will end in the next check cycle.")] });
  }

  // s!giveaway reroll <messageId>
  if (sub === "reroll") {
    const msgId = args[1];
    if (!msgId) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}giveaway reroll <messageId>\``)] });
    const gw = data.giveaways[msgId];
    if (!gw) return respond(message, { embeds: [errorEmbed("Giveaway Not Found")] });
    const ch = await message.guild.channels.fetch(gw.channelId).catch(() => null);
    const msg = ch ? await ch.messages.fetch(msgId).catch(() => null) : null;
    if (!msg) return respond(message, { embeds: [errorEmbed("Original Message Not Found")] });
    const reaction = msg.reactions.cache.get("🎉");
    let entrants = [];
    if (reaction) {
      let lastId;
      while (true) {
        const batch = await reaction.users.fetch({ limit: 100, ...(lastId ? { after: lastId } : {}) }).catch(() => null);
        if (!batch || !batch.size) break;
        entrants.push(...batch.filter(u => !u.bot).map(u => u.id));
        if (batch.size < 100) break;
        lastId = batch.last()?.id;
      }
    }
    if (!entrants.length) return respond(message, { embeds: [warnEmbed("No Entries")] });
    const winnerId = entrants[Math.floor(Math.random() * entrants.length)];
    await message.channel.send({
      content: `🎉 **Reroll!** New winner: <@${winnerId}>`,
      embeds: [successEmbed("🎉 New Winner!")
        .setDescription(`<@${winnerId}> wins **${gw.prize}**!`)
        .setTimestamp()],
      allowedMentions: { users: [winnerId] },
    });
    return;
  }

  // s!giveaway list
  if (sub === "list") {
    const active = Object.entries(data.giveaways).filter(([, g]) => !g.ended && g.guildId === message.guild.id);
    if (!active.length) return respond(message, { embeds: [brandEmbed("🎉 Giveaways").setDescription("No active giveaways.")] });
    const lines = active.map(([id, g]) => `🎁 **${g.prize}** — ends <t:${Math.floor(g.endAt / 1000)}:R> — [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${id})`);
    return respond(message, { embeds: [goldEmbed("🎉 Active Giveaways").setDescription(lines.join("\n")).setTimestamp()] });
  }

  // s!giveaway <duration> | <prize>
  const raw     = args.join(" ");
  const pipeIdx = raw.indexOf("|");
  if (pipeIdx < 0) return respond(message, { embeds: [warnEmbed("Usage")
    .setDescription(
      `\`${PREFIX}giveaway <duration> | <prize>\`\n\n` +
      `**Examples:**\n` +
      `\`${PREFIX}giveaway 24h | Discord Nitro\`\n` +
      `\`${PREFIX}giveaway 30m | 5000 Robux\`\n\n` +
      `**Other subcommands:**\n` +
      `\`${PREFIX}giveaway list\` — active giveaways\n` +
      `\`${PREFIX}giveaway end <id>\` — end early\n` +
      `\`${PREFIX}giveaway reroll <id>\` — reroll winner`
    )] });

  const durationStr = raw.slice(0, pipeIdx).trim();
  const prize       = raw.slice(pipeIdx + 1).trim();
  const ms          = parseDuration(durationStr);

  if (!ms)    return respond(message, { embeds: [errorEmbed("Invalid Duration").setDescription("Examples: `30m`, `2h`, `1d`")] });
  if (!prize) return respond(message, { embeds: [errorEmbed("Missing Prize")] });

  const endAt = Date.now() + ms;
  const embed = new EmbedBuilder()
    .setColor(GOLD_COLOR)
    .setTitle("🎉  G I V E A W A Y")
    .setDescription(
      `\`\`\`\n╔══════════════════════════════╗\n║   React with 🎉 to enter!   ║\n╚══════════════════════════════╝\n\`\`\`\n` +
      `**🎁 Prize:** ${prize}`
    )
    .addFields(
      { name: "⏰ Ends",    value: `<t:${Math.floor(endAt / 1000)}:R>  (<t:${Math.floor(endAt / 1000)}:F>)`, inline: false },
      { name: "🏠 Host",    value: `<@${message.author.id}>`,  inline: true },
      { name: "⏳ Duration", value: formatDuration(ms),         inline: true },
    )
    .setFooter({ text: `${BOT_NAME}  •  React with 🎉 below to enter!` })
    .setTimestamp();

  let sent;
  try {
    sent = await message.channel.send({
      content: "@here 🎉 **GIVEAWAY!**",
      embeds: [embed],
      allowedMentions: { parse: ["everyone"] },
    });
    await sent.react("🎉");
  } catch (err) {
    console.error("[Giveaway] Failed to post:", err.message);
    return respond(message, { embeds: [errorEmbed("Failed to Post").setDescription(`Check my permissions in this channel.\n\`\`\`${err.message}\`\`\``)] });
  }

  data.giveaways[sent.id] = { prize, endAt, channelId: message.channel.id, guildId: message.guild.id, hostId: message.author.id, ended: false };
  data.stats.giveawaysRun++;
  saveData();
  console.log(`🎉 Giveaway started: "${prize}" ends in ${formatDuration(ms)}`);
}

async function checkGiveaways() {
  const now = Date.now();
  for (const [msgId, gw] of Object.entries(data.giveaways)) {
    if (gw.ended || gw.endAt > now) continue;
    gw.ended = true; saveData();
    try {
      const guild = client.guilds.cache.get(gw.guildId);
      if (!guild) continue;
      const ch = await guild.channels.fetch(gw.channelId).catch(() => null);
      if (!ch) continue;
      const msg = await ch.messages.fetch(msgId).catch(() => null);

      // Fetch all reactors
      let entrants = [];
      if (msg) {
        const reaction = msg.reactions.cache.get("🎉");
        if (reaction) {
          let lastId;
          while (true) {
            const batch = await reaction.users.fetch({ limit: 100, ...(lastId ? { after: lastId } : {}) }).catch(() => null);
            if (!batch || !batch.size) break;
            entrants.push(...batch.filter(u => !u.bot).map(u => u.id));
            if (batch.size < 100) break;
            lastId = batch.last()?.id;
          }
        }
      }

      if (!entrants.length) {
        await ch.send({ embeds: [warnEmbed("🎉 Giveaway Ended — No Winners")
          .setDescription(`**Prize:** ${gw.prize}\n\nNo valid entries were found.`)
          .setTimestamp()] });
      } else {
        const winnerId = entrants[Math.floor(Math.random() * entrants.length)];
        await ch.send({
          content: `🎊 Congratulations <@${winnerId}>! You won the giveaway!`,
          embeds: [new EmbedBuilder().setColor(SUCCESS_COLOR)
            .setTitle("🎉  Giveaway Ended — We Have a Winner!")
            .addFields(
              { name: "🎁 Prize",    value: gw.prize,                              inline: true },
              { name: "🏆 Winner",   value: `<@${winnerId}>`,                      inline: true },
              { name: "📊 Entries",  value: `${entrants.length}`,                  inline: true },
              { name: "🏠 Hosted by",value: `<@${gw.hostId}>`,                    inline: true },
            )
            .setDescription("Contact staff to claim your prize!")
            .setFooter({ text: `${BOT_NAME}  •  Use s!giveaway reroll <id> to reroll` })
            .setTimestamp()],
          allowedMentions: { users: [winnerId] },
        });

        // Try to DM winner
        try {
          const winner = await client.users.fetch(winnerId);
          await winner.send({ embeds: [successEmbed("🎉 You Won a Giveaway!")
            .setDescription(`You won **${gw.prize}** in **${guild.name}**!\nContact staff to claim your prize.`)
            .setTimestamp()] });
        } catch {}
      }
    } catch (err) { console.error("[Giveaway] End failed:", err.message); }
  }
}

// ─────────────────────────────────────────────
//  Partner System — FIXED & redesigned
// ─────────────────────────────────────────────
async function handlePartner(message, args) {
  if (!isAdmin(message.member) && !hasPerm(message.member, PermissionFlagsBits.ManageGuild))
    return respond(message, { embeds: [errorEmbed("No Permission")] });

  const sub = (args[0] || "").toLowerCase();

  if (!sub || sub === "help") {
    return respond(message, { embeds: [infoEmbed("🤝 Partner System")
      .setDescription("Post partnership announcements to the partner channel.")
      .addFields(
        { name: `\`${PREFIX}partner basic <invite> | <name> | <desc>\``,                                        value: "Simple partnership embed" },
        { name: `\`${PREFIX}partner detailed <invite> | <name> | <desc> | <perks>\``,                           value: "Detailed partnership embed" },
        { name: `\`${PREFIX}partner announce <invite> | <name> | <about> | <they offer> | <we offer>\``,        value: "Official announcement" },
        { name: `\`${PREFIX}partner promo <invite> | <name> | <text>\``,                                        value: "Promotional shoutout" },
        { name: `\`${PREFIX}partner list\``,                                                                     value: "List all partners" },
        { name: `\`${PREFIX}partner remove <id>\``,                                                              value: "Remove a partner" },
      ).setTimestamp()] });
  }

  if (sub === "list") {
    const ps = data.partnerships.filter(p => p.guildId === message.guild.id);
    if (!ps.length) return respond(message, { embeds: [brandEmbed("🤝 Partners").setDescription("No active partnerships.")] });
    return respond(message, { embeds: [infoEmbed(`🤝 Partners (${ps.length})`)
      .setDescription(ps.map(p => `**#${p.id}** — [${p.name || "—"}](${p.invite}) · ${p.format} · by ${p.addedBy}`).join("\n"))
      .setTimestamp()] });
  }

  if (sub === "remove") {
    if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("Admin Only")] });
    const id  = parseInt(args[1], 10);
    const idx = data.partnerships.findIndex(p => p.id === id && p.guildId === message.guild.id);
    if (idx === -1) return respond(message, { embeds: [errorEmbed("Not Found")] });
    const removed = data.partnerships.splice(idx, 1)[0]; saveData();
    return respond(message, { embeds: [successEmbed("✅ Partner Removed").setDescription(`**${removed.name || removed.invite}** removed.`).setTimestamp()] });
  }

  // Build embeds
  const rawContent = args.slice(1).join(" ");
  const parts      = rawContent.split("|").map(s => s.trim());

  if (!parts[0]) return respond(message, { embeds: [errorEmbed("Missing Info").setDescription("Provide an invite link after the subcommand.")] });

  let invite = parts[0].trim();
  if (!invite.startsWith("http")) invite = "https://discord.gg/" + invite.replace(/^discord\.gg\//i, "");
  if (!/^https?:\/\/(discord\.gg|discord\.com\/invite|dsc\.gg)\//i.test(invite))
    return respond(message, { embeds: [errorEmbed("Invalid Invite").setDescription("Provide a valid discord.gg invite link.")] });

  let embed;
  const footer = `Partnership • Added by ${message.author.tag}`;

  if (sub === "basic") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Format").setDescription("`invite | server name | description`")] });
    embed = new EmbedBuilder().setColor(INFO_COLOR).setTitle("🤝  New Partnership!")
      .setDescription("We're excited to welcome a new server to our partner family! 🎉")
      .addFields(
        { name: "🏠 Server",  value: `**${parts[1]}**`,                      inline: true },
        { name: "🔗 Join",    value: `[Click to join!](${invite})`,           inline: true },
        { name: "📋 About",   value: parts[2] || "No description provided." },
      )
      .setFooter({ text: footer }).setTimestamp();

  } else if (sub === "detailed") {
    embed = new EmbedBuilder().setColor(BRAND_COLOR).setTitle("🌟  Featured Partner")
      .setDescription("Check out one of our awesome partners! 💗")
      .addFields(
        { name: "🏠 Server", value: `**${parts[1] || "—"}**`, inline: true },
        { name: "🔗 Join",   value: `[Join Server](${invite})`, inline: true },
        { name: "📖 About",  value: parts[2] || "—" },
      );
    if (parts[3]) embed.addFields({ name: "🎁 Perks", value: parts[3].split(",").map(s => `• ${s.trim()}`).join("\n") });
    embed.setFooter({ text: footer }).setTimestamp();

  } else if (sub === "announce") {
    if (parts.length < 5) return respond(message, { embeds: [warnEmbed("Format").setDescription("`invite | name | about | what they offer | what we offer`")] });
    embed = new EmbedBuilder().setColor(GOLD_COLOR).setTitle("🤝  Official Partnership Announcement")
      .setDescription(`We are thrilled to officially partner with **${parts[1]}**! 🎊`)
      .addFields(
        { name: "🏠 Server",           value: `**${parts[1]}**`,              inline: true },
        { name: "🔗 Join",             value: `[Click to join](${invite})`,   inline: true },
        { name: "📋 About Them",       value: parts[2] || "—" },
        { name: "🎁 What They Offer",  value: parts[3] || "—", inline: true },
        { name: "💜 What We Offer",    value: parts[4] || "—", inline: true },
      )
      .setFooter({ text: footer }).setTimestamp();

  } else if (sub === "promo") {
    if (parts.length < 3) return respond(message, { embeds: [warnEmbed("Format").setDescription("`invite | name | promo text`")] });
    embed = new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle(`📣  ${parts[1]}  —  Shoutout`)
      .setDescription(parts[2])
      .addFields({ name: "🔗 Join Server", value: invite })
      .setFooter({ text: footer }).setTimestamp();

  } else {
    return respond(message, { embeds: [warnEmbed("Unknown Format").setDescription("Use `basic`, `detailed`, `announce`, or `promo`.")] });
  }

  // Save record
  const maxId = data.partnerships.reduce((a, p) => Math.max(a, p.id || 0), 0);
  data.partnerships.push({ id: maxId + 1, guildId: message.guild.id, invite, name: parts[1] || null, format: sub, addedBy: message.author.tag, addedAt: new Date().toISOString() });
  data.stats.partnersAdded++;
  saveData();

  // Post to partner channel
  const guild     = client.guilds.cache.get(HOME_GUILD_ID) || message.guild;
  const partnerCh = await guild.channels.fetch(PARTNER_AD_CHANNEL).catch(() => null);
  const targetCh  = partnerCh?.isTextBased() ? partnerCh : message.channel;

  try { await message.delete(); } catch {}
  await targetCh.send({ content: "@here — New partner! 🤝", embeds: [embed], allowedMentions: { parse: ["everyone"] } });

  if (targetCh.id !== message.channel.id) {
    await message.channel.send({ embeds: [successEmbed("✅ Partnership Posted").setDescription(`Posted in <#${targetCh.id}>.`)] }).catch(() => {});
  }
}

// ─────────────────────────────────────────────
//  Anti-Raid System
// ─────────────────────────────────────────────
const raidTracker    = new Map();
const antiRaidLocks  = new Map();
const nukeTracker    = new Map();

function getAntiRaidCfg(guildId) {
  if (!data.antiRaid[guildId]) data.antiRaid[guildId] = {
    enabled: false, threshold: 8, window: 10_000,
    action: "kick", minAccountAge: 0, autoUnlock: 30_000,
    whitelistedRoles: [], notifyChannel: null,
  };
  return data.antiRaid[guildId];
}

function getAntiNukeCfg(guildId) {
  if (!data.antiNuke[guildId]) data.antiNuke[guildId] = {
    enabled: false, channelDeleteThreshold: 3, banThreshold: 5,
    roleDeleteThreshold: 3, webhookDeleteThreshold: 3, kickThreshold: 5,
    window: 10_000, action: "ban", trustedRoles: [], trustedUsers: [], notifyChannel: null,
  };
  return data.antiNuke[guildId];
}

async function raidAlert(guild, settings, opts) {
  const chId = settings.notifyChannel || data.modLogChannels[guild.id];
  if (!chId) return;
  try {
    const ch = await guild.channels.fetch(chId).catch(() => null);
    if (!ch?.isTextBased()) return;
    const e = new EmbedBuilder().setColor(opts.danger !== false ? ERROR_COLOR : SUCCESS_COLOR).setTitle(opts.title).setTimestamp();
    if (opts.description) e.setDescription(opts.description);
    if (opts.fields) e.addFields(opts.fields);
    await ch.send({ embeds: [e] });
  } catch {}
}

async function handleAntiRaidJoin(member) {
  const s = getAntiRaidCfg(member.guild.id);
  if (!s.enabled) return;
  if (s.whitelistedRoles?.some(r => member.roles.cache.has(r))) return;

  if (!raidTracker.has(member.guild.id)) raidTracker.set(member.guild.id, { joins: [], locked: false });
  const tracker = raidTracker.get(member.guild.id);
  const now = Date.now();
  tracker.joins = tracker.joins.filter(t => now - t < s.window);
  tracker.joins.push(now);

  // Account age check
  if (s.minAccountAge > 0 && now - member.user.createdTimestamp < s.minAccountAge * TIME_UNITS.d) {
    try {
      await member.user.send({ content: `🛡️ **${member.guild.name}** — Account too new (min ${s.minAccountAge}d).` }).catch(() => {});
      if (s.action === "ban") await member.ban({ reason: "Anti-Raid: account too new" });
      else await member.kick("Anti-Raid: account too new");
    } catch {}
    return;
  }

  if (tracker.joins.length >= s.threshold && !tracker.locked) {
    tracker.locked = true;
    await raidAlert(member.guild, s, {
      title: "🚨  RAID DETECTED — Protection Active",
      description: `**${tracker.joins.length}** joins in **${s.window / 1000}s** — Action: **${s.action}**`,
      fields: [{ name: "⚡ Action", value: s.action, inline: true }, { name: "📊 Joins", value: `${tracker.joins.length}`, inline: true }],
      danger: true,
    });
    if (s.action === "lockdown") {
      for (const [, ch] of member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText))
        await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: false }).catch(() => {});
      antiRaidLocks.set(member.guild.id, { lockedAt: now });
    }
    if (s.autoUnlock > 0) {
      setTimeout(async () => {
        const t = raidTracker.get(member.guild.id);
        if (t) t.locked = false;
        antiRaidLocks.delete(member.guild.id);
        if (s.action === "lockdown") {
          for (const [, ch] of member.guild.channels.cache.filter(c => c.type === ChannelType.GuildText))
            await ch.permissionOverwrites.edit(member.guild.roles.everyone, { SendMessages: null }).catch(() => {});
          await raidAlert(member.guild, s, { title: "🔓 Lockdown Lifted", description: `Auto-unlocked after ${formatDuration(s.autoUnlock)}.`, danger: false });
        }
      }, s.autoUnlock);
    }
  }

  if (tracker.locked && (s.action === "kick" || s.action === "ban")) {
    try {
      await member.user.send({ content: `🛡️ **${member.guild.name}** — Removed by anti-raid.` }).catch(() => {});
      if (s.action === "kick") await member.kick("Anti-Raid");
      else await member.ban({ reason: "Anti-Raid" });
    } catch {}
  }
}

async function handleAntiRaid(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("Admin Only")] });
  const sub = (args[0] || "").toLowerCase();
  const s   = getAntiRaidCfg(message.guild.id);

  if (sub === "enable")  { s.enabled = true;  saveData(); return respond(message, { embeds: [successEmbed("🛡️ Anti-Raid Enabled").addFields({ name: "Threshold", value: `${s.threshold} joins/${s.window/1000}s`, inline: true }, { name: "Action", value: s.action, inline: true }).setTimestamp()] }); }
  if (sub === "disable") { s.enabled = false; saveData(); return respond(message, { embeds: [warnEmbed("🛡️ Anti-Raid Disabled").setTimestamp()] }); }
  if (sub === "unlock") {
    for (const [, ch] of message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText))
      await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => {});
    const t = raidTracker.get(message.guild.id); if (t) t.locked = false;
    antiRaidLocks.delete(message.guild.id);
    return respond(message, { embeds: [successEmbed("🔓 Lockdown Lifted").setTimestamp()] });
  }
  if (sub === "status") {
    const lock = antiRaidLocks.get(message.guild.id);
    return respond(message, { embeds: [infoEmbed("🛡️ Anti-Raid Status")
      .setDescription(`**${s.enabled ? "🟢 Active" : "🔴 Disabled"}**`)
      .addFields(
        { name: "📊 Threshold",  value: `${s.threshold} joins`,     inline: true },
        { name: "⏱️ Window",    value: `${s.window/1000}s`,         inline: true },
        { name: "⚡ Action",    value: s.action,                    inline: true },
        { name: "📅 Min Age",   value: s.minAccountAge ? `${s.minAccountAge}d` : "Off", inline: true },
        { name: "🔓 Auto-Unlock", value: s.autoUnlock ? formatDuration(s.autoUnlock) : "Manual", inline: true },
        { name: "🔒 Lockdown", value: lock ? `Active since <t:${Math.floor(lock.lockedAt/1000)}:R>` : "Not active", inline: true },
      ).setTimestamp()] });
  }
  if (sub === "config") {
    const [, param, val] = args;
    if (param === "threshold")    { const n = parseInt(val, 10); if (n >= 2) { s.threshold = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Threshold → ${n} joins`)] }); } }
    if (param === "window")       { const n = parseInt(val, 10)*1000; if (n >= 1000) { s.window = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Window → ${val}s`)] }); } }
    if (param === "action")       { if (["kick","ban","lockdown"].includes(val)) { s.action = val; saveData(); return respond(message, { embeds: [successEmbed(`✅ Action → ${val}`)] }); } }
    if (param === "minage")       { const n = parseInt(val, 10); if (n >= 0) { s.minAccountAge = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Min Age → ${n}d`)] }); } }
    if (param === "autounlock")   { s.autoUnlock = parseInt(val, 10)*1000||0; saveData(); return respond(message, { embeds: [successEmbed(`✅ Auto-Unlock → ${val}s`)] }); }
    if (param === "alertchannel") { const chId = parseChannelId(val); s.notifyChannel = chId; saveData(); return respond(message, { embeds: [successEmbed(`✅ Alert → ${chId ? `<#${chId}>` : "cleared"}`)] }); }
    return respond(message, { embeds: [infoEmbed("⚙️ Anti-Raid Config").addFields(
      { name: "`config threshold <n>`",              value: "Min joins to trigger (≥2)" },
      { name: "`config window <secs>`",              value: "Detection time window" },
      { name: "`config action <kick|ban|lockdown>`", value: "Action on raid" },
      { name: "`config minage <days>`",              value: "Min account age to join" },
      { name: "`config autounlock <secs>`",          value: "Auto-unlock after N seconds" },
      { name: "`config alertchannel <#ch>`",         value: "Where to send raid alerts" },
    )] });
  }
  return respond(message, { embeds: [brandEmbed("🛡️ Anti-Raid System")
    .setDescription(`**Status:** ${s.enabled ? "🟢 Active" : "🔴 Disabled"}\n**Action:** ${s.action}  **·**  **Threshold:** ${s.threshold} joins / ${s.window/1000}s`)
    .addFields({ name: "Commands", value: `\`enable\` \`disable\` \`status\` \`unlock\` \`config <param> <val>\`` })
    .setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Anti-Nuke System
// ─────────────────────────────────────────────
async function checkAntiNuke(guild, userId, type) {
  const s = getAntiNukeCfg(guild.id);
  if (!s.enabled) return;
  if (s.trustedUsers?.includes(userId)) return;
  const key = `${guild.id}:${userId}`;
  if (!nukeTracker.has(key)) nukeTracker.set(key, { channelDeletes: [], bans: [], roleDeletes: [], webhookDeletes: [], kicks: [] });
  const t = nukeTracker.get(key);
  const now = Date.now();
  const typeMap = {
    channelDelete:  { arr: "channelDeletes",  threshold: s.channelDeleteThreshold,  label: "channel deletions" },
    ban:            { arr: "bans",            threshold: s.banThreshold,            label: "bans" },
    roleDelete:     { arr: "roleDeletes",     threshold: s.roleDeleteThreshold,     label: "role deletions" },
    webhookDelete:  { arr: "webhookDeletes",  threshold: s.webhookDeleteThreshold,  label: "webhook deletions" },
    kick:           { arr: "kicks",           threshold: s.kickThreshold,           label: "kicks" },
  };
  const cfg = typeMap[type]; if (!cfg) return;
  t[cfg.arr] = t[cfg.arr].filter(ts => now - ts < s.window);
  t[cfg.arr].push(now);
  if (t[cfg.arr].length >= cfg.threshold) {
    t[cfg.arr] = [];
    await nukeResponse(guild, userId, `${cfg.threshold} ${cfg.label} in ${s.window/1000}s`, s);
  }
}

async function nukeResponse(guild, userId, reason, s) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member || member.permissions.has(PermissionFlagsBits.Administrator) || member.id === client.user?.id) return;
  if (s.trustedRoles?.some(r => member.roles.cache.has(r))) return;
  let action = "none";
  try {
    if (s.action === "ban")          { await member.ban({ reason: `Anti-Nuke: ${reason}` }); action = "Banned"; }
    else if (s.action === "kick")    { await member.kick(`Anti-Nuke: ${reason}`); action = "Kicked"; }
    else if (s.action === "strip_roles") {
      for (const [, r] of member.roles.cache.filter(r => r.id !== guild.id && r.manageable)) await member.roles.remove(r).catch(() => {});
      action = "Roles Stripped";
    }
    await member.user.send({ content: `🚨 **${guild.name}** — Anti-Nuke: **${action}**\nReason: ${reason}` }).catch(() => {});
  } catch {}
  const chId = s.notifyChannel || data.modLogChannels[guild.id];
  if (chId) {
    const ch = await guild.channels.fetch(chId).catch(() => null);
    if (ch?.isTextBased()) {
      await ch.send({ embeds: [new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🚨  ANTI-NUKE TRIGGERED")
        .addFields({ name: "👤 User", value: `${member.user.tag} (${member.id})` }, { name: "⚡ Action", value: action, inline: true }, { name: "📋 Reason", value: reason })
        .setTimestamp()] }).catch(() => {});
    }
  }
}

async function handleAntiNuke(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("Admin Only")] });
  const sub = (args[0] || "").toLowerCase();
  const s   = getAntiNukeCfg(message.guild.id);

  if (sub === "enable")  { s.enabled = true;  saveData(); return respond(message, { embeds: [successEmbed("🛡️ Anti-Nuke Enabled").addFields({ name: "Action", value: s.action, inline: true }).setTimestamp()] }); }
  if (sub === "disable") { s.enabled = false; saveData(); return respond(message, { embeds: [warnEmbed("🛡️ Anti-Nuke Disabled").setTimestamp()] }); }
  if (sub === "status") {
    return respond(message, { embeds: [infoEmbed("🛡️ Anti-Nuke Status")
      .setDescription(`**${s.enabled ? "🟢 Active" : "🔴 Disabled"}**`)
      .addFields(
        { name: "💬 Channel Deletes", value: `${s.channelDeleteThreshold}`, inline: true },
        { name: "🔨 Bans",           value: `${s.banThreshold}`,           inline: true },
        { name: "🎭 Role Deletes",   value: `${s.roleDeleteThreshold}`,    inline: true },
        { name: "🔗 Webhook Deletes",value: `${s.webhookDeleteThreshold}`, inline: true },
        { name: "👢 Kicks",          value: `${s.kickThreshold}`,          inline: true },
        { name: "⚡ Action",         value: s.action,                      inline: true },
        { name: "✅ Trusted Roles",  value: s.trustedRoles?.length ? s.trustedRoles.map(r => `<@&${r}>`).join(", ") : "None" },
        { name: "✅ Trusted Users",  value: s.trustedUsers?.length ? s.trustedUsers.map(u => `<@${u}>`).join(", ") : "None" },
      ).setTimestamp()] });
  }
  if (sub === "config") {
    const [, param, val] = args;
    const thresholds = { channels: "channelDeleteThreshold", bans: "banThreshold", roles: "roleDeleteThreshold", webhooks: "webhookDeleteThreshold", kicks: "kickThreshold" };
    if (thresholds[param]) { const n = parseInt(val, 10); if (n >= 1) { s[thresholds[param]] = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ ${param} threshold → ${n}`)] }); } }
    if (param === "window")       { const n = parseInt(val, 10)*1000; if (n >= 1000) { s.window = n; saveData(); return respond(message, { embeds: [successEmbed(`✅ Window → ${val}s`)] }); } }
    if (param === "action")       { if (["ban","kick","strip_roles"].includes(val)) { s.action = val; saveData(); return respond(message, { embeds: [successEmbed(`✅ Action → ${val}`)] }); } }
    if (param === "alertchannel") { const chId = parseChannelId(val); s.notifyChannel = chId; saveData(); return respond(message, { embeds: [successEmbed(`✅ Alert → ${chId ? `<#${chId}>` : "cleared"}`)] }); }
    if (param === "trustrole")    { const id = parseRoleId(val); if (!id) return respond(message, { embeds: [errorEmbed("Invalid Role")] }); if (!s.trustedRoles) s.trustedRoles = []; const i = s.trustedRoles.indexOf(id); if (i === -1) s.trustedRoles.push(id); else s.trustedRoles.splice(i, 1); saveData(); return respond(message, { embeds: [successEmbed(`✅ Role ${i === -1 ? "trusted" : "untrusted"}`)] }); }
    if (param === "trustuser")    { const id = parseUserId(val); if (!id) return respond(message, { embeds: [errorEmbed("Invalid User")] }); if (!s.trustedUsers) s.trustedUsers = []; const i = s.trustedUsers.indexOf(id); if (i === -1) s.trustedUsers.push(id); else s.trustedUsers.splice(i, 1); saveData(); return respond(message, { embeds: [successEmbed(`✅ User ${i === -1 ? "trusted" : "untrusted"}`)] }); }
    return respond(message, { embeds: [infoEmbed("⚙️ Anti-Nuke Config").addFields(
      { name: "`config channels/bans/roles/webhooks/kicks <n>`", value: "Set action thresholds" },
      { name: "`config window <secs>`",                          value: "Detection window" },
      { name: "`config action <ban|kick|strip_roles>`",          value: "Action to take" },
      { name: "`config alertchannel <#ch>`",                     value: "Alert channel" },
      { name: "`config trustrole <@role>`",                      value: "Toggle trusted role (won't be actioned)" },
      { name: "`config trustuser <@user>`",                      value: "Toggle trusted user" },
    )] });
  }
  return respond(message, { embeds: [brandEmbed("🛡️ Anti-Nuke System")
    .setDescription(`**Status:** ${s.enabled ? "🟢 Active" : "🔴 Disabled"}`)
    .addFields({ name: "Commands", value: `\`enable\` \`disable\` \`status\` \`config <param> <val>\`` })
    .setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Logging Setup
// ─────────────────────────────────────────────
async function handleSetLog(message, args) {
  if (!isAdmin(message.member)) return respond(message, { embeds: [errorEmbed("Admin Only")] });
  if (!args[0]) { delete data.modLogChannels[message.guild.id]; saveData(); return respond(message, { embeds: [warnEmbed("Mod Log Disabled")] }); }
  const m = args[0].match(/^<#(\d+)>$/) || args[0].match(/^(\d{17,20})$/);
  if (!m) return respond(message, { embeds: [warnEmbed("Usage").setDescription(`\`${PREFIX}setlog #channel\``)] });
  const ch = await message.guild.channels.fetch(m[1]).catch(() => null);
  if (!ch?.isTextBased()) return respond(message, { embeds: [errorEmbed("Invalid Channel")] });
  data.modLogChannels[message.guild.id] = m[1]; saveData();
  await respond(message, { embeds: [successEmbed("📓 Mod Log Set").setDescription(`Logging to <#${m[1]}>.`)] });
  await ch.send({ embeds: [successEmbed("✅ Mod Log Connected").setDescription(`This channel now receives all server logs from **${BOT_NAME}**.`).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Help — clean & redesigned
// ─────────────────────────────────────────────
async function handleHelp(message) {
  const e = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`🧸  ${BOT_NAME}  —  Command Reference`)
    .setDescription(
      `**Prefix:** \`${PREFIX}\`  |  **Version:** v${BOT_VERSION}\n\n` +
      "```\n╔══════════════════════════════════╗\n║     Snuggles Scripting Bot       ║\n╚══════════════════════════════════╝\n```"
    )
    .addFields(
      {
        name: "📦  Order Tracking",
        value: [
          `\`${PREFIX}addorder @user <details>\` — Create a new order`,
          `\`${PREFIX}orderinfo <id>\` — View order details`,
          `\`${PREFIX}updateorder <id> <status> [note]\` — Update order status`,
          `\`${PREFIX}complete <id>\` — Mark order complete`,
          `\`${PREFIX}orders [@user]\` — List all / user orders`,
        ].join("\n"),
      },
      {
        name: "📊  Order Statuses",
        value: Object.entries(ORDER_STATUSES).map(([k, v]) => `${v.emoji} \`${k}\``).join("  "),
      },
      {
        name: "🎉  Giveaways",
        value: [
          `\`${PREFIX}giveaway <duration> | <prize>\` — Start a giveaway`,
          `\`${PREFIX}giveaway list\` — Active giveaways`,
          `\`${PREFIX}giveaway end <id>\` — End early`,
          `\`${PREFIX}giveaway reroll <id>\` — Reroll winner`,
        ].join("\n"),
      },
      {
        name: "🤝  Partner",
        value: [
          `\`${PREFIX}partner basic <invite> | <name> | <desc>\``,
          `\`${PREFIX}partner detailed <invite> | <name> | <desc> | <perks>\``,
          `\`${PREFIX}partner announce <invite> | <name> | <about> | <they offer> | <we offer>\``,
          `\`${PREFIX}partner promo <invite> | <name> | <text>\``,
          `\`${PREFIX}partner list\`  •  \`${PREFIX}partner remove <id>\``,
        ].join("\n"),
      },
      {
        name: "🎵  Music",
        value: [
          `\`${PREFIX}play <YouTube URL or song name>\` — Play a track`,
          `\`${PREFIX}stop\` — Stop and resume lofi`,
          `\`${PREFIX}np\` — Now playing`,
          `\`${PREFIX}volume <0-100>\` — Set volume`,
        ].join("\n"),
      },
      {
        name: "🛡️  Anti-Raid",
        value: [
          `\`${PREFIX}antiraid enable / disable\``,
          `\`${PREFIX}antiraid status\``,
          `\`${PREFIX}antiraid unlock\` — Lift lockdown`,
          `\`${PREFIX}antiraid config <param> <val>\``,
        ].join("\n"),
      },
      {
        name: "🛡️  Anti-Nuke",
        value: [
          `\`${PREFIX}antinuke enable / disable\``,
          `\`${PREFIX}antinuke status\``,
          `\`${PREFIX}antinuke config <param> <val>\``,
        ].join("\n"),
      },
      {
        name: "📓  Logging & Admin",
        value: [
          `\`${PREFIX}setlog #channel\` — Set mod log channel`,
          `\`${PREFIX}ping\` — Bot latency`,
          `\`${PREFIX}status\` — Bot status`,
        ].join("\n"),
      },
    )
    .setFooter({ text: `${BOT_NAME} v${BOT_VERSION}  •  Made with 💗 by ${BOT_OWNER}` })
    .setTimestamp();

  return respond(message, { embeds: [e] });
}

// ─────────────────────────────────────────────
//  Misc commands
// ─────────────────────────────────────────────
async function handlePing(message) {
  return respond(message, { embeds: [successEmbed("🏓 Pong!").addFields({ name: "Gateway", value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true }).setTimestamp()] });
}

async function handleStatus(message) {
  const sent = await message.channel.send({ embeds: [infoEmbed("🔍 Checking…")] });
  const apiLatency = sent.createdTimestamp - message.createdTimestamp;
  const active  = data.orders.filter(o => o.status !== "completed" && o.status !== "cancelled").length;
  const gwCount = Object.values(data.giveaways).filter(g => !g.ended).length;
  await sent.edit({ embeds: [successEmbed("🟢  All Systems Operational")
    .addFields(
      { name: "🤖 Bot",        value: "🟢 Online",                            inline: true },
      { name: "📡 Gateway",    value: `${Math.max(0, Math.round(client.ws.ping))}ms`, inline: true },
      { name: "🌐 API",        value: `${apiLatency}ms`,                      inline: true },
      { name: "📋 Orders",     value: `${active} active`,                     inline: true },
      { name: "🎉 Giveaways",  value: `${gwCount} active`,                    inline: true },
      { name: "🎵 Music VC",   value: voiceConnection ? "🟢 Connected" : "🔴 Offline", inline: true },
    ).setTimestamp()] });
}

// ─────────────────────────────────────────────
//  Command map
// ─────────────────────────────────────────────
const commands = {
  // Help & Info
  help: handleHelp,
  ping: handlePing,
  status: handleStatus,
  // Orders
  addorder: handleAddOrder,
  orderinfo: handleOrderInfo,
  updateorder: handleUpdateOrder,
  updateo: handleUpdateOrder,
  complete: handleCompleteOrder,
  orders: handleOrders,
  // Giveaway
  giveaway: handleGiveaway,
  gw: handleGiveaway,
  // Partner
  partner: handlePartner,
  // Music
  play: handlePlay,
  stop: handleStop,
  np: handleNowPlaying,
  nowplaying: handleNowPlaying,
  volume: handleVolume,
  vol: handleVolume,
  // Security
  antiraid: handleAntiRaid,
  antinuke: handleAntiNuke,
  // Admin
  setlog: handleSetLog,
};

// ─────────────────────────────────────────────
//  messageCreate
// ─────────────────────────────────────────────
const HANDLED = new Map();
function alreadyHandled(id) {
  const now = Date.now();
  for (const [k, t] of HANDLED) { if (now - t > 60_000) HANDLED.delete(k); }
  if (HANDLED.has(id)) return true;
  HANDLED.set(id, now); return false;
}

// Ping owner when user sends message in ticket channel
async function pingOwnerInTicket(message) {
  if (!message.channel.name?.startsWith("ticket-")) return;
  if (message.content.startsWith(PREFIX)) return;
  if (message.author.id === OWNER_ID) return;
  const isStaff = isAdmin(message.member) || hasPerm(message.member, PermissionFlagsBits.ManageMessages);
  if (isStaff) return;
  try {
    const ping = await message.channel.send({ content: `<@${OWNER_ID}>`, allowedMentions: { users: [OWNER_ID] } });
    setTimeout(() => ping.delete().catch(() => {}), 1500);
  } catch {}
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (alreadyHandled(message.id)) return;

  // Ticket ping
  pingOwnerInTicket(message).catch(() => {});

  if (!message.content.startsWith(PREFIX)) return;

  const args        = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const handler = commands[commandName];
  if (!handler) return;

  try { await handler(message, args); }
  catch (err) {
    console.error(`Error in ${PREFIX}${commandName}:`, err);
    await sendErrorLog(err, `Command: ${PREFIX}${commandName}`);
    await message.channel.send({ embeds: [errorEmbed("Something went wrong").setDescription("An unexpected error occurred.")] }).catch(() => {});
  }
});

// ─────────────────────────────────────────────
//  Comprehensive Event Logging
// ─────────────────────────────────────────────

// Messages
client.on("messageDelete", async (msg) => {
  try {
    if (!msg.guild || msg.author?.bot || msg.partial || !msg.content) return;
    await logMod(msg.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🗑️  Message Deleted")
      .addFields({ name: "👤 Author", value: `<@${msg.author.id}> (${msg.author.tag})`, inline: true }, { name: "💬 Channel", value: `<#${msg.channel.id}>`, inline: true }, { name: "📝 Content", value: msg.content.slice(0, 1024) })
      .setTimestamp());
  } catch {}
});

client.on("messageUpdate", async (old, updated) => {
  try {
    if (!updated.guild || updated.author?.bot || old.partial || updated.partial) return;
    if (old.content === updated.content) return;
    await logMod(updated.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("✏️  Message Edited")
      .addFields(
        { name: "👤 Author", value: `<@${updated.author.id}> (${updated.author.tag})`, inline: true },
        { name: "💬 Channel", value: `<#${updated.channel.id}>`, inline: true },
        { name: "📝 Before",  value: (old.content || "—").slice(0, 1024) },
        { name: "📝 After",   value: (updated.content || "—").slice(0, 1024) },
        { name: "🔗 Jump",    value: `[Go to message](${updated.url})`, inline: true },
      ).setTimestamp());
  } catch {}
});

client.on("messageDeleteBulk", async (messages) => {
  try {
    const first = messages.first();
    if (!first?.guild) return;
    await logMod(first.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🗑️  Bulk Delete")
      .addFields({ name: "💬 Channel", value: `<#${first.channel.id}>`, inline: true }, { name: "🔢 Count", value: `${messages.size}`, inline: true })
      .setTimestamp());
  } catch {}
});

// Members
client.on("guildMemberAdd", async (member) => {
  try {
    await handleAntiRaidJoin(member);
    await logMod(member.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("📥  Member Joined")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "👤 User",           value: `<@${member.id}> (${member.user.tag})` },
        { name: "📅 Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "👥 Members Now",    value: `${member.guild.memberCount}`, inline: true },
      ).setTimestamp());
  } catch {}
});

client.on("guildMemberRemove", async (member) => {
  try {
    await logMod(member.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("📤  Member Left")
      .setThumbnail(member.user.displayAvatarURL())
      .addFields({ name: "👤 User", value: `<@${member.id}> (${member.user.tag})` }, { name: "👥 Members Now", value: `${member.guild.memberCount}`, inline: true })
      .setTimestamp());
  } catch {}
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    const changes = [];
    if (oldMember.nickname !== newMember.nickname) changes.push(`**Nickname:** ${oldMember.nickname || "None"} → ${newMember.nickname || "None"}`);
    const added   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size)   changes.push(`**Roles Added:** ${added.map(r => `<@&${r.id}>`).join(", ")}`);
    if (removed.size) changes.push(`**Roles Removed:** ${removed.map(r => `<@&${r.id}>`).join(", ")}`);
    if (!changes.length) return;
    await logMod(newMember.guild, new EmbedBuilder().setColor(INFO_COLOR).setTitle("👤  Member Updated")
      .addFields({ name: "👤 User", value: `<@${newMember.id}> (${newMember.user.tag})` }, { name: "📝 Changes", value: changes.join("\n") })
      .setTimestamp());
  } catch {}
});

// Roles
client.on("roleCreate", async (role) => {
  try {
    await logMod(role.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🎭  Role Created")
      .addFields({ name: "📛 Name", value: role.name, inline: true }, { name: "🎨 Color", value: role.hexColor, inline: true }, { name: "🆔 ID", value: role.id, inline: true }, { name: "👁️ Hoist", value: role.hoist ? "Yes" : "No", inline: true }, { name: "🔔 Mentionable", value: role.mentionable ? "Yes" : "No", inline: true })
      .setTimestamp());
  } catch {}
});

client.on("roleDelete", async (role) => {
  try {
    await logMod(role.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🎭  Role Deleted")
      .addFields({ name: "📛 Name", value: role.name, inline: true }, { name: "🎨 Color", value: role.hexColor, inline: true }, { name: "🆔 ID", value: role.id, inline: true })
      .setTimestamp());
    const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).catch(() => null);
    if (logs?.entries.first()) await checkAntiNuke(role.guild, logs.entries.first().executor.id, "roleDelete");
  } catch {}
});

client.on("roleUpdate", async (oldRole, newRole) => {
  try {
    const changes = [];
    if (oldRole.name !== newRole.name)               changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor)       changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist)             changes.push(`**Hoist:** ${oldRole.hoist} → ${newRole.hoist}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionable:** ${oldRole.mentionable} → ${newRole.mentionable}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(`**Permissions:** Updated`);
    if (!changes.length) return;
    await logMod(newRole.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("🎭  Role Updated")
      .addFields({ name: "🎭 Role", value: `<@&${newRole.id}>`, inline: true }, { name: "📝 Changes", value: changes.join("\n") })
      .setTimestamp());
  } catch {}
});

// Channels
client.on("channelCreate", async (ch) => {
  if (!ch.guild) return;
  try {
    await logMod(ch.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("💬  Channel Created")
      .addFields({ name: "📛 Name", value: ch.name, inline: true }, { name: "📂 Type", value: String(ch.type), inline: true }, { name: "🆔 ID", value: ch.id, inline: true })
      .setTimestamp());
  } catch {}
});

client.on("channelDelete", async (ch) => {
  if (!ch.guild) return;
  try {
    await logMod(ch.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("💬  Channel Deleted")
      .addFields({ name: "📛 Name", value: ch.name, inline: true }, { name: "📂 Type", value: String(ch.type), inline: true }, { name: "🆔 ID", value: ch.id, inline: true })
      .setTimestamp());
    const logs = await ch.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
    if (logs?.entries.first()) await checkAntiNuke(ch.guild, logs.entries.first().executor.id, "channelDelete");
  } catch {}
});

client.on("channelUpdate", async (oldCh, newCh) => {
  if (!newCh.guild) return;
  try {
    const changes = [];
    if (oldCh.name !== newCh.name)   changes.push(`**Name:** ${oldCh.name} → ${newCh.name}`);
    if (oldCh.topic !== newCh.topic) changes.push(`**Topic:** ${(oldCh.topic || "None").slice(0, 100)} → ${(newCh.topic || "None").slice(0, 100)}`);
    if (oldCh.nsfw !== newCh.nsfw)   changes.push(`**NSFW:** ${oldCh.nsfw} → ${newCh.nsfw}`);
    if (oldCh.rateLimitPerUser !== newCh.rateLimitPerUser) changes.push(`**Slowmode:** ${oldCh.rateLimitPerUser}s → ${newCh.rateLimitPerUser}s`);
    if (!changes.length) return;
    await logMod(newCh.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("💬  Channel Updated")
      .addFields({ name: "💬 Channel", value: `<#${newCh.id}>` }, { name: "📝 Changes", value: changes.join("\n") })
      .setTimestamp());
  } catch {}
});

// Bans
client.on("guildBanAdd", async (ban) => {
  try {
    await logMod(ban.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🔨  Member Banned")
      .addFields({ name: "👤 User", value: `${ban.user.tag} (${ban.user.id})` }, { name: "📋 Reason", value: ban.reason || "No reason" })
      .setTimestamp());
    const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
    if (logs?.entries.first()) await checkAntiNuke(ban.guild, logs.entries.first().executor.id, "ban");
  } catch {}
});

client.on("guildBanRemove", async (ban) => {
  try {
    await logMod(ban.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🔓  Member Unbanned")
      .addFields({ name: "👤 User", value: `${ban.user.tag} (${ban.user.id})` }).setTimestamp());
  } catch {}
});

// Voice
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    if (oldState.member?.id === client.user?.id) return; // ignore bot's own VC moves
    if (oldState.channelId === newState.channelId) return;
    let desc = "";
    if (!oldState.channelId && newState.channelId)      desc = `<@${newState.id}> joined **${newState.channel?.name}**`;
    else if (oldState.channelId && !newState.channelId) desc = `<@${oldState.id}> left **${oldState.channel?.name}**`;
    else                                                 desc = `<@${newState.id}> moved **${oldState.channel?.name}** → **${newState.channel?.name}**`;
    const guild = newState.guild || oldState.guild;
    if (!guild) return;
    await logMod(guild, new EmbedBuilder().setColor(NOTE_COLOR).setTitle("🔊  Voice Update").setDescription(desc).setTimestamp());
  } catch {}
});

// Emoji
client.on("emojiCreate", async (emoji) => { try { await logMod(emoji.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("😄  Emoji Created").addFields({ name: "Name", value: emoji.name, inline: true }, { name: "ID", value: emoji.id, inline: true }).setThumbnail(emoji.url).setTimestamp()); } catch {} });
client.on("emojiDelete", async (emoji) => { try { await logMod(emoji.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("😄  Emoji Deleted").addFields({ name: "Name", value: emoji.name, inline: true }, { name: "ID", value: emoji.id, inline: true }).setTimestamp()); } catch {} });
client.on("emojiUpdate", async (oldE, newE) => {
  if (oldE.name === newE.name) return;
  try { await logMod(newE.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("😄  Emoji Renamed").addFields({ name: "Old", value: oldE.name, inline: true }, { name: "New", value: newE.name, inline: true }).setTimestamp()); } catch {}
});

// Server
client.on("guildUpdate", async (oldG, newG) => {
  try {
    const changes = [];
    if (oldG.name !== newG.name)                             changes.push(`**Name:** ${oldG.name} → ${newG.name}`);
    if (oldG.verificationLevel !== newG.verificationLevel)  changes.push(`**Verification:** ${oldG.verificationLevel} → ${newG.verificationLevel}`);
    if (oldG.explicitContentFilter !== newG.explicitContentFilter) changes.push(`**Content Filter:** ${oldG.explicitContentFilter} → ${newG.explicitContentFilter}`);
    if (!changes.length) return;
    await logMod(newG, new EmbedBuilder().setColor(WARN_COLOR).setTitle("🏠  Server Updated").addFields({ name: "📝 Changes", value: changes.join("\n") }).setTimestamp());
  } catch {}
});

// Webhooks (anti-nuke)
client.on("webhooksUpdate", async (channel) => {
  try {
    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.WebhookDelete, limit: 1 }).catch(() => null);
    if (logs?.entries.first()) {
      const entry = logs.entries.first();
      if (Date.now() - entry.createdTimestamp < 5000) await checkAntiNuke(channel.guild, entry.executor.id, "webhookDelete");
    }
    await logMod(channel.guild, new EmbedBuilder().setColor(WARN_COLOR).setTitle("🔗  Webhook Updated").addFields({ name: "💬 Channel", value: `<#${channel.id}>` }).setTimestamp());
  } catch {}
});

// Stickers
client.on("stickerCreate", async (sticker) => { if (!sticker.guild) return; try { await logMod(sticker.guild, new EmbedBuilder().setColor(SUCCESS_COLOR).setTitle("🎨  Sticker Created").addFields({ name: "Name", value: sticker.name, inline: true }, { name: "ID", value: sticker.id, inline: true }).setTimestamp()); } catch {} });
client.on("stickerDelete", async (sticker) => { if (!sticker.guild) return; try { await logMod(sticker.guild, new EmbedBuilder().setColor(ERROR_COLOR).setTitle("🎨  Sticker Deleted").addFields({ name: "Name", value: sticker.name, inline: true }).setTimestamp()); } catch {} });

// Invites
client.on("inviteCreate", async (invite) => {
  if (!invite.guild) return;
  try {
    await logMod(invite.guild, new EmbedBuilder().setColor(INFO_COLOR).setTitle("🔗  Invite Created")
      .addFields({ name: "Code", value: invite.code, inline: true }, { name: "Created by", value: invite.inviter?.tag || "—", inline: true }, { name: "Max Uses", value: `${invite.maxUses || "∞"}`, inline: true }, { name: "Expires", value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime()/1000)}:R>` : "Never", inline: true })
      .setTimestamp());
  } catch {}
});

// ─────────────────────────────────────────────
//  Error handlers
// ─────────────────────────────────────────────
client.on("error", async (err) => { console.error("Client error:", err); await sendErrorLog(err, "Client error"); });
process.on("unhandledRejection", async (err) => { console.error("Unhandled rejection:", err); await sendErrorLog(err, "Unhandled rejection"); });
process.on("uncaughtException",  async (err) => { console.error("Uncaught exception:",  err); await sendErrorLog(err, "Uncaught exception"); });

// ─────────────────────────────────────────────
//  Login
// ─────────────────────────────────────────────
client.login(TOKEN);

/**
 * 24/7 Cloud Keep-Alive Heartbeat Bot for FalixNodes Minecraft Server
 *
 * Designed to run on free cloud platforms (Render, Koyeb, Railway, Replit).
 * Includes an HTTP dummy health-check web server so cloud platforms don't stop the container!
 */

const http = require('http');
const mineflayer = require('mineflayer');

// Environment variables or fallback defaults
const CONFIG = {
  host: process.env.MC_HOST || 'aga.falix.gg', // e.g. falix server address/IP
  port: parseInt(process.env.MC_PORT, 10) || 10882,        // Your primary server port
  username: process.env.BOT_NAME || 'Heartbeat',
  version: '1.21.1',
  reconnectIntervalMs: 15000,
  jumpIntervalMs: 60000,
  httpPort: process.env.PORT || 3000                        // Cloud provider health-check port
};

let bot = null;
let botStatus = 'Initializing';

// 1. DUMMY HTTP SERVER (Keeps Render / Koyeb / Cloud runtimes happy & alive)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ONLINE',
    botStatus: botStatus,
    targetServer: `${CONFIG.host}:${CONFIG.port}`,
    timestamp: new Date().toISOString()
  }));
});

server.listen(CONFIG.httpPort, () => {
  console.log(`[Cloud Web Server] Health check server listening on port ${CONFIG.httpPort}`);
});

// 2. MINECRAFT BOT HEARTBEAT
function createBot() {
  console.log(`[Heartbeat Bot] Connecting to ${CONFIG.host}:${CONFIG.port} as ${CONFIG.username}...`);
  botStatus = 'Connecting';

  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version,
    auth: 'offline'
  });

  bot.on('login', () => {
    botStatus = 'Connected';
    console.log(`[Heartbeat Bot] Successfully logged into server! Server session kept alive.`);
  });

  bot.on('spawn', () => {
    console.log('[Heartbeat Bot] Bot spawned in world.');
    // Perform periodic jump so anti-AFK plugins don't kick the bot
    setInterval(() => {
      if (bot && bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => {
          if (bot) bot.setControlState('jump', false);
        }, 350);
      }
    }, CONFIG.jumpIntervalMs);
  });

  bot.on('kicked', (reason) => {
    botStatus = `Kicked: ${reason}`;
    console.warn(`[Heartbeat Bot] Kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    botStatus = `Error: ${err.message}`;
    console.error(`[Heartbeat Bot] Error:`, err.message);
  });

  bot.on('end', () => {
    botStatus = 'Disconnected, waiting to reconnect';
    console.warn(`[Heartbeat Bot] Disconnected. Reconnecting in ${CONFIG.reconnectIntervalMs / 1000}s...`);
    setTimeout(createBot, CONFIG.reconnectIntervalMs);
  });
}

createBot();

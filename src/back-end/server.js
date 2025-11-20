// imports
const cookie = require('@fastify/cookie');
const jwt = require('@fastify/jwt');
const cors = require('@fastify/cors');
const multipart = require ('@fastify/multipart');
const websocket = require('@fastify/websocket');
const path = require('path');
const i18n = require('fastify-i18n');

// Configure Pino logger for better structured logging
const isDevelopment = process.env.NODE_ENV !== 'production';

const fastify = require('fastify')({
  logger: isDevelopment ? {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        colorize: true
      }
    }
  } : {
    // Production: output raw JSON for ELK
    level: 'info',
    serializers: {
      req: (request) => ({
        method: request.method,
        url: request.url,
        path: request.routerPath,
        parameters: request.params,
        headers: {
          host: request.headers.host,
          userAgent: request.headers['user-agent'],
          referer: request.headers.referer
        },
        remoteAddress: request.ip,
        remotePort: request.socket?.remotePort
      }),
      res: (reply) => ({
        statusCode: reply.statusCode
      })
    }
  },
  // Request ID generation for tracing
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'request_id',
  disableRequestLogging: false
});
const { db, _INIT_DB } = require('./db.js'); // chemin relatif selon ton projet
const bcrypt = require('bcrypt');
require('dotenv').config();


/********************************************/
/*************VAULT TERRITORY****************/
/********************************************/
const { vault, vaultstart, vaultdown, writeSecret, readSecret } = require('./vault_handler/vault_launcher.js');



// global containers, for rooms ws (accessibles depuis toutes les routes)
fastify.decorate("p_rooms", new Map());   // game rooms -> [player1, player2]
fastify.decorate("p_waitingPlayers", new Map());        // matchId -> game state


// CORS (our frontend)
fastify.register(cors, {
  origin: 'http://localhost:5173', // ✅ must match EXACTLY
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Cookie (Registered before i18n to allow cookie-based locale detection)
fastify.register(cookie);

// Hook: Sync backend locale with frontend cookie (via Accept-Language header)
fastify.addHook('onRequest', async (request, reply) => {
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/app_locale=(en|fr)/);
    if (match) {
      request.headers['accept-language'] = match[1];
    }
  }
});

// i18n
fastify.register(i18n, {
  locales: ['en', 'fr'],
  directory: path.join(__dirname, 'locales'),
  defaultLocale: 'en',
  messages: {
    en: require('./locales/en.json'),
    fr: require('./locales/fr.json')
  }
});

// JWT


// Add request logging hook with enriched context
fastify.addHook('onRequest', async (request, reply) => {
  const logData = {
    event_type: 'request_received',
    method: request.method,
    url: request.url
  };
  // Only add user_id if user is authenticated (keep it as number)
  if (request.user?.id) {
    logData.user_id = request.user.id;
  }
  request.log.info(logData);
});

// Add response logging hook
fastify.addHook('onResponse', async (request, reply) => {
  const logData = {
    event_type: 'request_completed',
    method: request.method,
    url: request.url,
    status_code: reply.statusCode,
    response_time: reply.elapsedTime
  };
  // Only add user_id if user is authenticated (keep it as number)
  if (request.user?.id) {
    logData.user_id = request.user.id;
  }
  request.log.info(logData);
});

// fake ahhh
const gen_fake_games = (count = 1) => {
    for (let i = 0; i < count; i++) {
        const _id = `fake_${Date.now()}_${i}`;
        const _f_game = {
            id: _id,
            players: [`bot_${i}_1`, `bot_${i}_2`],
            sockets: [null, null], // no real WebSocket
            paddles: { p1: 50, p2: 50 },
            ball: { x: 100, y: 100, vx: 2, vy: 2 },
            scores: { p1: Math.floor(Math.random() * 10), p2: Math.floor(Math.random() * 10) },
            countdown: 0, // already “started”
        };
        fastify.p_rooms.set(_id, _f_game);
    }
}
// START SERV, and link db
const start = async () => {
    try {
      const token = await vaultstart();
      vault.token = token;
      const jwtSecret = await readSecret('jwt');

      let oauthSecrets = await readSecret('oauth');
      
      const envOAuth = {
          github_client_id: process.env.GITHUB_CLIENT_ID,
          github_client_secret: process.env.GITHUB_CLIENT_SECRET,
          google_client_id: process.env.GOOGLE_CLIENT_ID,
          google_client_secret: process.env.GOOGLE_CLIENT_SECRET
      };

      if (envOAuth.github_client_id || envOAuth.google_client_id) {
          console.log('🔄 Seeding/Updating OAuth secrets in Vault from .env');
          await writeSecret('oauth', envOAuth);
          oauthSecrets = envOAuth;
      }

      if (!oauthSecrets)
          oauthSecrets = {};

      fastify.decorate('oauth', oauthSecrets);
      // ----------------------------------------

      fastify.register(multipart);
      // -- moved into VAULT()  <---
      fastify.register(jwt, {
              secret: jwtSecret?.value || 'laclesecrete_a_mettre_dans_fichier_env', // !!!!! ENV !!!
              cookie: {
                cookieName: "token",
                signed : false
              }
      });
      console.log('jwt apres lecture vault:',jwtSecret?.value);
      // websocket
      fastify.register(websocket);

      // routes (REST api, ws)
      fastify.register(require('./routes/users.js'));
      fastify.register(require('./routes/pong.js'));

      await _INIT_DB(); // ✅ DB init here <------------
      gen_fake_games(Math.floor(Math.random() * 2)); // 
      // gen_fake_users(db);
      await fastify.listen({ port: 3010, host: '0.0.0.0' });
      console.log('🚀 server is running at http://localhost:3010');
    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
};
start();
// ! important cuhh
fastify.decorate('db', (db));


// fake ahhh users
const gen_fake_users = async (db, count = 2) => {
  const AVATAR_OPTIONS = [
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Sawyer',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=Sara',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Christian',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Aiden',
    'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Adrian',
    'https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=Brooklynn',
    'https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=Vivian',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nolan'
  ];
  for (let i = 0; i < count; i++) {
    const username = `bot_${i + 1}`;
    const password = await bcrypt.hash('password123', 10); // random default
    const rand_av = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
    const wins = Math.floor(Math.random() * 42);
    const losses = Math.floor(Math.random() * 42);
    const elo = 1100 + (wins - losses) * 10;

    await db.run(
      `INSERT INTO users (username, password, avatar_url, wins, losses, elo, created_at, last_online)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [username, password, rand_av, wins, losses, elo]
    );
  }
};
// gen_fake_users(db);

// last time seen (user field)
fastify.decorate('updateLastOnline', async function(userId) {
  if (!userId) return; // guard clause

  try {
    await fastify.db.run(
      "UPDATE users SET last_online = datetime('now') WHERE id = ?",
      [userId]
    );
  } catch (err) {
    fastify.log.error(`Failed to update last_online for user ${userId}:`, err);
  }
});

// authentification "middleware"
fastify.decorate("authenticate", async function(request, reply)
{
    try {
        let token = request.cookies ? request.cookies.token : null;
        
        // Fallback: manually parse cookie if fastify-cookie didn't populate it
        if (!token && request.headers.cookie) {
            const rawCookies = request.headers.cookie.split(';');
            for (const c of rawCookies) {
                const [key, value] = c.trim().split('=');
                if (key === 'token') {
                    token = value;
                    break;
                }
            }
        }

        if (!token)
        {
          if (reply)
            return reply.code(401).send({success:false, error:"no_token_in_cookie"})
          else
            throw new Error("no_token_in_cookie");
        }
        
        // Verify the token explicitly
        const decoded = await fastify.jwt.verify(token);
        
        request.user = decoded;
        await fastify.updateLastOnline(decoded.id); // Update last_online here
    } catch (err)
    {
        if (reply)
            return reply.code(401).send({success:false, error:"invalid_token"})
        else
            throw err;
    }
});

fastify.decorate('setAuthCookie', function(reply, token) {
  const isProd = process.env.NODE_ENV === 'production';
  reply.setCookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path : '/',
    maxAge: 7 * 24 * 60 * 60
  });
  return reply;
});

// Route GET /api (pour tests uniquement)
fastify.get('/api', async (request, reply) => {
  return {
    status: 'ok',
    message: 'pong de ses morts'
  };
});

// Route GET /api/i18n-test (pour tester i18n)
fastify.get('/api/i18n-test', async (request, reply) => {
  return {
    hello: request.i18n.t('hello'),
    welcome: request.i18n.t('welcome'),
    locale: request.i18n.locale
  };
});

// Capture les signaux de terminaison
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down Vault...');
  await vaultdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down Vault...');
  await vaultdown();
  process.exit(0);
});

// Pour les erreurs non attrapées
process.on('uncaughtException', async (err) => {
  console.error('Erreur non gérée :', err);
  await vaultdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('Promise rejetée non gérée :', reason);
  await vaultdown();
  process.exit(1);
});
// imports
const cookie = require('@fastify/cookie');
const jwt = require('@fastify/jwt');
const cors = require('@fastify/cors');
const multipart = require ('@fastify/multipart');
const websocket = require('@fastify/websocket');
const fastify = require('fastify')({   logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        colorize : true
      }
    }
  } });
const { db, _INIT_DB } = require('./db.js'); // chemin relatif selon ton projet


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
// JWT
require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;
fastify.register(cookie);
fastify.register(multipart);
fastify.register(jwt, {
        secret: jwtSecret || 'laclesecrete_a_mettre_dans_fichier_env', // !!!!! ENV !!!
        cookie: {
          cookieName: "token",
          signed : false
        }
});
// websocket
fastify.register(websocket);
// routes (REST api, ws)
fastify.register(require('./routes/users.js'));
fastify.register(require('./routes/pong.js'));

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
      await _INIT_DB(); // ✅ DB init here <------------
      gen_fake_games(Math.floor(Math.random() * 2)); // 
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
        const token = request.cookies.token;
        if (!token)
        {
          return reply.code(401).send({success:false, error:"no_token_in_cookie"})
        }
        const decoded = await request.jwtVerify(token);
        // console.log('Decoded JWT:', decoded);
        request.user = decoded;
        await fastify.updateLastOnline(decoded.id); // Update last_online here
    } catch (err)
    {
        return reply.code(401).send({success:false, error:"invalid_token"})    
    }
});


// Route GET /api (pour tests uniquement)
fastify.get('/api', async (request, reply) => {
  return {
    status: 'ok',
    message: 'pong de ses morts'
  };
});


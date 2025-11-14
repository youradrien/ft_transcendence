const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { db } = require('../db.js'); // chemin relatif

const { OAuth2Client } = require('google-auth-library');
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'http://localhost:3010/api/auth/google/callback'
);
const FRONTEND_URL = 'http://localhost:5173/auth';

async function getJWTContent(userId) {
  let user;
  try {
    user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    // avatar_url retiré du JWT
    return { id: user.id, username: user.username };
  } catch (_err) {
    throw new Error("erreur lors de l'obtention du JWT");
  }
}

async function userRoutes(fastify, options) {
  // Options permet de passer des variables personnalisées
  fastify.get('/api/test', async (request, reply) => {
    return 'test akbar';
  });

  // REGISTER
  fastify.post('/api/register', async (request, reply) => {
    const data = request.body;
    const { username, password } = data;

    request.log.info({
      event_type: 'registration_attempt',
      username,
      ip: request.ip,
    });

    if (!username || !password) {
      request.log.warn({
        event_type: 'registration_failed',
        reason: 'missing_credentials',
        username,
      });
      return reply.status(400).send({ success: false, error: 'username_or_password_empty' });
    }
    try {
      const userExists = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      if (userExists) {
        request.log.warn({
          event_type: 'registration_failed',
          reason: 'username_exists',
          username,
        });
        return reply.status(409).send({ success: false, error: 'username_already_exist' });
      }
    } catch (err) {
      request.log.error({
        event_type: 'registration_error',
        error: err.message,
        username,
      });
      return reply.status(500).send({ success: false, error: 'db_access' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const AVATAR_OPTIONS = [
        'https://api.dicebear.com/9.x/adventurer/svg?seed=Sawyer',
        'https://api.dicebear.com/9.x/adventurer/svg?seed=Sara',
        'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Christian',
        'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Aiden',
        'https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=Adrian',
        'https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=Brooklynn',
        'https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=Vivian',
        'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nolan',
      ];
      const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
      await db.run(
        "INSERT INTO users (username, password, avatar_url, created_at, last_online, level) VALUES (?, ?, ?, datetime('now'), datetime('now'), 0)",
        [username, hashedPassword, randomAvatar]
      );
    } catch (err) {
      request.log.error({
        event_type: 'registration_error',
        error: err.message,
        username,
      });
      return reply.status(500).send({ success: false, error: 'db_access' });
    }
    let userAddedId;
    try {
      const userAdded = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      userAddedId = userAdded.id;
    } catch (err) {
      request.log.error({
        event_type: 'registration_error',
        error: err.message,
        username,
      });
      return reply.status(500).send({ success: false, error: 'db_access' });
    }
    // new jwt ahhh
    try {
      const jwtContent = await getJWTContent(userAddedId);
      const jwtToken = fastify.jwt.sign(jwtContent);
      fastify.setAuthCookie(reply, jwtToken);

      request.log.info({
        event_type: 'registration_success',
        user_id: userAddedId,
        username,
      });

      return reply.send({ success: true });
    } catch (err) {
      request.log.error({
        event_type: 'registration_error',
        error: err.message,
        username,
      });
      return { success: false, error: 'db_access' };
    }
  });

  // LOGIN
  fastify.post('/api/login', async (request, reply) => {
    const { username, password, code_totp } = request.body;

    request.log.info({
      event_type: 'login_attempt',
      username,
      has_2fa_code: !!code_totp,
      ip: request.ip,
    });

    if (!username || !password) {
      request.log.warn({
        event_type: 'login_failed',
        reason: 'missing_credentials',
        username,
      });
      return reply.status(400).send({ success: false, error: 'username_or_password_empty' });
    }
    let user;
    try {
      user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      if (!user) {
        request.log.warn({
          event_type: 'login_failed',
          reason: 'user_not_found',
          username,
        });
        return reply.status(401).send({ success: false, error: 'username_not_exist' });
      }
    } catch (err) {
      request.log.error({
        event_type: 'login_error',
        error: err.message,
        username,
      });
      return reply.status(500).send({ success: false, error: 'db_access' });
    }
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      request.log.warn({
        event_type: 'login_failed',
        reason: 'invalid_password',
        username,
        user_id: user.id,
      });
      return reply.status(401).send({ success: false, error: 'password_not_valid' });
    }
    if (user.secret_totp) {
      if (!code_totp) {
        request.log.warn({
          event_type: 'login_failed',
          reason: '2fa_required',
          username,
          user_id: user.id,
        });
        return reply.status(401).send({ success: false, error: '2fa_empty' });
      } else {
        const verified = speakeasy.totp.verify({
          secret: user.secret_totp,
          encoding: 'base32',
          token: code_totp,
          window: 1,
        });
        if (!verified) {
          request.log.warn({
            event_type: 'login_failed',
            reason: '2fa_invalid',
            username,
            user_id: user.id,
          });
          return reply.status(401).send({ success: false, error: '2fa_code_not_valid' });
        }
      }
    }
    await fastify.updateLastOnline(user.id);
    try {
      const jwtContent = await getJWTContent(user.id);
      const jwtToken = fastify.jwt.sign(jwtContent);
      fastify.setAuthCookie(reply, jwtToken);

      request.log.info({
        event_type: 'login_success',
        user_id: user.id,
        username,
        has_2fa: !!user.secret_totp,
      });

      return reply.send({ success: true });
    } catch (err) {
      request.log.error({
        event_type: 'login_error',
        error: err.message,
        username,
        user_id: user.id,
      });
      return { success: false, error: 'db_access' };
    }
  });

  // LOGOUT
  fastify.post('/api/logout', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    reply.clearCookie('token');
    return reply.send({ success: true });
  });

  // Permet d'activer le 2FA sur le compte et renvoie le qr code (ainsi que la clé secrete). Nécessite d'être connecté
  fastify.get('/api/2fa/setup', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const secret = speakeasy.generateSecret({ name: 'Pong game' });
      const secretKey = secret.base32;
      const sqlRequest = 'UPDATE users SET secret_totp = ? WHERE id = ?';
      await db.run(sqlRequest, [secretKey, request.user.id]);
      const qrImage = await qrcode.toDataURL(secret.otpauth_url);
      return { success: true, qr_image: qrImage, secret_key: secretKey };
    } catch (_err) {
      return { success: false, error: 'db_access' };
    }
  });

  // GITHUB OAUTH2
  //PREMIERE ROUTE = CLIQUE SUR LOGIN AVEC GHUB
  fastify.get('/api/auth/github/login', async (req, reply) => {
    const githubAuthURL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user`;
    return reply.redirect(githubAuthURL);
  });

  ///CALLBACK LA OU ON REDIRIGE L'UTILISATEUR ET RECUPERER LE CODE DONNE PAR GHUB 1ERE ETAPE
  fastify.get('/api/auth/github/callback', async (req, reply) => {
    const code = req.query.code;
    if (!code) return reply.status(400).send('Code not provided');

    try {
      //CODE D'ECHANGE DONNE CONTRE UN ACCESS TOKEN 2EME ETAPE DE GITHUB OAUTH
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) throw new Error('No access token from GitHub');

      // Récupérer infos utilisateur
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const githubUser = await userRes.json();
      if (!githubUser || !githubUser.id) throw new Error('GitHub user fetch failed');

      // Chercher / créer utilisateur en BDD
      let user = await db.get('SELECT * FROM users WHERE sub_github = ?', [githubUser.id]);
      if (!user) {
        const username = githubUser.login || `User${Math.floor(Math.random() * 100000)}`;
        const profilePic = githubUser.avatar_url;
        await db.run('INSERT INTO users (username, sub_github, avatar_url) VALUES (?, ?, ?)', [
          username,
          githubUser.id,
          profilePic,
        ]);
        user = await db.get('SELECT * FROM users WHERE sub_github = ?', [githubUser.id]);
      }

      // Générer JWT et cookie
      const jwtContent = await getJWTContent(user.id);
      const jwtToken = fastify.jwt.sign(jwtContent);
      return reply
        .setCookie('token', jwtToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
        })
        .redirect(FRONTEND_URL);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ success: false, error: 'OAuth GitHub error' });
    }
  });

  fastify.get('/api/auth/google/login', async (request, reply) => {
    const authUrl = client.generateAuthUrl({ access_type: 'offline', scope: ['profile', 'email', 'openid'] });
    console.log(authUrl);
    reply.redirect(authUrl);
  });

  // Handle callback
  fastify.get('/api/auth/google/callback', async (request, reply) => {
    const { code } = request.query;

    try {
      const { tokens } = await client.getToken(code);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      // Your existing user creation/login logic here
      let user = await db.get('SELECT * FROM users WHERE sub_google = ?', [payload.sub]);

      if (!user) {
        console.log(`${payload.name}`);
        const newUsername = payload.name;
        const profilePic = payload.picture;
        console.log(`USER AVATR : ${payload.picture}`);
        await db.run('INSERT INTO users (username, sub_google, avatar_url) VALUES (?, ?, ?)', [
          newUsername,
          payload.sub,
          profilePic,
        ]);
        user = await db.get('SELECT * FROM users WHERE sub_google = ?', [payload.sub]);
      }

      const jwtContent = await getJWTContent(user.id);
      const jwtToken = fastify.jwt.sign(jwtContent);

      reply
        .setCookie('token', jwtToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
        })
        .redirect(FRONTEND_URL); // Redirect to frontend
    } catch (_err) {
      reply.status(500).send({ success: false, error: 'auth_failed' });
    }
  });

  // renvoie mon pseudo (cookie test)
  fastify.get('/api/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    await fastify.updateLastOnline(request.user.id);
    return reply.send({ success: true, username: request.user.username });
  });

  // get ses propres infos
  fastify.get('/api/me-info', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const u = request.user.username;

      const user = await db.get(
        'SELECT id, username, avatar_url, wins, last_online, elo, created_at, losses FROM users WHERE username = ?',
        [u]
      );
      console.log('JWT username:', `"${request.user.username}"`);
      if (!user) {
        return reply.status(404).send({ success: false, message: 'User not found' });
      }
      return reply.send({ success: true, user });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // get games infos
  fastify.get('/api/:username/games', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { username } = request.params;
      // get id frm username
      const user = await fastify.db.get(`SELECT id FROM users WHERE username = ?`, [username]);
      if (!user) {
        return reply.status(404).send({ success: false, message: 'user not-found' });
      }
      const games = await fastify.db.all(
        `SELECT * FROM games
                WHERE player1_id = ? OR player2_id = ?
                ORDER BY played_at DESC`,
        [user.id, user.id]
      );
      return reply.send({ success: true, games });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  });

  // get all users
  fastify.get('/api/leaderboard', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    console.log('GETTING LEADERBOARD');
    try {
      const users = await db.all('SELECT id, username, elo, avatar_url FROM users');
      return reply.send({ success: true, users });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'db_error' });
    }
  });

  // online count
  fastify.get('/api/users/online', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    try {
      const secondsAgo = 60 * 5; // (secondez) * minutes [5 minutes]
      const row = await db.get(`
                SELECT COUNT(*) as onlineCount FROM users
                WHERE strftime('%s','now') - strftime('%s', last_online) < ${secondsAgo}
            `);

      return reply.send({ success: true, data: { online_players: row.onlineCount } });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'db_error' });
    }
  });

  // get user (from his :username)
  fastify.get('/api/profile/:identifier', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const identifier = request.params.identifier;
    let user;
    try {
      if (Number.isNaN(identifier)) {
        // Fetch by username
        user = await db.get('SELECT * FROM users WHERE username = ?', [identifier]);
      } else {
        // Fetch by ID
        user = await db.get('SELECT * FROM users WHERE id = ?', [identifier]);
      }
    } catch (_err) {
      return reply.status(500).send({ success: false, error: 'db_access' });
    }
    if (!user) {
      return reply.status(404).send({ success: false, error: 'user_not_found' });
    }
    const isMyProfile = request.user.id === user.id;
    const isOnline = Date.now() - new Date(user.last_online).getTime() < 60000; // 60 seconds
    let blockRow;
    try {
      blockRow = await db.get('SELECT 1 FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?', [
        request.user.id,
        user.id,
      ]);
    } catch (_err) {
      return reply.status(500).send({ success: false, error: 'db_access' });
    }
    const isBlocked = !!blockRow;
    // Ajouter le statut d'amitié
    let friendStatus = 'none';
    if (!isMyProfile) {
      try {
        const sentRequest = await db.get('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?', [
          request.user.id,
          user.id,
        ]);
        const receivedRequest = await db.get('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?', [
          user.id,
          request.user.id,
        ]);

        if (sentRequest?.status === 'accepted' || receivedRequest?.status === 'accepted') {
          friendStatus = 'friends';
        } else if (sentRequest?.status === 'pending') {
          friendStatus = 'request_sent'; // Correction ici
        } else if (receivedRequest?.status === 'pending') {
          friendStatus = 'request_received'; // Demande reçue en attente
        }
      } catch (err) {
        console.error('Error checking friendship status:', err);
      }
    }
    return reply.send({
      success: true,
      id: user.id,
      username: user.username,
      wins: user.wins,
      losses: user.losses,
      elo: user.elo,
      xp: user.xp,
      level: user.level,
      avatar_url: user.avatar_url || '/uploads/default.png',
      last_online: user.last_online,
      created_at: user.created_at,
      isMyProfile,
      is_online: isOnline,
      i_blocked: isBlocked, // <-- nouveau champ pour le front
      friend_status: friendStatus, // <-- nouveau champ pour le statut d'amiti\u00e9
    });
  });
}
module.exports = userRoutes;

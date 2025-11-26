const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { hash } = require('crypto');
const util = require('util');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { pipeline } = require ('stream/promises');
const { db, _add_friend, _remove_friend, _delete_friend_request } = require('../db.js'); // chemin relatif

const { OAuth2Client } = require('google-auth-library');
const FRONTEND_URL = 'http://localhost:5173/auth';


async function getJWTContent(user_id)
{
    let user;
    try {
            user = await db.get("SELECT * FROM users WHERE id = ?", [user_id]);
            // avatar_url retiré du JWT
            return {id:user.id, username : user.username};
    } catch (err){
            throw new Error("erreur lors de l'obtention du JWT");                          
    }
}


async function userRoutes(fastify, options) // Options permet de passer des variables personnalisées
{
    // Retrieve OAuth secrets from Fastify decorator (loaded from Vault)
    const { 
        github_client_id: GITHUB_CLIENT_ID, 
        github_client_secret: GITHUB_CLIENT_SECRET, 
        google_client_id: GOOGLE_CLIENT_ID, 
        google_client_secret: GOOGLE_CLIENT_SECRET 
    } = fastify.oauth || {};

    // Initialize Google Client with secrets
    const client = new OAuth2Client(
        GOOGLE_CLIENT_ID, 
        GOOGLE_CLIENT_SECRET, 
        'http://localhost:3010/api/auth/google/callback'
    );

    fastify.get('/api/test', async (request, reply) => {
            return "test akbar";
    });

    const registerSchema = {
        body: {
            type: 'object',
            required: ['username', 'password'],
            properties: {
                username: { type: 'string', minLength: 3, maxLength: 20 },
                password: { 
                    type: 'string', 
                    // min 12 chars, 1 lower, 1 upper, 1 number, 1 special
                    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{12,64}$' 
                }
            }
        }
    };

    fastify.post('/api/register', { schema: registerSchema, attachValidation: true }, async (request, reply) => {
        if (request.validationError) {
            request.log.warn({
                event_type: 'registration_failed',
                reason: 'validation_error',
                error: request.validationError.message
            });
            const isPassword = request.validationError.message.includes('password');
            return reply.status(400).send({ 
                success: false, 
                error: isPassword ? 'password_too_weak' : 'invalid_username_format' 
            });
        }

        const data = request.body;
        const { username, password } = data;
        
        request.log.info({
            event_type: 'registration_attempt',
            username,
            ip: request.ip
        });
        
        if (!username || !password) {
            request.log.warn({
                event_type: 'registration_failed',
                reason: 'missing_credentials',
                username
            });
            return reply.status(400).send({ success: false, error: 'username_or_password_empty' });
        }
        try {
            const user_exists = await db.get("SELECT * FROM users WHERE username = ?", [username]);
            if (user_exists) {
                request.log.warn({
                    event_type: 'registration_failed',
                    reason: 'username_exists',
                    username
                });
                return reply.status(409).send({ success: false, error: 'username_already_exist' });
            }
        } catch (err) {
            request.log.error({
                event_type: 'registration_error',
                error: err.message,
                username
            });
            return reply.status(500).send({ success: false, error: 'db_access' });
        }
        const hashed_password = await bcrypt.hash(password, 10);
        try {
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
            const rand_av = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
            await db.run(
                "INSERT INTO users (username, password, avatar_url, created_at, last_online, level) VALUES (?, ?, ?, datetime('now'), datetime('now'), 0)",
                [username, hashed_password, rand_av]
            );
        } catch (err) {
            request.log.error({
                event_type: 'registration_error',
                error: err.message,
                username
            });
            return reply.status(500).send({ success: false, error: 'db_access' });
        }
        let user_added_id;
        try {
            const user_added = await db.get("SELECT * FROM users WHERE username = ?", [username])
            user_added_id = user_added.id;
        } catch (err)
        {
            request.log.error({
                event_type: 'registration_error',
                error: err.message,
                username
            });
            return reply.status(500).send({success: false, error : 'db_access'});                          
        }
        // new jwt ahhh
        try {
            const jwt_content = await getJWTContent(user_added_id);
            const token_jwt = fastify.jwt.sign(jwt_content);
            fastify.setAuthCookie(reply, token_jwt);
            
            request.log.info({
                event_type: 'registration_success',
                user_id: user_added_id,
                username
            });
            
            return reply.send({success: true});
        } catch (err)
        {
            request.log.error({
                event_type: 'registration_error',
                error: err.message,
                username
            });
            return ({success : false, error : "db_access"});
        }
    });


    

    // LOGIN
    fastify.post('/api/login', async (request, reply) => {
        const {username, password, code_totp } = request.body;
        
        request.log.info({
            event_type: 'login_attempt',
            username,
            has_2fa_code: !!code_totp,
            ip: request.ip
        });
        
        if (!username || !password){
            request.log.warn({
                event_type: 'login_failed',
                reason: 'missing_credentials',
                username
            });
            return reply.status(400).send({success:false, error : 'username_or_password_empty'});
        }
        let user;
        try {
            user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
            if (!user){
                request.log.warn({
                    event_type: 'login_failed',
                    reason: 'user_not_found',
                    username
                });
                return reply.status(401).send({
                    success: false,
                    error : request.i18n.t('error_user_not_found')});
            }
        } catch (err){
            request.log.error({
                event_type: 'login_error',
                error: err.message,
                username
            });
            return reply.status(500).send({success: false, error : 'db_access'});                          
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid){
            request.log.warn({
                event_type: 'login_failed',
                reason: 'invalid_password',
                username,
                user_id: user.id
            });
            return reply.status(401).send({success:false, error : request.i18n.t('error_user_not_found')});
        }
        if (user.secret_totp)
        {
          if (!code_totp){
              request.log.warn({
                  event_type: 'login_failed',
                  reason: '2fa_required',
                  username,
                  user_id: user.id
              });
              return reply.status(401).send({success: false, error : '2fa_empty'});                   
          }
          else{
              const verified = speakeasy.totp.verify({
                      secret:user.secret_totp,
                      encoding: 'base32',
                      token: code_totp,
                      window: 1
              });
              if (!verified){
                request.log.warn({
                    event_type: 'login_failed',
                    reason: '2fa_invalid',
                    username,
                    user_id: user.id
                });
                return reply.status(401).send({success: false, error : '2fa_code_not_valid'});
              }
          }
        }
        await fastify.updateLastOnline(user.id);
        try {
            const jwt_content = await getJWTContent(user.id);
            const token_jwt = fastify.jwt.sign(jwt_content);
            fastify.setAuthCookie(reply, token_jwt);
            
            request.log.info({
                event_type: 'login_success',
                user_id: user.id,
                username,
                has_2fa: !!user.secret_totp
            });
            
            return reply.send({success: true});
        } catch (err)
        {
            request.log.error({
                event_type: 'login_error',
                error: err.message,
                username,
                user_id: user.id
            });
            return ({success : false, error : "db_access"});
        }
    });


    
    // LOGOUT
    fastify.post('/api/logout', {preValidation: [fastify.authenticate]}, async (request, reply) => {
        reply.clearCookie('token');
        return reply.send({ success: true });
    });

    ///change username//
    fastify.post('/api/user', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const { username } = request.body;
    const userId = request.user.id;

    if (!username || typeof username !== 'string') {
        return reply.status(400).send({ success: false, error: 'invalid_username' });
    }
    if (username.length < 3 || username.length > 20) {
        return reply.status(400).send({ success: false, error: 'username_length_invalid' });
    }

    try {
            const existingUser = await db.get("SELECT id FROM users WHERE username = ? AND id != ?", [username, userId]);
            if (existingUser) {
                return reply.status(409).send({ success: false, error: 'username_already_exist' });
            }

            await db.run("UPDATE users SET username = ? WHERE id = ?", [username, userId]);

            // Generate new JWT with updated username
            const jwt_content = await getJWTContent(userId);
            const token_jwt = fastify.jwt.sign(jwt_content);
            fastify.setAuthCookie(reply, token_jwt);

            request.log.info({
                event_type: 'username_updated',
                user_id: userId,
                new_username: username
            });

            return reply.send({ success: true, username });
        } 
        catch (err) {
            request.log.error({
                event_type: 'username_update_error',
                error: err.message,
                user_id: userId
            });
            return reply.status(500).send({ success: false, error: 'db_error' });
        }
});

    //change pfp
    fastify.post('/api/user/avatar', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { avatar_url } = request.body;
        const userId = request.user.id;

        if (!avatar_url || typeof avatar_url !== 'string') {
            return reply.status(400).send({ success: false, error: 'invalid_avatar_url' });
        }

        // Check if it's a base64 image or a URL
        const isBase64 = avatar_url.startsWith('data:image/');
        const isURL = avatar_url.startsWith('http://') || avatar_url.startsWith('https://');

        if (!isBase64 && !isURL) {
            return reply.status(400).send({ success: false, error: 'invalid_avatar_format' });
        }

        // If it's base64, validate size (max ~7MB base64 = ~5MB file)
        if (isBase64 && avatar_url.length > 7 * 1024 * 1024) {
            return reply.status(400).send({ success: false, error: 'avatar_too_large' });
        }

        // If it's a URL, validate format
        if (isURL) {
            try {
                new URL(avatar_url);
            } catch (e) {
                return reply.status(400).send({ success: false, error: 'invalid_url_format' });
            }
        }

        try {
            await db.run("UPDATE users SET avatar_url = ? WHERE id = ?", [avatar_url, userId]);

            request.log.info({
                event_type: 'avatar_updated',
                user_id: userId,
                avatar_type: isBase64 ? 'base64' : 'url'
            });

            return reply.send({ success: true, avatar_url });
        } catch (err) {
            request.log.error({
                event_type: 'avatar_update_error',
                error: err.message,
                user_id: userId
            });
            return reply.status(500).send({ success: false, error: 'db_error' });
        }
    });

    // Permet d'activer le 2FA sur le compte et renvoie le qr code (ainsi que la clé secrete). Nécessite d'être connecté
    fastify.get('/api/2fa/setup', {preValidation: [fastify.authenticate]}, async (request, reply) => {
      try {
          const secret = speakeasy.generateSecret({name : "Pong game"});
          const secret_key = secret.base32;
          const sql_request = "UPDATE users SET secret_totp = ? WHERE id = ?";
          await db.run(sql_request, [secret_key, request.user.id]);
          const qr_image = await qrcode.toDataURL(secret.otpauth_url);
          return ({success:true, qr_image, secret_key});
      } catch (err)
      {
          return ({success:false, error:"db_access"});
      }
    });


    // GITHUB OAUTH2
    //PREMIERE ROUTE = CLIQUE SUR LOGIN AVEC GHUB
  fastify.get('/api/auth/github/login', async (req, reply) => {
        if (!GITHUB_CLIENT_ID) {
             return reply.status(500).send({ success: false, error: 'github_auth_not_configured' });
        }
        const githubAuthURL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user`;
        return reply.redirect(githubAuthURL);
    });

    ///CALLBACK LA OU ON REDIRIGE L'UTILISATEUR ET RECUPERER LE CODE DONNE PAR GHUB 1ERE ETAPE
    fastify.get('/api/auth/github/callback', async (req, reply) => {
        const code = req.query.code;
        if (!code) return reply.status(400).send('Code not provided');

        if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
             return reply.status(500).send({ success: false, error: 'github_auth_not_configured' });
        }

        try {
            //CODE D'ECHANGE DONNE CONTRE UN ACCESS TOKEN 2EME ETAPE DE GITHUB OAUTH
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code })
            });
            const tokenData = await tokenRes.json();
            const access_token = tokenData.access_token;
            if (!access_token) throw new Error('No access token from GitHub');

            // Récupérer infos utilisateur
            const userRes = await fetch('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const githubUser = await userRes.json();
            if (!githubUser || !githubUser.id) throw new Error('GitHub user fetch failed');

            // Chercher / créer utilisateur en BDD
            let user = await db.get("SELECT * FROM users WHERE sub_github = ?", [githubUser.id]);
            if (!user) {
                const username = githubUser.login || `User${Math.floor(Math.random() * 100000)}`;
                const profile_pic = githubUser.avatar_url;
                await db.run("INSERT INTO users (username, sub_github, avatar_url) VALUES (?, ?, ?)", [username, githubUser.id, profile_pic]);
                user = await db.get("SELECT * FROM users WHERE sub_github = ?", [githubUser.id]);
            }

            // Générer JWT et cookie
            const jwt_content = await getJWTContent(user.id);
            const token_jwt = fastify.jwt.sign(jwt_content);
            return reply.setCookie('token', token_jwt, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                path: '/'
            }).redirect(FRONTEND_URL);

        } catch (err) {
            console.error(err);
            return reply.status(500).send({ success: false, error: 'OAuth GitHub error' });
        }
    });



    fastify.get('/api/auth/google/login', async (request, reply) => {
        const authUrl = client.generateAuthUrl({access_type: 'offline',scope: ['profile', 'email', 'openid']});
        reply.redirect(authUrl);
    });

    // Handle callback
    fastify.get('/api/auth/google/callback', async (request, reply) => {
        const { code } = request.query;
        try {
            const { tokens } = await client.getToken(code);
            const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: GOOGLE_CLIENT_ID
            });
            
            const payload = ticket.getPayload();
            
            let user = await db.get("SELECT * FROM users WHERE sub_google = ?", [payload.sub]);
            ///check if the username is alredy in the db and if the payload.sub isnt in the db if its the case it means we have two different google users with the same username and we need to handle it
            nick_in_use = await db.get("SELECT * FROM users WHERE username = ?", [payload.name]);
            if (!user){
                console.log(`${payload.name}`);
                let pseudo_new;
                if (!nick_in_use) {
                    pseudo_new = payload.name;
                } else {
                    const rand = Math.floor(Math.random() * 15000) + 1;
                    pseudo_new = `${payload.name}${rand}`;
                }
                const profile_pic = payload.picture;
                console.log(`USER AVATR : ${payload.picture}`);
                await db.run("INSERT INTO users (username, sub_google, avatar_url) VALUES (?, ?, ?)", [pseudo_new, payload.sub, profile_pic]);
                user = await db.get("SELECT * FROM users WHERE sub_google = ?", [payload.sub]);
            }
            
            const jwt_content = await getJWTContent(user.id);
            const token_jwt = fastify.jwt.sign(jwt_content);
            
            reply.setCookie('token', token_jwt, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/'
            }).redirect(FRONTEND_URL); // Redirect to frontend
            
        } catch (err) {
            reply.status(500).send({ success: false, error: 'auth_failed' });
        }
    });



    // renvoie mon pseudo (cookie test)
    fastify.get('/api/me', {preValidation: [fastify.authenticate]}, async (request, reply) => {
            await fastify.updateLastOnline(request.user.id);
            return reply.send({ success: true, username: request.user.username });
    });


    // get ses propres infos
    fastify.get('/api/me-info', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const u = request.user.username;

            const user = await db.get(
            "SELECT id, username, avatar_url, wins, last_online, elo, created_at, losses FROM users WHERE username = ?",
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
        console.log("GETTING LEADERBOARD");
        try {
            const users = await db.all("SELECT id, username, elo, avatar_url FROM users");
            return reply.send({ success: true, users });
        } catch (err) 
        {
            fastify.log.error(err);
            return reply.status(500).send({ success: false, error: 'db_error' });
        }
    });


    // online count
    fastify.get('/api/users/online', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const l_ago = (60) * 5; // (secondez) * minutes [5 minutes]
            const row = await db.get(`
                SELECT COUNT(*) as onlineCount FROM users
                WHERE strftime('%s','now') - strftime('%s', last_online) < ${l_ago}
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
            if (isNaN(identifier)) { // Fetch by username
                    user = await db.get("SELECT * FROM users WHERE username = ?", [identifier]);
            } else { // Fetch by ID
                    user = await db.get("SELECT * FROM users WHERE id = ?", [identifier]);
            }
        } catch (err) {
            return reply.status(500).send({ success: false, error: 'db_access' });
        }
        if (!user) {
            return reply.status(404).send({ success: false, error: "user_not_found" });
        }
        const isMyProfile = request.user.id === user.id;
        const isOnline = (new Date().getTime() - new Date(user.last_online).getTime()) < 60000; // 60 seconds
        let blockRow;
        try {
            blockRow = await db.get(
                "SELECT 1 FROM blocked_users WHERE user_id = ? AND blocked_user_id = ?",
                [request.user.id, user.id]
            );
        } catch (err) {
            return reply.status(500).send({ success: false, error: 'db_access' });
        }
        const i_blocked = !!blockRow;
        // Ajouter le statut d'amitié
        let friend_status = 'none';
        if (!isMyProfile) 
        {
            try {
                const sentRequest = await db.get(
                    "SELECT status FROM friends WHERE user_id = ? AND friend_id = ?",
                    [request.user.id, user.id]
                );
                const receivedRequest = await db.get(
                    "SELECT status FROM friends WHERE user_id = ? AND friend_id = ?",
                    [user.id, request.user.id]
                );

                if (sentRequest?.status === 'accepted' || receivedRequest?.status === 'accepted') {
                    friend_status = 'friends';
                } else if (sentRequest?.status === 'pending') {
                    friend_status = 'request_sent'; // Correction ici
                } else if (receivedRequest?.status === 'pending') {
                    friend_status = 'request_received'; // Demande reçue en attente
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
            i_blocked,    // <-- nouveau champ pour le front
            friend_status // <-- nouveau champ pour le statut d'amitié
        });
    });

	/// FRIENDS GESTION !! ///

	// Get all user's friends :
	fastify.get('/api/friends', { preValidation: [fastify.authenticate] }, async (request, reply) => {

		try {
			const userId = request.user.id;

			const friendsRows = await db.all(
				` SELECT u.id, u.username, u.avatar_url, u.last_online
				FROM friends f
				JOIN users u ON u.id = f.friend_id
				WHERE f.user_id = ? AND f.status = 'accepted'`,
				[userId]);

			const friends = friendsRows.map(f => ({
				id: f.id,
				username: f.username,
				avatar_url: f.avatar_url,
				online: (new Date() - new Date(f.last_online)) <= 30 * 1000,
				last_seen: f.last_online
			}));

			return reply.send({ success: true, friends });
		} catch (err) {
			console.error(err);
			return reply.status(500).send({ success: false, error: 'db_error' });
		}
	});

	// Get all user's friends requests :
	fastify.get('/api/friends/requests', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const userId = req.user.id;
		try {
			const requests = await db.all(`
				SELECT u.id, u.username, u.avatar_url, u.last_online
				FROM friend_requests fr
				JOIN users u ON u.id = fr.sender_id
				WHERE fr.receiver_id = ? AND fr.status = 'pending'`,
			[userId]);

			const formatted = requests.map(f => ({
				id: f.id,
				username: f.username,
				avatar_url: f.avatar_url,
				online: (new Date() - new Date(f.last_online)) <= 30 * 1000,
				last_seen: f.last_online
			}));

			reply.send({ success: true, requests: formatted} );
		} catch (error) {
			console.error(error);
			reply.status(500).send({ success: false, error: 'db_error' });
		}
	});

	// Seeing if someone is already a friend or a requester :
	fastify.get('/api/friends/status/:username', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const currentUserId = req.user.id;
		const username = req.params.username;

		try {
			const friendRow = await db.get(`
				SELECT 1
				FROM friends f
				JOIN users u ON u.id = f.friend_id
				WHERE f.user_id = ? AND u.username = ? AND f.status = 'accepted'
			`, [currentUserId, username]);

			if (friendRow) {
				return reply.send({ success: true, status: 'friends', pendingType: null });
			}

			const pendingRow = await db.get(`
				SELECT fr.sender_id, fr.receiver_id
				FROM friend_requests fr
				JOIN users sender ON sender.id = fr.sender_id
				JOIN users receiver ON receiver.id = fr.receiver_id
				WHERE fr.status = 'pending' AND (
					(sender.id = ? AND receiver.username = ?) OR 
					(receiver.id = ? AND sender.username = ?)
			)
			`, [currentUserId, username, currentUserId, username]);

			if (pendingRow) {
				if (pendingRow.sender_id === currentUserId) {
					return reply.send({ success: true, status: 'pending', pendingType: 'sent' });
				} else {
					return reply.send({ success: true, status: 'pending', pendingType: 'received' });
				}
			}
			return reply.send({ success: true, status: 'none', pendingType: null });
		} catch (error) {
			console.error(error);
			return reply.status(500).send({ success: false, error: 'db_error', pendingType: null });
		}
	});

	// Sending a friend request :
	fastify.post('/api/friends/requests', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const senderId = req.user.id;
		const { username } = req.body;

		try {
			const target = await db.get("SELECT id FROM users WHERE username = ?", [username]);
			if (!target)
				return reply.status(400).send({ success: false, error: 'user_not_found'});

			const receiverId = target.id;
			if (receiverId === senderId) {
				return reply.status(400).send({ success: false, error: 'cannot_add_yourself'});
			}

			const alreadyFriends = await db.get(`
				SELECT * FROM friends
				WHERE (user_id = ? AND friend_id = ?)
				OR (user_id = ? AND friend_id = ?)`,
				[senderId, receiverId, receiverId, senderId]);

			if (alreadyFriends) {
				return reply.status(400).send({ success: false, error: 'already_friends' });
			}

			const existing = await db.get(`
				SELECT * FROM friend_requests
				WHERE sender_id = ? AND receiver_id = ?`, [senderId, receiverId]);
			if (existing)
				return reply.status(400).send({ success: false, error: 'already_requested'});

			await db.run(`
				INSERT INTO friend_requests (sender_id, receiver_id)
				VALUES (?, ?)`,
			[senderId, receiverId]);

			reply.send({ success: true });
		} catch (error) {
			console.error(error);
			reply.status(500).send({ success: false, error: 'db_error' });
		}
	});

	// Accepting a friend request :
	fastify.post('/api/friends/requests/accept/:username', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const receiverId = req.user.id;
		const { username } = req.params;

		try {
			const sender = await db.get("SELECT id FROM users WHERE username = ?", [username]);
			if (!sender)
				return reply.status(400).send({ success: false, error: 'user_not_found' });

			const senderId = sender.id;

			const request = await db.get(`
				SELECT * FROM friend_requests
				WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
			[senderId, receiverId]);

			if (!request)
				return reply.status(400).send({ success: false, error: 'request_not_found' });

			await _add_friend(receiverId, senderId);

			await _delete_friend_request(request.id);
			reply.send({ success: true });
		} catch (err) {
			console.error(err);
			reply.status(500).send({ success: false, error: 'db_error' });
		}
	})

	// Cancel a friend request :
	fastify.delete('/api/friends/requests/:username', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const currentUserId = req.user.id;
		const username = req.params.username;

		try {
			const userTo = await db.get(`SELECT id FROM users WHERE username = ?`, [username]);
			if (!userTo) return reply.status(404).send({ success: false, error: 'user_not_found' });

			const res = await db.run(`
				DELETE FROM friend_requests
				WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`,
			[currentUserId, userTo.id]);

			return reply.send({ success: true });
		} catch (err) {
			console.error(err);
			return reply.status(500).send({ success: false, error: 'db_error' });
		}
	});

	// Decline a friend request :
	fastify.post('/api/friends/requests/decline/:username', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const receiverId = req.user.id;
		const { username } = req.params;

		try {
			const sender = await db.get("SELECT id FROM users WHERE username = ?", [username]);
			if (!sender)
				return reply.status(400).send({ success: false, error: 'user_not_found' });

			const senderId = sender.id;

			const request = await db.get(`
				SELECT * FROM friend_requests
				WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'`, 
				[senderId, receiverId]);

			if (!request)
				return reply.status(400).send({ success: false, error: 'request_not_found' });

			await _delete_friend_request(request.id);
			reply.send({ success: true });

		} catch (err) {
			console.error(err);
			reply.status(500).send({ success: false, error: 'db_error' });
		}
	});

	// Remove a friend :
	fastify.delete('/api/friends/:username', { preValidation: [fastify.authenticate] }, async (req, reply) => {

		const userId = req.user.id;
		const { username } = req.params;

		try {
			const target = await db.get("SELECT id FROM users WHERE username = ?", [username]);
			if (!target) return reply.status(400).send({ success: false, error: 'user_not_found' });
			const targetId = target.id;

			const existing = await db.get(`
				SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'accepted'`, 
				[userId, targetId]);

			if (!existing) return reply.status(400).send({ success: false, error: 'not_friends' });

			await db.run(`DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
			[userId, targetId, targetId, userId]);

			reply.send({ success: true });
		} catch (err) {
			console.error(err);
			reply.status(500).send({ success: false, error: 'db_error' });
		}
	});
}

  module.exports = userRoutes;

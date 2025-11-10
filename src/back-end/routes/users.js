const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { hash } = require('crypto');
const util = require('util');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { pipeline } = require ('stream/promises');
const { db } = require('../db.js'); // chemin relatif

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // A mettre dans un fichier .env !!!!
const client = new OAuth2Client(CLIENT_ID); 


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
    fastify.get('/api/test', async (request, reply) => {
            return "test akbar";
    });


    // REGISTER
    fastify.post('/api/register', async (request, reply) => {
        const data = request.body;
        const { username, password } = data;
        console.log("MF " + username + ", " + password + " is trying to create an account");
        if (!username || !password) {
            return reply.status(400).send({ success: false, error: 'username_or_password_empty' });
        }
        try {
            const user_exists = await db.get("SELECT * FROM users WHERE username = ?", [username]);
            if (user_exists) {
                return reply.status(409).send({ success: false, error: 'username_already_exist' });
            }
        } catch (err) {
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
            return reply.status(500).send({ success: false, error: 'db_access' });
        }
        let user_added_id;
        try {
            const user_added = await db.get("SELECT * FROM users WHERE username = ?", [username])
            user_added_id = user_added.id;
        } catch (err)
        {
            return reply.status(500).send({success: false, error : 'db_access'});                          
        }
        // new jwt ahhh
        try {
            const jwt_content = await getJWTContent(user_added_id);
            const token_jwt = fastify.jwt.sign(jwt_content);
            return reply.setCookie('token', token_jwt, {
                    httpOnly: true,
                    secure : true, // true if HTTPS
                    sameSite : 'none',
                    path : '/'
            }).send({success: true});
        } catch (err)
        {
            return ({success : false, error : "db_access"});
        }
    });


    

    // LOGIN
    fastify.post('/api/login', async (request, reply) => {
        const {username, password, code_totp } = request.body;
        if (!username || !password){
            return reply.status(400).send({success:false, error : 'username_or_password_empty'});
        }
        let user;
        try {
            user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
            if (!user){
                return reply.status(401).send({success:false, error : 'username_not_exist'});
            }
        } catch (err){
            return reply.status(500).send({success: false, error : 'db_access'});                          
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid){
            return reply.status(401).send({success:false, error : 'password_not_valid'});
        }
        if (user.secret_totp)
        {
          if (!code_totp){
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
                return reply.status(401).send({success: false, error : '2fa_code_not_valid'});
              }
          }
        }
        await fastify.updateLastOnline(user.id);
        try {
            const jwt_content = await getJWTContent(user.id);
            const token_jwt = fastify.jwt.sign(jwt_content);
            return reply.setCookie('token', token_jwt, {
                    httpOnly: true,
                    secure : true, // true for HTTPS
                    sameSite : 'none',
                    path : '/'
            }).send({success: true});
        } catch (err)
        {
            return ({success : false, error : "db_access"});
        }
    });


    
    // LOGOUT
    fastify.post('/api/logout', {preValidation: [fastify.authenticate]}, async (request, reply) => {
        reply.clearCookie('token');
        return reply.send({ success: true });
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



    // API -- Google Sign In (appelée via fetch) !!!! NE FONCTIONNE QU'AVEC LE NAVIGATEUR
    fastify.post('/api/auth/google', async (request, reply) => {
        const { id_token } = request.body;

        try {
            console.log("TEST GOOGLE");
            const ticket = await client.verifyIdToken({
                    idToken: id_token,
                    audience: CLIENT_ID // Vérifie que le JWT obtenu grace a google est bien destiné A MON programme
            });
            const payload = ticket.getPayload();
            if (!payload)
            {       
                fastify.log.info("erreur sign in payload");
                return reply.status(401).send({success:false, error : "invalid_token"});
            }
            else
            {
                let user;
                try {
                        user = await db.get("SELECT * FROM users WHERE sub_google = ?", [payload.sub]);
                } catch (err){
                        return reply.status(500).send({success: false, error : 'db_access'});                          
                }
                if (!user)
                {
                    const number = Math.floor(Math.random() * 10000000);
                    const pseudo_new = `Player${number}`;
                    try {
                        await db.run("INSERT INTO users (username, sub_google) VALUES (?, ?)", [pseudo_new, payload.sub]);
                    } catch (err)
                    {
                        return reply.status(500).send({success: false, error : 'db_access'});
                    }
                    let real_user;
                    try {
                        real_user = await db.get("SELECT * FROM users WHERE sub_google = ?", [payload.sub]);
                    } catch (err){
                        return reply.status(500).send({success: false, error : 'db_access'});                          
                    }
                    try {
                        const jwt_content = await getJWTContent(real_user.id);
                        const token_jwt = fastify.jwt.sign(jwt_content);
                        return reply.setCookie('token', token_jwt, {
                                httpOnly: true,
                                secure : true,
                                sameSite : 'none',
                                path : '/'
                        }).send({success: true});
                    } catch (err)
                    {
                        return ({success : false, error : "db_access"});
                    }
                }
                else
                {
                    try {
                          const jwt_content = await getJWTContent(user.id);
                          const token_jwt = fastify.jwt.sign(jwt_content);
                          return reply.setCookie('token', token_jwt, {
                                  httpOnly: true,
                                  secure : true,
                                  sameSite : 'none',
                                  path : '/'
                          }).send({success: true});
                    } catch (err)
                    {
                          return ({success : false, error : "db_access"});
                    }
                }
            }
        } catch(err)
        {
            console.log("probleme avec google sign in catch");
            return reply.status(500).send({success: false, error : 'unknown_error'});
        }
    } );



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
            "SELECT id, username, avatar_url, wins, last_online, created_at, losses FROM users WHERE username = ?",
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
  }
  module.exports = userRoutes;
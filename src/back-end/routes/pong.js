const { db } = require('../db.js');
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------
// --------------------------------      PONG                 --------------------------------------------
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------

const attach_socket_handler = async (socket, USER_ID, fastify, ai_game = false) =>{
    if( !socket ){
        return ;
    }
    // players inputs
    socket.on('message', (message) => {
        try {
            const msg_str = message.toString('utf8'); 
            const data = JSON.parse(msg_str);
            if(data?.type == "paddle_move")
            {
        
                // game exists?
                let _game = null;
                for (const [r, game] of fastify.p_rooms.entries()) {
                    if (Array.isArray(game.players) && game.players.includes(USER_ID)) {
                        _game = (game);
                        break;
                    }
                }
                if (!_game){ 
                    socket.send(JSON.stringify({ type: 'error', message: 'no' }));
                    return;
                }
                if(!ai_game) // multiplayer 1v1
                {
                    // user ix in dis game??
                    const ix = _game.players.indexOf(USER_ID);
                    const r = ix === 0 ? 'p1' : 'p2';
                    if (ix === -1) {
                        return;
                    }
                    // update game state...
                    //if (data.type === 'paddle_move') {
                    _game.paddles[r] += data.direction == "up" ? -4: 4;

                    // clamp 
                    if (_game.paddles[r] < 0) _game.paddles[r] = 0;
                    if (_game.paddles[r] > _game.height) _game.paddles[r] = _game.height;
                }else // AI game
                {
                    _game.paddles.p1 += data.direction == "up" ? -4: 4;

                    // clamp 
                    if (_game.paddles.p1 < 0) _game.paddles.p1 = 0;
                    if (_game.paddles.p1 > _game.height) _game.paddles.p1 = _game.height;
                }
            }
            if(data?.type == "player_giveup")
            {
    
                // game exists?
                let _game = null;
                for (const [r, game] of fastify.p_rooms.entries()) {
                    if (Array.isArray(game.players) && game.players.includes(USER_ID)) {
                        _game = (game);
                        break;
                    }
                }
                if(_game != null)
                {
                    if(ai_game){
                        handle_ai_game_end(_game, 'give-up', fastify, USER_ID);
                    }else{
                        handle_game_end(_game, "give-up", fastify, USER_ID);
                    }
                }
            }
        } catch (err) {
            console.error('Invalid message:', err);
        }
    });
}

async function pong_routes(fastify, options)
{
    // PONG DATAS
    fastify.get('/api/pong/status', {preValidation: [fastify.authenticate]}, async (request, reply) => {
        const USER__ID = request.user.id;
        let alr_in_game = false;
        let is_ai_game = false;
            
        for (const [r, game] of fastify.p_rooms.entries()) {
            if (Array.isArray(game.players) && game.players.includes(USER__ID))
            {
                console.log('IDK WHICH USER BUT ITS INSIDE A GAME ALREDY');
                alr_in_game = true;
                is_ai_game = game.id.startsWith('ai');
                break;
            }
        }
        return reply.send({ success: true, data: {
            activeRooms: fastify.p_rooms.size,
            onlinePlayers:  fastify.p_waitingPlayers.size + (fastify.p_rooms.size * 2), // or count from user sessions
            queuedPlayers:  fastify.p_waitingPlayers.size,
            joinedQueue: fastify.p_waitingPlayers.has(USER__ID) ? true : false,
            alr_in_game: (alr_in_game),
            is_ai: (is_ai_game)
        } });
    });






    // specific PONG ROOMS
    fastify.get('/api/pong/active-games', {preValidation: [fastify.authenticate]}, async (request, reply) => {
        const USER__ID = request.user.id;
        if(!USER__ID){
            return reply.status(401).send({ success: false, error: 'aunthorizsed' });
        }
        const rooms = [];
        for (const [id, game] of fastify.p_rooms.entries()) {
            if (game.isAI === true)
            {
                const player = await fastify.db.get(
                    'SELECT id, username FROM users WHERE id = ?',
                    [game.players[0]]
                );
                rooms.push({
                    id,
                    isAI: true,
                    player1: {
                    id: game.players[0],
                    username: player?.username || 'Player',
                    score: game.scores.p1
                    },
                    player2: {
                    id: 'AI_BOT',
                    username: 'AI Bot',
                    score: game.scores.p2
                    }
                });
            }
            else
            {
                // p1-p2 usernames from DB -> one query
                const players = await fastify.db.all(
                    'SELECT id, username FROM users WHERE id IN (?, ?)',
                    [game.players[0], game.players[1]]
                );
                // quick lookup
                const user_map = new Map(players.map(user => [user.id, user.username]));
                rooms.push({
                    id,
                    isAI: false, // 🔥 Add flag
                    player1: {
                        id: game.players[0],
                        username: user_map.get(game.players[0]) || `/${game.players[0]}/`,
                        score: game.scores.p1
                    },
                    player2: {
                        id: game.players[1],
                        username: user_map.get(game.players[1]) || `/${game.players[1]}/`,
                        score: game.scores.p2
                    }
                });
            }
        }
        return reply.status(200).send({ success: true, data: rooms });
    });




    


    // PONG MATCHMAKING
    fastify.get('/api/pong/ws', { websocket: true }, async (connection, req) => {
        const { p_waitingPlayers, p_rooms } = fastify;
        let USER_ID;

        // manually authenticate first
        // also parse req to find user id
        try {
            await fastify.authenticate(req);
            USER_ID = req.user.id;
        } catch (err) {
            console.log('JWT verification failed:', err.message);
            if (connection.socket && typeof connection.socket.send === 'function') {
                connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                connection.socket.close();
            } else if (connection && typeof connection.send === 'function') {
                 connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                 connection.close();
            }
            return;
        }
        // user is already in room?
        for (const [roomId, _g] of fastify.p_rooms.entries()) {
            if (Array.isArray(_g.players) && _g.players.includes(USER_ID)) {
                console.log(`JOIN-BACK: ${USER_ID} reconnected himself to pong room. ${roomId} and ehh: ${_g?.countdown}`);
                // !!! [update player's socket in p_room] !!!
                const p_index = _g.players.indexOf(USER_ID);
                if (p_index !== -1) {
                   _g.sockets[p_index] = (connection.socket); // <- important brr
                   attach_socket_handler(connection.socket, USER_ID, fastify);
                }
                // 5s join-back... state so plyr can be ready to play..
                connection.socket.send(JSON.stringify({ type: 'creating',
                    queueLength: p_waitingPlayers.size, roomsLength: p_rooms.size, 
                    is_a_comeback: _g?.countdown > 0 ? false : true,
                    countdown_v: _g?.countdown > 0 ? (_g?.countdown) : (5)
                }));
                if((_g?.countdown <= 0))
                {
                    setTimeout(() => {
                        // [join-back the game...]
                        const sf = {
                            scores: _g.scores, countdown: _g.countdown, width: _g.width, height: _g.height, 
                            paddleWidth: _g.paddleWidth, paddleHeight: _g.paddleHeight, max_score: _g.max_score, 
                            player_names: (_g.player_names),
                            player_pfps: [_g.player_pfps],
                            player_elos: [_g.player_elos]
                        };
                        connection.socket.send(JSON.stringify({ 
                            type: 'start', 
                            ehh: (sf)
                        }));
                        console.log("TELL EMMM !!!!! "  + roomId) ;
                        // connection.socket.close();
                    }, 5000); // 5sec to send back a start ping to player
                }else{
                    // connection.socket.close();
                }
                return;
            }
        }
        // user is already in queue??
        if (fastify.p_waitingPlayers.has(USER_ID)) {
            connection.socket.send(JSON.stringify({ type: 'error', message: 'already in queue' }));
            connection.socket.close();
            return ;
        }
         // add user to waiting queue
        p_waitingPlayers.set(USER_ID, connection.socket);

        console.log(`INFO: ${fastify.p_waitingPlayers.size} are in waiting queue...`);
        // 2 players -> create new game
        const waitingEntries = [...p_waitingPlayers.entries()];
        if (p_waitingPlayers.size >= 2)
        {
            // for now selecting 1st and 2nd in  queue
            // TODO: potential matchmaking w player ELO (call asyncly DB here to fetch data)
            const [p1Id, p1Socket] = waitingEntries[0];
            const [p2Id, p2Socket] = waitingEntries[1];

            p_waitingPlayers.delete(p1Id);
            p_waitingPlayers.delete(p2Id);

            const game_id = `${Date.now()}_${p1Id}_${p2Id}`;
            const c = Math.floor(Math.random() * (8 - 2 + 1)) + 2; // rand int between 8 and 2
            // p1-p2 usernames from DB -> one query
            const game = {
                id: game_id,
                players: [p1Id, p2Id],
                sockets: [p1Socket, p2Socket],
                paddles: { p1: 50, p2: 50 },
                ball: { x: 100, y: 100, vx: 3.5, vy: 3.5 },
                scores: { p1: 0, p2: 0 },
                countdown: (c), // init at 10
                width: 1200,
                height: 600,
                paddleWidth: 10,
                paddleHeight: 80,
                max_score: Math.floor(Math.random() * (75 - 10 + 1)) + 10, // score [10- 75]
                player_names: ["player_1", "player_2"],
                player_pfps: [
                    "https://avatars.githubusercontent.com/u/9919?s=200&v=4", 
                    "https://avatars.githubusercontent.com/u/9919?s=200&v=4"],
                player_elos: [
                    500, 500
                ],
                ended: false,
                interval: null
            };
            p_rooms.set(game_id, game);
            // [creating....]
            p1Socket.send(JSON.stringify({ type: 'creating', role: 'p1', 
                queueLength: p_waitingPlayers.size, roomsLength: p_rooms.size,
                is_a_comeback: false,
                countdown_v: game?.countdown
            }));
            p2Socket.send(JSON.stringify({ type: 'creating', role: 'p2',
                queueLength: p_waitingPlayers.size, roomsLength: p_rooms.size,
                is_a_comeback: false,
                countdown_v: game?.countdown
            }));
            // thats why i put coolddown/coutdown btw
            // (could gather more infos on both playrs)
            const p_names = await fastify.db.all(
                'SELECT id, elo, avatar_url, username FROM users WHERE id IN (?, ?)',
                [p1Id, p2Id]
            );
            const name_map = Object.fromEntries((p_names).map(r => [r.id, r.username]));
            game.player_names = [
                name_map[p1Id] || `/${p1Id}/`,
                name_map[p2Id] || `/${p2Id}/`
            ];

            // randomly delay the START [8-15s] after "creaing...""
            for (let i = 0; i <= c; i++) {
                setTimeout(() => {
                    const timeLeft = c - i;
                    if (timeLeft > 0) {
                        game.countdown -= 1;
                    } else {
                        const safe_game = {
                            scores: game.scores, countdown: game.countdown, width: game.width, height: game.height, 
                            paddleWidth: game.paddleWidth, paddleHeight: game.paddleHeight, max_score: game.max_score, 
                            player_names: (game.player_names),
                            player_pfps: [game.player_pfps],
                            player_elos: [game.player_elos]
                        };
                        // send start messages
                        game.sockets[0]/*p1Socket*/.send(JSON.stringify({ 
                            type: 'start', 
                            role: 'p1', 
                            ehh: safe_game}));
                        game.sockets[1]/*p2Socket*/.send(JSON.stringify({ 
                            type: 'start',
                            role: 'p2', 
                            ehh: safe_game }));

                        if (game) {
                            start_game_loop(game, fastify);
                        }
                    }
                }, (i) * 1000); // 1 sec step
            }
        }else{
            connection.socket.send(JSON.stringify({
                type: 'waiting',
                message: 'You joined the queue. Waiting for another player...',
                queueLength: p_waitingPlayers.size
            }));
        }
        // notify everyone: queue/rooms update
        for (const [_id, socket] of p_waitingPlayers.entries()) {
            if(_id !== USER_ID){
                socket.send(JSON.stringify({
                    type: 'waiting-update',
                    message: 'Queue updated',
                    queueLength: p_waitingPlayers.size,
                    roomsLength: p_rooms.size
                }));
            }
        }
        // players inputs
        attach_socket_handler(connection.socket, USER_ID, fastify);
        /* connection.socket.on('message', (message) => {
            try {
                const msg_str = message.toString('utf8'); 
                const data = JSON.parse(msg_str);
                // console.log(`Received message from user ${USER_ID}:`, data);
                if(data?.type == "paddle_move")
                {
                    // convert buffer -. string
                    // game exists?
                    let _game = null;
                    for (const [r, game] of fastify.p_rooms.entries()) {
                        if (Array.isArray(game.players) && game.players.includes(USER_ID)) {
                            _game = (game);
                            break;
                        }
                    }
                    if (!_game){ 
                        connection.socket.send(JSON.stringify({ type: 'error', message: 'no' }));
                        return;
                    }
                    // user ix in dis game??
                    const ix = _game.players.indexOf(USER_ID);
                    const r = ix === 0 ? 'p1' : 'p2';
                    if (ix === -1) {
                        return;
                    }
                    // update game state...
                    //if (data.type === 'paddle_move') {
                    _game.paddles[r] += data.direction == "up" ? -4: 4;

                    // clamp 
                    if (_game.paddles[r] < 0) _game.paddles[r] = 0;
                    if (_game.paddles[r] > _game.height) _game.paddles[r] = _game.height;
                    //}
                }
                if(data?.type == "player_giveup")
                {
        
                    // game exists?
                    let _game = null;
                    for (const [r, game] of fastify.p_rooms.entries()) {
                        if (Array.isArray(game.players) && game.players.includes(USER_ID)) {
                            _game = (game);
                            break;
                        }
                    }
                    if(_game != null)
                    {
                        handle_game_end(_game, "give-up", fastify, USER_ID);
                    }
                }
            } catch (err) {
                console.error('Invalid message:', err);
            }
        }); */
        connection.socket.on('close', () => {
            console.log('Player disconnected');
            // cleanup  waiting-queue
            if (p_waitingPlayers.has(USER_ID)) {
                p_waitingPlayers.delete(USER_ID);
            }
        });
    });





    // 🤖 PONG AI WEBSOCKET
    fastify.get('/api/pong/ai/ws', { websocket: true }, async (connection, req) => {
        const { p_rooms } = fastify;
        let USER_ID;
        
        // Auth
        try {
            await fastify.authenticate(req);
            USER_ID = req.user.id;
        } catch (err) {
            console.log('JWT verification failed:', err.message);
            if (connection.socket && typeof connection.socket.send === 'function') {
                connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                connection.socket.close();
            } else if (connection && typeof connection.send === 'function') {
                 connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                 connection.close();
            }
            return;
        }

        let existingGame = null;
        for (const [roomId, game] of p_rooms.entries()) {
            if (game.isAI && Array.isArray(game.players) && game.players[0] === USER_ID) {
                existingGame = game;
                console.log(`🔄 [AI_RECONNECT] User ${USER_ID} reconnecting to existing AI game ${roomId}`);
                break;
            }
        }
        if (existingGame) {
            existingGame.sockets[0] = connection.socket;
            console.log('✅ [AI_RECONNECT] Socket updated for existing game');
            
            const safe_game = {
                scores: existingGame.scores,
                countdown: existingGame.countdown,
                width: existingGame.width,
                height: existingGame.height,
                paddleWidth: existingGame.paddleWidth,
                paddleHeight: existingGame.paddleHeight,
                max_score: existingGame.max_score,
                player_names: existingGame.player_names
            };
            
            connection.socket.send(JSON.stringify({ 
                type: 'start', 
                role: 'p1', 
                game_id: existingGame.id,
                message: 'AI game rejoined!',
                ehh: safe_game
            }));

            attach_socket_handler(connection.socket, USER_ID, fastify, true);
            
            connection.socket.on('close', () => {
                console.log(`🔌 [AI_RECONNECT] User ${USER_ID} disconnected from AI game ${existingGame.id}`);
                // Don't delete the game, allow reconnection
            });
            return;
        }

        ///GET THE PLAYER NAME FROM THE DB
        let username = 'Player';
        try {
            const user = await fastify.db.get('SELECT username FROM users WHERE id = ?', [USER_ID]);
            username = user?.username || 'Player';
        } catch (err) {
            console.error('Failed to fetch username:', err);
        }
        // Crée une partie AI
        const game_id = `ai_${Date.now()}_${USER_ID}`;
        const AI_ID = 'AI_BOT';
        const game = {
            id: game_id,
            players: [USER_ID, AI_ID],
            sockets: [connection.socket, null],
            paddles: { p1: 50, p2: 50 },
            ball: { x: 100, y: 100, vx: 7, vy: 7 },
            scores: { p1: 0, p2: 0 },
            countdown: 0,
            width: 1200,
            height: 600,
            paddleWidth: 10,
            paddleHeight: 70,
            isAI: true,
            max_score:5,
            aiSpeed: 3,
            player_names: [username, 'AI Bot'],
            ended:false,
            interval: null,
            ai_state: {
                viewRefreshMs: 1000,
                nextRefreshTs: Date.now(),
                targetY: null,
                currentDirection: null // 'up' | 'down' | null
            }
        };
        p_rooms.set(game_id, game);
        
        const safe_game = {
            scores: game.scores,
            countdown: game.countdown,
            width: game.width,
            height: game.height,
            paddleWidth: game.paddleWidth,
            paddleHeight: game.paddleHeight,
            max_score: game.max_score,
            player_names: game.player_names
        };

        // Envoie start immédiatement
        connection.socket.send(JSON.stringify({ 
            type: 'start', 
            role: 'p1', 
            game_id,
            message: 'AI game started!',
            ehh : safe_game
        }));
        
        // game loop AI
        start_ai_game_loop(game, fastify);

        // inputs
        attach_socket_handler(connection.socket, USER_ID, fastify, true);
        
        // Cleanup
        connection.socket.on('close', () => {
            if (game.interval)
                clearInterval(game.interval);
            p_rooms.delete(game_id);
        });
    });


    fastify.get('/api/pong/local/ws', { websocket: true }, async (connection, req) => {
        const { p_rooms } = fastify;
        let USER_ID;

        try {
            await fastify.authenticate(req);
            USER_ID = req.user.id;
        } catch (err) {
            console.log('JWT verification failed:', err.message);
            if (connection.socket && typeof connection.socket.send === 'function') {
                connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                connection.socket.close();
            } else if (connection && typeof connection.send === 'function') {
                 connection.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                 connection.close();
            }
            return;
        }

        console.log(`User ${USER_ID} connected to local multiplayer game`);

        let existingGame = null;
        for (const [roomId, game] of p_rooms.entries()) {
            if (game.isLocal && Array.isArray(game.players) && game.players[0] === USER_ID) {
                existingGame = game;
                console.log(`🔄 [LOCAL_RECONNECT] User ${USER_ID} reconnecting to local game ${roomId}`);
                break;
            }
        }

        if (existingGame) {
            existingGame.sockets[0] = connection.socket;
            console.log('✅ [LOCAL_RECONNECT] Socket updated for existing game');

            const safe_game = {
                scores: existingGame.scores,
                countdown: existingGame.countdown,
                width: existingGame.width,
                height: existingGame.height,
                paddleWidth: existingGame.paddleWidth,
                paddleHeight: existingGame.paddleHeight,
                max_score: existingGame.max_score,
                player_names: existingGame.player_names
            };

            connection.socket.send(JSON.stringify({ 
                type: 'start', 
                role: 'local', 
                game_id: existingGame.id,
                message: 'Local game rejoined!',
                ehh: safe_game
            }));

            attach_local_socket_handler(connection.socket, existingGame, fastify, USER_ID);
            return;
        }

        let username = 'Player';
        try {
            const user = await fastify.db.get('SELECT username FROM users WHERE id = ?', [USER_ID]);
            username = user?.username || 'Player';
        } catch (err) {
            console.error('Failed to fetch username:', err);
        }

        const game_id = `local_${Date.now()}_${USER_ID}`;
        
        const game = {
            id: game_id,
            players: [USER_ID, `${USER_ID}_local_p2`], // Virtual second player ID
            sockets: [connection.socket, null],
            paddles: { p1: 50, p2: 50 },
            ball: { x: 100, y: 100, vx: 5, vy: 5 },
            scores: { p1: 0, p2: 0 },
            countdown: 0,
            width: 1200,
            height: 600,
            paddleWidth: 10,
            paddleHeight: 80,
            isLocal: true,
            max_score: 10,
            player_names: [`${username} (P1)`, `${username} (P2)`],
            interval: null,
            ended:false
        };
        
        p_rooms.set(game_id, game);
        
        const safe_game = {
            scores: game.scores,
            countdown: game.countdown,
            width: game.width,
            height: game.height,
            paddleWidth: game.paddleWidth,
            paddleHeight: game.paddleHeight,
            max_score: game.max_score,
            player_names: game.player_names
        };

        connection.socket.send(JSON.stringify({ 
            type: 'start', 
            role: 'local',
            game_id,
            message: 'Local multiplayer started!',
            ehh: safe_game
        }));

        start_game_loop(game, fastify);

        // player inputs (both paddles controlled by same client)
        attach_local_socket_handler(connection.socket, game, fastify, USER_ID);

        connection.socket.on('close', () => {
            console.log(`Local game ${game_id} ended`);
            if (game.interval)
                clearInterval(game.interval);
            p_rooms.delete(game_id);
        });
    });
}





module.exports = pong_routes;

function attach_local_socket_handler(socket, game, fastify, USER_ID) {
    socket.on('message', (message) => {
        try {
            const msg_str = message.toString('utf8'); 
            const data = JSON.parse(msg_str);
            
            if (data?.type == "paddle_move") {
                const player = data.player; // 'p1' or 'p2'
                const direction = data.direction; // 'up' or 'down'
                
                if (player === 'p1' || player === 'p2') {
                    game.paddles[player] += direction === "up" ? -4 : 4;
                    
                    // Clamp
                    if (game.paddles[player] < 0) game.paddles[player] = 0;
                    if (game.paddles[player] > game.height) game.paddles[player] = game.height;
                }
            }

            if (data?.type === 'player_giveup') {
                console.log('🏳️ [LOCAL] Player gave up');
                handle_local_game_end(game, 'give-up', fastify, USER_ID);
            }
        } catch (err) {
            console.error('Invalid message:', err);
        }
    });
}


const start_game_loop = (game, fastify = null) => {
    if (game.interval) {
        clearInterval(game.interval);
        game.interval = null;
    }

    const interval = setInterval(() => {
        if (game.ended) {
            clearInterval(interval);
            return;
        }

        game.ball.x += game.ball.vx;
        game.ball.y += game.ball.vy;

        if (game.ball.y <= 0 || game.ball.y >= game.height) {
            game.ball.vy *= -1;
        }

        if (game.ball.x <= 0) {
            game.scores.p2++;
        } else if (game.ball.x >= game.width) {
            game.scores.p1++;
        }

        if(game.ball.x <= 0 || game.ball.x >= game.width) {
            if(game.scores.p1 >= game.max_score || game.scores.p2 >= game.max_score) {
                if (game.isLocal) {
                    handle_local_game_end(game, "victory", fastify);
                } else {
                    handle_game_end(game, "victory", fastify);
                }
                return; 
            }
        }

        if (game.ball.x <= 0 || game.ball.x >= game.width) {
            if(Math.abs(game.ball.vx) < 3.5){
                game.ball.vx *= -1.15;
            }else{
                game.ball.vx *= -1;
            }
        }

        if (game.ball.x <= 20 + game.paddleWidth &&
            game.ball.x >= 20 - game.paddleWidth &&
            game.ball.y >= game.paddles.p1 &&
            game.ball.y <= game.paddles.p1 + game.paddleHeight) {
            game.ball.vx = Math.abs(game.ball.vx);
        }

        if (game.ball.x >= (game.width - 30) - game.paddleWidth &&
            game.ball.x <= (game.width - 30) + game.paddleWidth &&
            game.ball.y >= game.paddles.p2 &&
            game.ball.y <= game.paddles.p2 + game.paddleHeight) {
            game.ball.vx = -Math.abs(game.ball.vx);
        }

        game.sockets.forEach((socket) => {
            if (socket && socket.readyState === 1) {
                socket.send(JSON.stringify({
                    type: 'game_state',
                    ball: game.ball,
                    paddles: game.paddles,
                    scores: game.scores
                }));
            }
        });
    }, 1000 / 60);
    
    game.interval = interval;
};



// Prédiction simple avec réflexion et un léger bruit (pas de spin/overshoot)
function predictBallYAtX(game, targetX) {
    const { x, y, vx, vy } = game.ball;
    if (vx <= 0)
        return y;
    const t = (targetX - x) / vx;
    if (t < 0)
        return y;
    let rawY = y + vy * t;
    const H = game.height;
    const period = 2 * H;
    let m = ((rawY % period) + period) % period;
    let finalY = (m <= H) ? m : (period - m);

    // TWEAK THIS TO MAKE AI WORSE/BETTER
    finalY += (Math.random() * 40 - 15);
    if (finalY < 0)
        finalY = 0;
    if (finalY > H)
        finalY = H;
    return finalY;
}

function simulateAIKey(game, direction) {
    if (direction === 'up')
        game.paddles.p2 -= 4;
    else if (direction === 'down')
        game.paddles.p2 += 4;
    if (game.paddles.p2 < 0)
        game.paddles.p2 = 0;
    if (game.paddles.p2 > game.height - game.paddleHeight)
        game.paddles.p2 = game.height - game.paddleHeight;
}

// Remplacement de start_ai_game_loop 

const start_ai_game_loop = (game, fastify = null) => {
    if (game.interval) {
        clearInterval(game.interval);
        game.interval = null;
    }

    const interval = setInterval(() => {
        if (game.ended) {
            clearInterval(interval);
            return;
        }

        game.ball.x += game.ball.vx;
        game.ball.y += game.ball.vy;

        if (game.ball.y <= 0 || game.ball.y >= game.height) {
            game.ball.vy *= -1;
        }

        if (game.ball.x <= 0){
            game.scores.p2 += 1;
        } else if (game.ball.x >= game.width){
            game.scores.p1 += 1;
        }

        if (game.ball.x <= 0 || game.ball.x >= game.width) {
            if (game.scores.p1 >= game.max_score || game.scores.p2 >= game.max_score) {
                handle_ai_game_end(game, "victory", fastify);
                return;
            }
            if (Math.abs(game.ball.vx) < 3.5)
                game.ball.vx *= -1.15;
            else
                game.ball.vx *= -1;
        }

        if (
            game.ball.x <= 20 + game.paddleWidth &&
            game.ball.x >= 20 - game.paddleWidth &&
            game.ball.y >= game.paddles.p1 &&
            game.ball.y <= game.paddles.p1 + game.paddleHeight
        ) {
            game.ball.vx = Math.abs(game.ball.vx);
        }

        if (
            game.ball.x >= (game.width - 30) - game.paddleWidth &&
            game.ball.x <= (game.width - 30) + game.paddleWidth &&
            game.ball.y >= game.paddles.p2 &&
            game.ball.y <= game.paddles.p2 + game.paddleHeight
        ) {
            game.ball.vx = -Math.abs(game.ball.vx);
        }

        const now = Date.now();
        if (now >= game.ai_state.nextRefreshTs) {
            const predictedY = predictBallYAtX(game, game.width - 30);
            const targetY = Math.max(0, Math.min(predictedY - game.paddleHeight / 2, game.height - game.paddleHeight));
            game.ai_state.targetY = targetY;

            const center = game.paddles.p2 + game.paddleHeight / 2;
            game.ai_state.currentDirection =
                center > targetY + 6 ? 'up' :
                center < targetY - 6 ? 'down' :
                null;

            game.ai_state.nextRefreshTs = now + game.ai_state.viewRefreshMs;
        }

        if (game.ai_state.currentDirection) {
            const center = game.paddles.p2 + game.paddleHeight / 2;
            if (
                (game.ai_state.currentDirection === 'up' && center <= game.ai_state.targetY + 6) ||
                (game.ai_state.currentDirection === 'down' && center >= game.ai_state.targetY - 6)
            ) {
                game.ai_state.currentDirection = null;
            } else {
                simulateAIKey(game, game.ai_state.currentDirection);
            }
        }

        const socket = game.sockets[0];
        if (socket?.readyState === 1) {
            socket.send(JSON.stringify({
                type: 'game_state',
                ball: game.ball,
                paddles: game.paddles,
                scores: game.scores
            }));
        }
    }, 1000 / 60);
    
    game.interval = interval;
};


const safeCloseSocket = (socket) => {
    if (socket && socket.readyState === 1) { // WebSocket.OPEN
        try {
            socket.close();
        } catch (err) {
            console.error('Error closing socket:', err);
        }
    }
};


// game ending: 'give_up', 'victory' or 'disconnection'
const handle_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    if (!game || game?.ended) {
        return;
    }
    
    game.ended = true;
    
    if (game.interval) {
        clearInterval(game.interval);
        game.interval = null;
    }

    const { scores, max_score, players, sockets, player_names } = game;
    let winner = null;
    
    if(reason == 'victory') {
        if (scores.p1 > scores.p2) 
            winner = 'p1';
        else if (scores.p2 > scores.p1) 
            winner = 'p2';
    } else if (reason == "give-up") {
        if(user_id) {
            if (players[0] === user_id) winner = 'p2';
            else if (players[1] === user_id) winner = 'p1';
        } else {
            winner = "null";
        }
    }

    if (!sockets || !Array.isArray(sockets)) {
        console.error("error: sockets missing or invalid for game", game?.id);
        return;
    }

    sockets.forEach((socket, i) => {
        if (socket && socket.readyState === 1) {
            const d = {
                type: 'game_end',
                reason,
                scores,
                winner: winner === 'p1' ? player_names[0] : player_names[1],
                looser: (winner === 'p1' || winner == 'null') ? player_names[1] : player_names[0],
                player_names: player_names,
                you_are_winner: (i === 0 && winner === 'p1') || (i === 1 && winner === 'p2')
            };
            socket.send(JSON.stringify(d));
        }
    });

    const W_id = (winner === 'p1') ? players[0] : (winner === 'p2') ? players[1] : null;
    try {
        await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [players[0], players[1], (winner === 'p1') ? players[0] : players[1],  
             scores.p1, scores.p2,
             player_names[0], player_names[1]]
        );
        
        if (W_id) {
            await fastify.db.run(`UPDATE users SET wins = wins + 1 WHERE id = ?`, [W_id]);
            const L_id = (W_id === players[0]) ? players[1] : players[0];
            await fastify.db.run(`UPDATE users SET losses = losses + 1 WHERE id = ?`, [L_id]);
        }
    } catch (err) {
        console.error("❌ Error saving game:", err);
    }

    sockets.forEach(socket => safeCloseSocket(socket));

    if(fastify) {
        fastify?.p_rooms.delete(game.id);
    }
    
    console.log(`✅ Game ${game.id} ended (${reason}) — Winner: ${winner} — Sockets closed`);
};

const handle_ai_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    console.log('🔵 [AI_GAME_END] Function called with:', {
        game_id: game?.id,
        reason,
        user_id
    });

    if (!game || game?.ended)
        return;
    
    game.ended = true;
    
    if (game.interval) {
        clearInterval(game.interval);
        game.interval = null;
    }

    const { scores, players, sockets, player_names } = game;

    let winner = null;
    if(reason == 'victory') {
        if (scores.p1 > scores.p2) 
            winner = 'p1';
        else if (scores.p2 > scores.p1) 
            winner = 'p2';
    } else if (reason == "give-up") {
        winner = 'p2';
    }
    
    if (!sockets || !Array.isArray(sockets))
        return;

    const player_id = players[0];
    
    const socket = game.sockets[0];
    if (socket && socket.readyState === 1) {
        const d = {
            type: 'game_end',
            reason,
            scores,
            winner: winner === 'p1' ? player_names[0] : player_names[1],
            looser: winner === 'p1' ? player_names[1] : player_names[0],
            player_names: player_names,
            you_are_winner: (winner === 'p1')
        };
        socket.send(JSON.stringify(d));
    }
    
    try {
        let AI_USER_ID = -1;
        try {
            const aiUser = await fastify.db.get('SELECT id FROM users WHERE username = ?', ['AI_BOT']);
            if (aiUser) {
                AI_USER_ID = aiUser.id;
            } else {
                const result = await fastify.db.run(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    ['AI_BOT', 'no_password']
                );
                AI_USER_ID = result?.lastID;
            }
        } catch (err) {
            console.error('❌ [AI_GAME_END] Error creating/finding AI user:', err);
            AI_USER_ID = -1;
        }

        await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [players[0], AI_USER_ID, (winner === 'p1') ? 1 : 2,
             scores.p1, scores.p2,
             player_names[0], player_names[1]]
        );
        
        if (winner === 'p1')
            await fastify.db.run(`UPDATE users SET wins = wins + 1 WHERE id = ?`, [player_id]);
        else
            await fastify.db.run(`UPDATE users SET losses = losses + 1 WHERE id = ?`, [player_id]);
    } catch (err) {
        console.error("❌ [AI_GAME_END] Database error:", err);
    }
    
    safeCloseSocket(socket);
    
    if(fastify) {
        fastify?.p_rooms.delete(game.id);
    }
    
    console.log(`✅ [AI_GAME_END] AI Game ${game.id} ended (${reason}) — Winner: ${winner} — Socket closed`);
};


const handle_local_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    console.log('🔵 [LOCAL_GAME_END] Function called with:', {
        game_id: game?.id,
        reason,
        user_id
    });

    if (!game || game?.ended)
        return;

    game.ended = true;
    
    if (game.interval) {
        clearInterval(game.interval);
        game.interval = null;
    }

    const { scores, players, sockets, player_names } = game;

    let winner = null;
    if (reason === 'victory') {
        if (scores.p1 > scores.p2) 
            winner = 'p1';
        else if (scores.p2 > scores.p1) 
            winner = 'p2';
    } else if (reason === "give-up") {
        winner = null;
    }

    if (!sockets || !Array.isArray(sockets))
        return;

    const player_id = players[0];
    
    const socket = game.sockets[0];
    if (socket && socket.readyState === 1) {
        const d = {
            type: 'game_end',
            reason,
            scores,
            winner: winner === 'p1' ? player_names[0] : winner === 'p2' ? player_names[1] : 'None',
            looser: winner === 'p1' ? player_names[1] : winner === 'p2' ? player_names[0] : 'None',
            player_names: player_names,
            you_are_winner: null,
            is_local: true
        };
        socket.send(JSON.stringify(d));
    }
    
    try {
        const LOCAL_PLAYER_ID = -2;
        
        await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [player_id, LOCAL_PLAYER_ID, 
             winner === 'p1' ? 1 : winner === 'p2' ? 2 : null,
             scores.p1, scores.p2,
             player_names[0], player_names[1]]
        );

        if (winner && reason === 'victory') {
            await fastify.db.run(
                `UPDATE users SET wins = wins + 1 WHERE id = ?`, 
                [player_id]
            );
        }
    } catch (err) {
        console.error("❌ [LOCAL_GAME_END] Error saving local game:", err);
    }
    
    safeCloseSocket(socket);
    
    if (fastify) {
        fastify?.p_rooms.delete(game.id);
    }
    
    console.log(`✅ [LOCAL_GAME_END] Local Game ${game.id} ended (${reason}) — Winner: ${winner} — Socket closed`);
};
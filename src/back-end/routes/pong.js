const { db } = require('../db.js');
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------
// --------------------------------      PONG                 --------------------------------------------
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------

const attach_socket_handler = async (socket, USER_ID, fastify) =>{
    if( !socket ){
        return ;
    }
    // players inputs
    socket.on('message', (message) => {
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
            connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            connection.socket.close();
            return;
        }
        
        console.log(`User ${USER_ID} connected via WebSocket`);
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
                ]
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
            const pfp_map = Object.fromEntries((p_names).map(r => [r.id, r.avatar_url]));
            const elo_map = Object.fromEntries((p_names).map(r => [r.id, r.elo]));
            game.player_names = (p_names).map((obj) => 
                name_map[obj.id] || null
            );
            game.player_pfps = (p_names).map((obj) => 
                pfp_map[obj.id] || null
            );
            game.player_elos = (p_names).map((obj) => 
                elo_map[obj.id] || null
            );
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
        connection.socket.on('message', (message) => {
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
        });

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
            connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            connection.socket.close();
            return;
        }

        console.log(`User ${USER_ID} connected to AI game`);
        
        let existingGame = null;
        for (const [roomId, game] of p_rooms.entries()) {
            if (game.isAI && Array.isArray(game.players) && game.players[0] === USER_ID) {
                existingGame = game;
                console.log(`🔄 [AI_RECONNECT] User ${USER_ID} reconnecting to existing AI game ${roomId}`);
                break;
            }
        }

        if (existingGame) {
            // Update the socket in the existing game
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
            
            // Send start message with current game state
            connection.socket.send(JSON.stringify({ 
                type: 'start', 
                role: 'p1', 
                game_id: existingGame.id,
                message: 'AI game rejoined!',
                ehh: safe_game
            }));

            // Handle messages for rejoined game
            connection.socket.on('message', (message) => {
                try {
                    const msg_str = message.toString('utf8'); 
                    const data = JSON.parse(msg_str);
                    
                    if(data?.type == "paddle_move") {
                        existingGame.paddles.p1 += data.direction == "up" ? -4: 4;
                        if (existingGame.paddles.p1 < 0) existingGame.paddles.p1 = 0;
                        if (existingGame.paddles.p1 > existingGame.height) existingGame.paddles.p1 = existingGame.height;
                    }

                    if (data.type === 'player_giveup') {
                        console.log('🏳️ [AI_RECONNECT] Player gave up after reconnecting');
                        handle_ai_game_end(existingGame, 'give-up', fastify, USER_ID);
                    }
                } catch (err) {
                    console.error('Invalid message:', err);
                }
            });
            
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
            sockets: [connection.socket, null],  //socket null pr ai
            paddles: { p1: 50, p2: 50 },
            ball: { x: 100, y: 100, vx: 6, vy: 6 },
            scores: { p1: 0, p2: 0 },
            countdown: 0,
            width: 1200,
            height: 600,
            paddleWidth: 10,
            paddleHeight: 80,
            isAI: true, 
            max_score:10,
            aiSpeed: 3.25,   //AI SPEED
            player_names: [username, 'AI Bot']
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
        
        // Lance le game loop AI
        start_ai_game_loop(game, fastify);
        
        // Input du joueur
        connection.socket.on('message', (message) => {
            try {
                const msg_str = message.toString('utf8'); 
                const data = JSON.parse(msg_str);
                if(data?.type == "paddle_move")
                    {
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
                
                    // update game state...
                    //if (data.type === 'paddle_move') {
                    _game.paddles.p1 += data.direction == "up" ? -4: 4;
                    
                    // clamp 
                    if (_game.paddles.p1 < 0) _game.paddles.p1 = 0;
                    if (_game.paddles.p1 > _game.height) _game.paddles.p1 = _game.height;
                    //}
                }
                
                if (data.type === 'player_giveup')
                {
                    handle_ai_game_end(game, 'give-up', fastify, USER_ID);
                }
            } catch (err) {
                console.error('Invalid message:', err);
            }
        });
        
        // Cleanup
        connection.socket.on('close', () => {
            console.log(`AI game ${game_id} ended`);
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
            connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            connection.socket.close();
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
            player_names: [`${username} (P1)`, `${username} (P2)`]
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

const handle_local_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    console.log('🔵 [LOCAL_GAME_END] Function called with:', {
        game_id: game?.id,
        reason,
        user_id
    });

    if (!game)
        return;

    clearInterval(game.interval);

    const { scores, players, sockets, player_names } = game;

    let winner = null;
    if (reason === 'victory') {
        if (scores.p1 > scores.p2) 
            winner = 'p1';
        else if (scores.p2 > scores.p1) 
            winner = 'p2';
    } else if (reason === "give-up") {
        winner = null; // No winner on give-up for local
    }

    if (!sockets || !Array.isArray(sockets))
        return;

    const player_id = players[0];
    
    // Send game end message
    const socket = game.sockets[0];
    if (socket && socket.readyState === 1) {
        const d = {
            type: 'game_end',
            reason,
            scores,
            winner: winner === 'p1' ? player_names[0] : winner === 'p2' ? player_names[1] : 'None',
            looser: winner === 'p1' ? player_names[1] : winner === 'p2' ? player_names[0] : 'None',
            player_names: player_names,
            you_are_winner: null, // ot applicable for local games
            is_local: true
        };
        socket.send(JSON.stringify(d));
    }
    
    // Save to db (optional for local games)
    try {
        const LOCAL_PLAYER_ID = -2; // special ID for local player 2
        
        await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                player_id, LOCAL_PLAYER_ID, 
                winner === 'p1' ? 1 : winner === 'p2' ? 2 : null,
                scores.p1, scores.p2,
                player_names[0], player_names[1]
            ]
        );
        console.log(`✅ [LOCAL_GAME_END] Local game ${game.id} saved to DB`);

        // Update wins for the human player (only if there's a clear winner)
        if (winner && reason === 'victory') {
            await fastify.db.run(
                `UPDATE users SET wins = wins + 1 WHERE id = ?`, 
                [player_id]
            );
        }
    } catch (err) {
        console.error("❌ [LOCAL_GAME_END] Error saving local game:", err);
    }
    
    if (fastify) {
        fastify?.p_rooms.delete(game.id);
        console.log('🗑️ [LOCAL_GAME_END] Room deleted from p_rooms');
    }
    console.log(`✅ [LOCAL_GAME_END] Local Game ${game.id} ended (${reason}) — Winner: ${winner}`);
};

const start_game_loop = (game, fastify = null) =>
{
  const interval = setInterval(() => {
        // ball physics
        game.ball.x += game.ball.vx;
        game.ball.y += game.ball.vy;

        // bounce top/bottom
        if (game.ball.y <= 0 || game.ball.y >= game.height) {
            game.ball.vy *= -1;
        }

        // scores
        if (game.ball.x <= 0) {
            game.scores.p2++;
        } else if (game.ball.x >= game.width) {
            game.scores.p1++;
        }
        // detect game-ending
        if(game.ball.x <= 0 || game.ball.x >= game.width)
        {
            if(game.scores.p1 >= game.max_score 
                || game.scores.p2 >= game.max_score
            ){
                if (game.isLocal) {
                    handle_local_game_end(game, "victory", fastify);
                } else {
                    handle_game_end(game, "victory", fastify);
                }
                return; 
            }
        }

        // bounce left/right
        if (game.ball.x <= 0 || game.ball.x >= game.width) {
            if(Math.abs(game.ball.vx) < 3.5){
                game.ball.vx *= -1.15;
            }else{
                game.ball.vx *= -1;
            }
        }
        // paddle collisions
        // left paddle
        if (game.ball.x <= 20 + game.paddleWidth &&
            game.ball.x >= 20 - game.paddleWidth 
            &&
            game.ball.y >= game.paddles.p1 &&
            game.ball.y <= game.paddles.p1 + game.paddleHeight
        ){
            console.log("LEFT PADDLE HIT");
            game.ball.vx = Math.abs(game.ball.vx); // bounce right
        }
        // right paddle
        if (game.ball.x >= (game.width - 30) - game.paddleWidth &&
            game.ball.x <= (game.width - 30) + game.paddleWidth 
            &&
            game.ball.y >= game.paddles.p2 &&
            game.ball.y <= game.paddles.p2 + game.paddleHeight
            )
            {
                console.log("right PADDLE HIT:  " + game.ball.x + " vs " + (game.width - 30));
            game.ball.vx = -Math.abs(game.ball.vx); // bounce left
        }

        // broadcast game state -> both players (FIXED: handle null sockets)
        game.sockets.forEach((socket) => {
            // ✅ Check if socket exists AND is open
            if (socket && socket.readyState === 1) { // WebSocket.OPEN
                socket.send(JSON.stringify({
                        type: 'game_state',
                        ball: game.ball,
                        paddles: game.paddles,
                        scores: game.scores
                    })
                );
            }
        });
  }, 1000 / 60); // 60 FPS
  game.interval = interval;
}


const start_ai_game_loop = (game, fastify = null) => {
    const interval = setInterval(() => {
        // Ball physics
        game.ball.x += game.ball.vx;
        game.ball.y += game.ball.vy;

        // Bounce top/bottom
        if (game.ball.y <= 0 || game.ball.y >= game.height) {
            game.ball.vy *= -1;
        }

        // Human-like AI movement
        let target = game.ball.y - game.paddleHeight / 2;
        
        // Add prediction based on ball trajectory
        if (game.ball.vx > 0) { // Ball moving towards AI
            const timeToReach = (game.width - 30 - game.ball.x) / game.ball.vx;
            target = game.ball.y + (game.ball.vy * timeToReach) - game.paddleHeight / 2;
        }

        // Add reaction delay (human-like latency)
        const reactionDelay = Math.random() * 0.3 + 0.1; // 0.1-0.4 seconds
        const delayedTarget = target + (game.ball.vy * reactionDelay);

        // Imperfect tracking - sometimes overshoot or undershoot
        const errorMargin = Math.random() * 15 - 7.5; // -7.5 to +7.5 pixels
        const finalTarget = delayedTarget + errorMargin;

        // Smooth acceleration/deceleration
        const distance = finalTarget - game.paddles.p2;
        const direction = Math.sign(distance);
        const speedMultiplier = Math.min(Math.abs(distance) / 50, 1.5); // Faster when farther away
        
        game.paddles.p2 += direction * game.aiSpeed * speedMultiplier;

        // Occasional mistakes (5% chance per frame)
        if (Math.random() < 0.001) { // ~5% chance per second at 60fps
            game.paddles.p2 += (Math.random() * 60 - 30); // Sudden wrong move
        }

        // Clamp AI paddle
        if (game.paddles.p2 < 0) game.paddles.p2 = 0;
        if (game.paddles.p2 > game.height - game.paddleHeight)
            game.paddles.p2 = game.height - game.paddleHeight;

        // Score system
        if (game.ball.x <= 0) {
            game.scores.p2 += 1;
        } else if (game.ball.x >= game.width) {
            game.scores.p1 += 1;
        }

        // Game end
        if (game.ball.x <= 0 || game.ball.x >= game.width) {
            if (game.scores.p1 >= game.max_score || game.scores.p2 >= game.max_score) {
                handle_ai_game_end(game, "victory", fastify);
                return;
            }
        }

        // Bounce left/right
        if (game.ball.x <= 0 || game.ball.x >= game.width) {
            if (Math.abs(game.ball.vx) < 3.5)
                game.ball.vx *= -1.15;
            else
                game.ball.vx *= -1;
        }

        // Paddle collisions
        // Left paddle (player)
        if (
            game.ball.x <= 20 + game.paddleWidth &&
            game.ball.x >= 20 - game.paddleWidth &&
            game.ball.y >= game.paddles.p1 &&
            game.ball.y <= game.paddles.p1 + game.paddleHeight
        ) {
            game.ball.vx = Math.abs(game.ball.vx);
        }

        // Right paddle (AI) - with occasional misses
        const shouldMiss = Math.random() < 0.02; // 2% chance to miss an easy ball
        if (
            !shouldMiss &&
            game.ball.x >= (game.width - 30) - game.paddleWidth &&
            game.ball.x <= (game.width - 30) + game.paddleWidth &&
            game.ball.y >= game.paddles.p2 &&
            game.ball.y <= game.paddles.p2 + game.paddleHeight
        ) {
            game.ball.vx = -Math.abs(game.ball.vx);
            const angleVariation = (Math.random() * 0.4 - 0.2); // -0.2 to +0.2
            game.ball.vy += angleVariation;
        }

        // Broadcast game state to player
        const socket = game.sockets[0];
        if (socket?.readyState === 1) {
            socket.send(JSON.stringify({
                type: 'game_state',
                ball: game.ball,
                paddles: game.paddles,
                scores: game.scores
            }));
        }
    }, 1000 / 60); // 60 FPS

    game.interval = interval;
};


// game ending: 'give_up', 'victory' or 'disconnection'
const handle_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    if (!game) 
    {
        return;
    }

    clearInterval(game.interval);

    const { scores, max_score, players, sockets, player_names } = game;

    let winner = null;
    if(reason == 'victory')
    {
        if (scores.p1 > scores.p2) 
            winner = 'p1';
        else if (scores.p2 > scores.p1) 
            winner = 'p2';
    }else if (reason == "give-up")
    {
        if(user_id)
        {
            // which player gave up
            if (players[0] === user_id) winner = 'p2';
            else if (players[1] === user_id) winner = 'p1';
        }else
            winner = "null";
    }

    // safety ahhhh
    if (!sockets || !Array.isArray(sockets)) {
        console.error("errd: sockets missing or invalid for game", game?.id);
        return;
    }

    //write to DB ---
    const W_id = (winner === 'p1') ?  
        players[0] 
        :
        (winner === 'p2') ?  players[1] : null;
    try {
        await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [   players[0],  players[1], (winner === 'p1') ? 1 : 2,  
                scores.p1,  scores.p2,
                player_names[0], player_names[1]
            ]
        );
        console.log(`game ${game.id} saved to DB`);

        // --- update users (wins/losses) ---
        if (W_id){
            await fastify.db.run(`UPDATE users SET wins = wins + 1 WHERE id = ?`, [W_id]);
            const L_id = (W_id === players[0]) ? players[1] : players[0];
            await fastify.db.run(`UPDATE users SET losses = losses + 1 WHERE id = ?`, [L_id]);
        }
    } catch (err) {
        console.error("❌ Error saving game:", err);
    }



    sockets.forEach((socket, i) => {
        if (socket.readyState === 1) {
            const p_key = i === 0 ? 'p1' : 'p2';
            const d = {
                type: 'game_end',
                reason, // so, : eerm victory, give-up
                scores,
                winner: winner === 'p1' ? (player_names[0]) : player_names[1],
                looser: (winner === 'p1' || winner == 'null') ? (player_names[1]) : player_names[0],
                player_names: (player_names),
                you_are_winner: (winner === p_key)
            };
            socket.send(JSON.stringify(d));
        }
    });

    if(fastify){
        fastify?.p_rooms.delete(game.id);
    }
    console.log(`Game ${game.id} ended (${reason}) — Winner: ${winner}`);
}

const handle_ai_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    console.log('🔵 [AI_GAME_END] Function called with:', {
        game_id: game?.id,
        reason,
        user_id,
        has_fastify: !!fastify
    });

    if (!game)
        return;

    clearInterval(game.interval);

    const { scores, max_score, players, sockets, player_names } = game

    let winner = null;
    if(reason == 'victory')
    {
        if (scores.p1 > scores.p2) 
            winner = 'p1';
        else if (scores.p2 > scores.p1) 
            winner = 'p2';
    }
    else if (reason == "give-up")
        winner = 'p2';
    if (!sockets || !Array.isArray(sockets))
        return;

    const player_id = players[0];
    
    // --- WEBSOCKET NOTIFICATION (AVANT LA DB) ---
    const socket = game.sockets[0];
    // Envoyer le message AVANT que le socket se ferme
    if (socket && socket.readyState === 1)
    {
        const d = {
            type: 'game_end',
            reason,
            scores,
            winner: winner === 'p1' ? (player_names[0]) : player_names[1],
            looser: winner === 'p1' ? (player_names[1]) : player_names[0],
            player_names: (player_names),
            you_are_winner: (winner === 'p1')
        };
        socket.send(JSON.stringify(d));
    } else {
        console.error('❌ [AI_GAME_END] Cannot send message - socket not ready (state:', socket?.readyState, ')');
    }
    
    // --- DATABASE OPERATIONS ---
    try {
        console.log('💾 [AI_GAME_END] Starting DB operations...');
        
        // ✅ FIXED: Create AI user without email field
        let AI_USER_ID = -1; // ID spécial pour l'AI
        try {
            const aiUser = await fastify.db.get('SELECT id FROM users WHERE username = ?', ['AI_BOT']);
            if (aiUser) {
                AI_USER_ID = aiUser.id;
            } else {
                // Créer l'utilisateur AI (WITHOUT EMAIL - adjust based on your schema)
                const result = await fastify.db.run(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    ['AI_BOT', 'no_password']
                );
                AI_USER_ID = result.lastID;
                console.log('✅ [AI_GAME_END] AI user created with ID:', AI_USER_ID);
            }
        } catch (err) {
            console.error('❌ [AI_GAME_END] Error creating/finding AI user:', err);
            // If AI user creation fails, use -1 as fallback
            AI_USER_ID = -1;
        }

        const insertResult = await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [   players[0],  AI_USER_ID, (winner === 'p1') ? 1 : 2,
                scores.p1,  scores.p2,
                player_names[0], player_names[1]
            ]
        );
        console.log(`✅ [AI_GAME_END] AI game ${game.id} saved to DB`);

        // Update wins/losses SEULEMENT pour le joueur humain
        if (winner === 'p1')
            await fastify.db.run(`UPDATE users SET wins = wins + 1 WHERE id = ?`, [player_id]);
        else
            await fastify.db.run(`UPDATE users SET losses = losses + 1 WHERE id = ?`, [player_id]);
    } catch (err) {
        console.error("❌ [AI_GAME_END] Error saving AI game:", err);
    }
    
    // --- CLEANUP ---
    if(fastify){
        fastify?.p_rooms.delete(game.id);
        console.log('🗑️ [AI_GAME_END] Room deleted from p_rooms');
    }
    console.log(`✅ [AI_GAME_END] AI Game ${game.id} ended (${reason}) — Winner: ${winner}`);
}


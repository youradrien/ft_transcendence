const { db } = require('../db.js');
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------
// --------------------------------      PONG                 --------------------------------------------
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------

async function pong_routes(fastify, options)
{
    // PONG DATAS
    fastify.get('/api/pong/status', {preValidation: [fastify.authenticate]}, async (request, reply) => {
        const USER__ID = request.user.id;
        let alr_in_game = false;
            
        for (const [r, game] of fastify.p_rooms.entries()) {
            if (Array.isArray(game.players) && game.players.includes(USER__ID)) {
                alr_in_game = true;
                break;
            }
        }

        return reply.send({ success: true, data: {
            activeRooms: fastify.p_rooms.size,
            onlinePlayers:  fastify.p_waitingPlayers.size + (fastify.p_rooms.size * 2), // or count from user sessions
            queuedPlayers:  fastify.p_waitingPlayers.size,
            joinedQueue: fastify.p_waitingPlayers.has(USER__ID) ? true : false,
            alr_in_game: (alr_in_game)
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
            // p1-p2 usernames from DB -> one query
            const players = await fastify.db.all(
                'SELECT id, username FROM users WHERE id IN (?, ?)',
                [game.players[0], game.players[1]]
            );
            // quick lookup
            const user_map = new Map(players.map(user => [user.id, user.username]));
            rooms.push({id,
            player1: {
                id: game.players[0],
                username: user_map.get(game.players[0]) || `/${game.players[0]}/`,
                score: game.scores.p1
            },
            player2: {
                id: game.players[1],
                username: user_map.get(game.players[1]) || `/${game.players[0]}/`,
                score: game.scores.p2
            }
            });
        }
        return reply.status(200).send({ success: true, data:
                rooms
        });
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
            // if (players.includes(USER_ID)) {
            if (Array.isArray(_g.players) && _g.players.includes(USER_ID)) {
                console.log(`JOIN-BACK: ${USER_ID} reconnected himself to pong room. ${roomId} and ehh: ${_g?.countdown}`);
                // update player's socket in p_room
                const p_index = _g.players.indexOf(USER_ID);
                if (p_index !== -1) {
                   _g.sockets[p_index] = (connection.socket); // <- important brr
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
                        connection.socket.send(JSON.stringify({ type: 'start', roomId}));
                        console.log("TELL EMMM !!!!! "  + roomId) ;
                        // connection.socket.close();
                        // start_game_loop(_g);
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
            const c = Math.floor(Math.random() * (15 - 6 + 1)) + 6; // rand int between 6 and 15
            const game = {
                id: game_id,
                players: [p1Id, p2Id],
                sockets: [p1Socket, p2Socket],
                paddles: { p1: 50, p2: 50 },
                ball: { x: 100, y: 100, vx: 2, vy: 2 },
                scores: { p1: 0, p2: 0 },
                countdown: (c), // init at 10
                width: 800,
                height: 600,
                paddleWidth: 10,
                paddleHeight: 80
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

            // randomly delay the START [8-15s] after "creaing...""
            for (let i = 0; i <= c; i++) {
                setTimeout(() => {
                    const timeLeft = c - i;
                    if (timeLeft > 0) {
                        game.countdown -= 1;
                    } else {
                        // send start messages
                        p1Socket.send(JSON.stringify({ type: 'start', role: 'p1', game_id }));
                        p2Socket.send(JSON.stringify({ type: 'start', role: 'p2', game_id }));

                        if (game) {
                            start_game_loop(game);
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
                // convert buffer -. string
                const msg_str = message.toString('utf8'); 
                const data = JSON.parse(msg_str);
                if(data?.type !== "paddle_move")
                    return ;
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
                if (data.type === 'paddle_move') {
                    _game.paddles[r] += data.direction == "up" ? -2: 2;

                    // clamp 
                    if (_game.paddles[r] < 0) _game.paddles[r] = 0;
                    if (_game.paddles[r] > _game.height) _game.paddles[r] = _game.height;
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
}
module.exports = pong_routes;

const start_game_loop = (game) =>
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

        // bounce left/right
        if (game.ball.x <= 0 || game.ball.x >= game.width) {
            game.ball.vx *= -1;
        }
        // paddle collisions
        // left paddle
        if (game.ball.x >= 20 + game.paddleWidth &&
            game.ball.x <= 20 - game.paddleWidth &&
            game.ball.y >= game.paddles.p2 &&
            game.ball.y <= game.paddles.p2 + game.paddleHeight
        ){
            game.ball.vx = Math.abs(game.ball.vx); // bounce right
        }
        // right paddle
        if (game.ball.x >= (game.width - 30) - game.paddleWidth &&
            game.ball.x >= (game.width - 30) + game.paddleWidth &&
            game.ball.y >= game.paddles.p1 &&
            game.ball.y <= game.paddles.p1 + game.paddleHeight) {
            game.ball.vx = -Math.abs(game.ball.vx); // bounce left
        }


        // broadcast game state -> both players
        game.sockets.forEach((socket) => {
            if (socket.readyState === 1) { // WebSocket.OPEN
                // console.log("blasting shit" + game.ball);
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


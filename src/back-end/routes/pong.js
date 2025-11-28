const { db } = require('../db.js');
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------
// --------------------------------      PONG                 --------------------------------------------
// -------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------
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



// [TOURNAMENT - SOCKETS BROADCAST]
const broadcast_tournament = async (fastify, payload = {} /*peut etre <USER_ID> pour self-send letat du tournament et opti mais flemme */) => {
    const t = fastify.p_tournament;

    // pre-built (non-user specific) state
    const base = {
        type: 'tournament-update',
        tournament: {
            active: t.active,
            players: t.players,
            bracket: t.bracket,
            bracket_results: t.bracket_results,
            current_bracket: t.current_bracket,
            current_match: t.current_match,
            tournament_prize: t.prize,
            tournament_status: t.status,
            players_status: t.players_status,
            matches_done: t.matches_done
        },
        ...payload, // event-specific extra data
    };
    for (const [_id, s] of t.player_sockets.entries()) {
        if (s.readyState === 1) {

            const _registered = t.players.some(p => p.userId === _id);

            const personalized = {
                ...base,
                self_registered: _registered
            };
            // console.log("sending: " + personalized);
            s.send(JSON.stringify(personalized));
        }
    }
}

// [TOURNAMENT - ENDING]
const t_ending = async (fastify) => {

}




// [TOURNAMENT - NEXT MATCH]
const t_run_next_match = async (fastify) => {
    // eh
    const t = fastify.p_tournament;
    const { p_waitingPlayers, p_rooms } = fastify;

    const match = t.bracket[ t.current_bracket ][ t.current_match ];
    const e = [4, 2, 1];
    if (!match || !t.active || t.status != "in-progress" 
        || ( t.current_match > e[t.current_bracket]) ) {
        console.log("COULDNT START A MATCH ! ?  BRACKET:" 
            + t.current_bracket + "   t_status:" + t.status
            + "   t_current_match: " + t.current_match
            + "   e[t.current_bracket]: " + e[t.current_match]  
        );
        return;
    }

    // i
    const ix = t.current_match * (t.current_bracket == 0 ? 2 : 1);
    const [p1, p2] = [ 
        t.bracket[ t.current_bracket ][ix ],
        t.bracket[ t.current_bracket ][ ix + 1 ]  
    ];
    if (!p1 || !p2) {
        console.warn(`Skipping match ${t.current_match}: invalid players`, p1, p2);
        return;
    }
    const [p1_index, p2_index] = [
        t.players.findIndex(pl => pl.userId === p1.userId),
        t.players.findIndex(pl => pl.userId === p2.userId)
    ];
    console.log("MATCH["+ t.current_match + "]:  " + p1.username +  "  VS  "  +  p2.username);
    const tc = t.current_match;
    // fake bot vs bot
    if(p1.is_bot && p2.is_bot)
    {
                    t.players[p1_index].status = "in_match";
                    t.players[p2_index].status  = "in_match";
                    broadcast_tournament(fastify, {
                        event: './'
                    });

                    const delay = Math.floor(Math.random() * 4000) + 1400;
                    // async delay
                    setTimeout(() => {
                        // Random winner
                        const winner = Math.random() < 0.5 ? p1 : p2;
                        const loser  = winner === p1 ? p2 : p1;

                        const max_score = 45;
                        const W_score = max_score;
                        const L_score = Math.floor(Math.random() * (max_score - 3)) + 3; // keep it believable

                        const br = t.current_bracket;
                        t.matches_done[br] += 1;
                        t_detect_next_bracket(fastify);

                        const bucket_names = ["quarter", "semi_finals", "final"];
                        console.log("bracket_res [" + bucket_names[br] + "]  ["+  t.current_match + "]"); 
                        t.bracket_results[bucket_names[br]][tc] = {
                            winner: winner.userId,
                            loser: loser.userId,
                            scores: [W_score, L_score], // Optional format
                            is_bot_match: true
                        };

                        // t.game_states[br][idx] = {
                        //     type: "bot-simulated",
                        // };
                        // playerz statuses
                        t.players[p1_index].status = "waiting";  
                        t.players[p2_index].status  = "eliminated";

                        broadcast_tournament(fastify, {
                            event: './'
                        });
                    },(delay) );

    }else
    {
        // plyr vs ai
        if(p1.is_bot || p2.is_bot)
        {
                    console.log("PVE GAME:   P1:" + t.players[p1_index].username + "    P2: " + t.players[p2_index].username);
                    t.players[p1_index].status = "in_match";
                    t.players[p2_index].status  = "in_match";
                    const user_player = [p1, p2].find((e) => e.is_bot == false);
                    const bot_player = [p1, p2].find((e) => e.is_bot == true);

                    console.log(user_player?.username);
                    ///GET THE PLAYER NAME FROM THE DB
                    let username = 'Player';
                    // try {
                    //     const user = await fastify.db.get('SELECT username FROM users WHERE id = ?', [user_player?.userId]);
                    //     username = user?.username || 'Player';
                    // } catch (err) {
                    //     console.error('Failed to fetch username:', err);
                    // }
                    // partie AI
                    const game_id = `ai_${Date.now()}_${user_player?.userId}`;
                    const AI_ID = 'AI_BOT';
                    const user_socket = t.player_sockets.get(user_player?.userId);
                    const game = {
                        id: game_id,
                        players: [user_player?.userId, bot_player?.userId],
                        sockets: [user_socket, null],
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
                        player_pfps: [
                            "https://avatars.githubusercontent.com/u/9919?s=200&v=4", 
                            "https://avatars.githubusercontent.com/u/9919?s=200&v=4"],
                        ended:false,
                        ai_state: {
                            viewRefreshMs: 1000,
                            nextRefreshTs: Date.now(),
                            targetY: null,
                            currentDirection: null // 'up' | 'down' | null
                        },
                        TOURNAMENT_GAME: true,
                        p1_index_in_t: (p1_index),
                        p2_index_in_t: (p2_index),
                        TC: (tc)
                    };

                    try {
                            // const p_names = await fastify.db.all(
                            //     'SELECT id, elo, avatar_url, username FROM users WHERE id IN (?, ?)',
                            //     [p1Id, p2Id]
                            // );
                            // const map = {};
                            // for (const row of p_names) map[row.id] = row;
                            if(p1.pfp || p2.pfp){
                                game.player_pfps = [
                                    p1.pfp,
                                    "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Aidan",
                                ];
                            }
                        
                            if(p1.username || p2.username)
                            {
                                game.player_names = [
                                        p1.username,
                                        p2.username,
                                ];
                            }
                    
                    } catch (error) {
                        console.log("db querries err: " + error);
                    }
                    p_rooms.set(game_id, game);
                    const safe_game = {
                        scores: game.scores,
                        countdown: game.countdown,
                        width: game.width,
                        height: game.height,
                        paddleWidth: game.paddleWidth,
                        paddleHeight: game.paddleHeight,
                        max_score: game.max_score,
                        player_names: game.player_names,
                        player_pfps: [game.player_pfps],
                    };
                    (user_socket)
                        .send(JSON.stringify({ 
                            type: 'tournament_match_start',
                            ehh: safe_game 
                        }));
                    // game loop AI
                    start_ai_game_loop(game, fastify);

                    // inputs
                    attach_socket_handler(
                        user_socket, 
                        user_player?.userId, fastify, true);
                    // Cleanup
                    user_socket?.on('close', () => {
                        // if (game.interval)
                        //     clearInterval(game.interval);
                        // p_rooms.delete(game_id);
                    });
        }
        // pvp
        else
        {
            try {
                    t.players[p1_index].status = "in_match";
                    t.players[p2_index].status  = "in_match";
                    const p1Socket = t.player_sockets.get(p1.userId), p2Socket = t.player_sockets.get(p2.userId);
                    const p1Id = p1.userId, p2Id = p2.userId;
                    const game_id = `${Date.now()}_${p1Id}_${p2Id}`;
                    // p1-p2 usernames from DB -> one query
                    const game = {
                        id: game_id,
                        players: [p1Id, p2Id],
                        sockets: [p1Socket, p2Socket],
                        paddles: { p1: 50, p2: 50 },
                        ball: { x: 100, y: 100, vx: 3.5, vy: 3.5 },
                        scores: { p1: 0, p2: 0 },
                        countdown: (Math.floor(Math.random() * (8 - 2 + 1)) + 2), // init at 10
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
                        TOURNAMENT_GAME: true,
                        p1_index_in_t: (p1_index),
                        p2_index_in_t: (p2_index),
                        TC: (tc)
                    };

                    try {
                            // const p_names = await fastify.db.all(
                            //     'SELECT id, elo, avatar_url, username FROM users WHERE id IN (?, ?)',
                            //     [p1Id, p2Id]
                            // );
                            // const map = {};
                            // for (const row of p_names) map[row.id] = row;
                            if(p1.pfp || p2.pfp){
                                game.player_pfps = [
                                    p1.pfp,
                                    p2.pfp,
                                ];
                            }
                        
                            if(p1.username || p2.username)
                            {
                                game.player_names = [
                                        p1.username,
                                        p2.username,
                                ];
                            }
                    
                    } catch (error) {
                        console.log("db querries err: " + error);
                    }
                    p_rooms.set(game_id, game);

                    const safe_game = {
                        scores: game.scores, countdown: game.countdown, width: game.width, height: game.height, 
                        paddleWidth: game.paddleWidth, paddleHeight: game.paddleHeight, max_score: game.max_score, 
                        player_names: (game.player_names),
                        player_pfps: [game.player_pfps],
                        player_elos: [game.player_elos]
                    };
                    // send start messages
                    p1Socket.send(JSON.stringify({ 
                        type: 'tournament_match_start', 
                        ehh: safe_game}));
                    p2Socket.send(JSON.stringify({ 
                        type: 'tournament_match_start',
                        ehh: safe_game }));

                    if (game) {
                        setTimeout(() => {
                            start_game_loop(game, fastify);
                        }, (100))

                        // // players inputs
                    }
                    attach_socket_handler(p2Socket, p2Id, fastify);
                    attach_socket_handler(p1Socket, p1Id, fastify);

                    } catch (error) {
                        console.log("MATCH "+ t.current_match + " err: " + error);
                    }
           
        }
    }

    // update curr match
    t.current_match++;
    broadcast_tournament(fastify, {
        event: './'
    });

    // ! 
    if(t.current_bracket != 2){
        // t_run_next_match(fastify); <--- moved in the handler cuh
    }
}


// [TOURNAMENT - MOVE TO NEXT BRACKET]
const t_detect_next_bracket = async (fastify) => {
    const t = fastify.p_tournament;

    // move to next bracket
    const f = [4, 2, 1];
    const br = t.current_bracket;
    console.log("DETECTING NEXT-BRACKET:  " + t.matches_done[br] + "  vs   " +  f[t.current_bracket]);
    if(t.matches_done[br] >= f[t.current_bracket]) {
        if(t.current_bracket == 2)
        {
            console.log("TOURNAMENT ENDING !!");
            t_ending(fastify);
            return ;
        }
        console.log("SWITCH TO BRACKET: " + (br + 1));
        /*const alive = t.players.filter(p => p.status !== "eliminated");
        alive.sort(() => Math.random() - 0.5);
        if(t.current_bracket == 0)
        {
            t.bracket[1] = [
                alive[0], alive[1],
                alive[2], alive[3]
            ];
        }*/
        // perv br name
        const prev = t.current_bracket === 0 ? "quarter" : "semi_finals";
        //  previous bracket
        const prev_winnerz = t.bracket_results[prev]
            .filter(r => r && r.winner != null) // remove nulls
            .map(r => t.players.find(p => p.userId === r.winner));
        console.log("PREV_WINNERS: " + prev_winnerz.length);
        let semi_final = false;
        if (t.current_bracket === 0) { // semi-finals
            // if (prev_winnerz.length !== 4)   return;
            t.bracket[1] = [
                prev_winnerz[0], prev_winnerz[1],
                prev_winnerz[2], prev_winnerz[3]
            ];
            semi_final = (true);
        }
        if (t.current_bracket === 1) { // final
            // if (prev_winnerz.length !== 2)  return;
            t.bracket[2] = [
                prev_winnerz[0], prev_winnerz[1]
            ];
        }

        t.current_bracket++;
        // reset
        t.current_match = (0);
        broadcast_tournament(fastify, {
            event: './'
        });

        // // RUN NEXT MATCHES !!
        // (loop was impossible to debug)
        console.log("SEMI-FINALE:  " + semi_final);
        if(semi_final)
        {
            setTimeout(() => {
                t_run_next_match(fastify);
                t_run_next_match(fastify);                        
            }, (3000));
    
        }else{
            setTimeout(() => {
                t_run_next_match(fastify);
            }, (500000));
        }
        // for(let i = 0; i < (semi_final == true) ? 2 :1 ; i++){
        //     t_run_next_match(fastify);
        // } 
        return ;
    }
}



// [TOURNAMENT - START]
const handle_tournament_start = async (fastify) => {
    const t = fastify.p_tournament;

    if(!t || t.status == "in-progress" || t.players.length != 8)
    {
        console.log("COULDNT START !!!");
        return ;
    }
    // change player orders
    // separate
    const   humans = t.players.filter(p => !p.is_bot),
            bots   = t.players.filter(p => p.is_bot);
    // shuffle
    const r = arr => arr.sort(() => Math.random() - 0.5);
    r(humans);
    r(bots);
    let pairs = [];
    // human vs human
    while (humans.length >= 2) {
        pairs.push([humans.pop(), humans.pop()]);
    }
    // bot vs bot
    while (bots.length >= 2) {
        pairs.push([bots.pop(), bots.pop()]);
    }
    // leftovers (mixed unavoidable)
    const l = [...humans, ...bots];
    while (l.length >= 2) {
        pairs.push([l.pop(), l.pop()]);
    }
    //  fill bracket
    t.bracket[0] = pairs.flat();
    // // fill qf-bracket
    // t.players = (shuffled); 
    /*
    const shuffled = [...t.players].sort(() => Math.random() - 0.5);
    t.bracket[0] = [
        shuffled[0], shuffled[1],    shuffled[2], shuffled[3],
        shuffled[4], shuffled[5],    shuffled[6], shuffled[7]
    ];
    */
    t.status = "in-progress";
    t.current_bracket = 0;
    broadcast_tournament(fastify, {
        event: 'tournament-start'
    });

    // 1st match
    for(let i = 0; i < 4; i++){
        t_run_next_match(fastify);
    }
}






// [TOURNAMENT - REGISTRATION]
const handle_tournament_registration = async (USER_ID, fastify, bot_registration = false, p_username = null)  => {
    const t = fastify.p_tournament;

    if ( !t || !(t.status == "preparing" || t.status == "inactive") 
        || t.players.length == 8
    )
    {
        // socket.send(JSON.stringify({
        //     type: "cant_join"
        // }));
        return ; 
    }
    // start new tournament if noneactive
    // reset bracket & results
    if (!t.active) {
        t.active = true;
        t.players = [];
        // t.players_status = [];

        t.current_bracket = 0;
        t.currentMatch = 0;

        t.bracket = [
            [null, null, null, null,    null, null, null, null], // quarterfinals 
            [null, null,   null, null], // semi-finals
            [null, null] // final
        ];
        t.results = {
            quarter:  [null, null, null, null],
            semi:     [null, null],
            final:    null
        };
        t.prize =  Math.floor(Math.random() * (2500 - 800 + 100)) + 800; // rand int between 8 and 2
        t.status = "preparing";
    }

    if(bot_registration)
    {
        let p = ["GUNDILL", "KENNY", "CARTMAN", "ABOUDA", "THOMAS", "ENZO", "JULES", "GAUTHIER", "HUGO", "kingVon", "lil_kirk"];
        let pfps = [
            'https://api.dicebear.com/9.x/bottts/svg?seed=Sara',
            'https://api.dicebear.com/9.x/bottts/svg?seed=Nolan',
            'https://api.dicebear.com/9.x/bottts/svg?seed=Emery',
            'https://api.dicebear.com/9.x/bottts/svg?seed=Mackenzie',
            'https://api.dicebear.com/9.x/bottts/svg?seed=George'
        ]
        const bot_info = {
            userId: 'bot_id_' + t.players?.length,
            username: 'BOT_' + t.players?.length,
            pfp: pfps[Math.floor(Math.random() * pfps.length)],
            elo: Math.floor(Math.random() * (5000 - 600 + 1)) + 600, // this one is fine
            tournament_pseudo: p[Math.floor(Math.random() * p.length)],
            is_bot: true,
            status: "waiting"
        };
        // t.players_status[t.players?.length] = "waiting";
        t.bracket[0][t.players?.length] =  (bot_info);
        t.players.push(bot_info);
        broadcast_tournament(fastify, {
             event: 'player-joined'
        });
        if (t.players.length === 8) {
            handle_tournament_start(fastify);
        }
        return ;
    }


    // alr registered?
    if (t.players.find(p => p.userId === USER_ID))
    {
        // return sendToUSER(USER_ID, fastify, {
        //     type: 'already-registered',
        //     playerCount: t.players.length
        // });
        return ;
    }

    // quick db fetch
    const row = await fastify.db.get(
        `SELECT username, avatar_url, elo FROM users WHERE id = ?`, 
        [USER_ID]
    );
    let n = p_username;
    if(n == null){
        n = `PLAYER_${t.players?.length}`;
    }
    const player_info = {
        userId: USER_ID,
        username: row.username,
        pfp: row.avatar_url,
        elo: row.elo,
        tournament_pseudo: (n),
        is_bot: false,
        status: "waiting"
    };
    // t.players_status[t.players?.length] = "waiting";
    t.bracket[0][t.players?.length] =  (player_info);
    t.players.push(player_info);
    
    broadcast_tournament(fastify, {
        event: 'player-joined',
        player: player_info
    });

    // start tournament when 8/8 reached
    if (t.players.length === 8) {
       handle_tournament_start(fastify);
    }
}





// [TOURNAMENT - FORCE-START]
const tournament_force_start = async (USER_ID, fastify, socket) => {
    const t = fastify.p_tournament;

    console.log("FORCESTART :" +   USER_ID);
    // make sure user is apart from the tournament
    const b = t.players.find(p => p.userId === USER_ID);
    if ( !b || !t.active || t.status != "preparing"
        || t.players.length == 8 || t.players.length == 0
        || t.force_starting
    )
    {
        console.log("FORCE-START: failed ! ! ! ! ");
        socket.send(JSON.stringify({ type: "failed"  }));
        return ;
    }
    // quick db fetch
    const row = await fastify.db.get(
        `SELECT username, elo FROM users WHERE id = ?`, 
        [USER_ID]
    );
    if(!t.prize || row.elo < (t.prize / 4))
    {
        console.log("TOO POOR:   " + (t.prize / 4 )+"  vs  " + row.elo );
        // lol
        socket.send(JSON.stringify({
            type: "too_poor"
        }));
        return ;
    }
    let i = t.players.length;
    const delay = ms => new Promise(r => setTimeout(r, ms));
    t.force_starting = (true);
    while(i < 8){
        // register bots
        handle_tournament_registration(USER_ID, fastify, true);
        console.log("ADD BOT: " + i);
        i++;
        await delay(300);
    }

};


let AI_USER_ID = null;





const attach_socket_handler = async (socket, USER_ID, fastify, ai_game = false) =>{
    if( !socket ){
        return ;
    }

    if (socket.__handler_attached) {
        console.log("SKIPPING: handler already attached for socket", USER_ID);

        // prevent duplication on messages
        socket.removeAllListeners('message');
        //return;
    }
    socket.__handler_attached = true;


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
                ended: false
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

        for (const [roomId, _g] of fastify.p_rooms.entries()) {
            if (Array.isArray(_g.players) && _g.players.includes(USER_ID) && !_g.isAI)
            {
                // !!! [update player's socket in p_room] !!!
                if (_g.players.indexOf(USER_ID) !== -1) {
                    connection.socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                    connection.socket.close();
                    return ;
                }
            }
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
            ball: { x: 100, y: 100, vx: 7, vy: 7 },
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



    // PONG TOURNAMENT
    fastify.get('/api/pong/tournament/ws', { websocket: true }, async (connection, req) => {
        const t = fastify.p_tournament;
        let USER_ID;
        // auth
        try {
            await fastify.authenticate(req);
            USER_ID = req.user.id;
        } catch {
            connection.socket.send(JSON.stringify({ type: 'error', msg: 'Unauthorized' }));
            return connection.socket.close();
        }


        // [store/update] socket reference
        t.player_sockets.set(USER_ID, connection.socket);


        // const alr_set = t.player_sockets.has(USER_ID);
        // if (!alr_set || 1 === 1) // flemme dopti enfzite
        // {
        //     broadcast_tournament(fastify, {
        //         event: 'player-socket',
        //         id: USER_ID
        //     });
        // }else{
        
        //     connection.socket.send(
        //         JSON.stringify(t)
        //     );
        // }
        // CLOSE OLD SOCKET IF EXISTS
        const old = t.player_sockets.get(USER_ID);
        if (old && old !== connection.socket) {
            try { old.close(); } catch {}
        }

        // store new socket
        const is_new = !t.player_sockets.has(USER_ID);
        t.player_sockets.set(USER_ID, connection.socket);

        if (is_new) {
            broadcast_tournament(fastify, {
                event: 'player-socket',
                id: USER_ID
            });
        } else {
            // connection.socket.send(JSON.stringify(t));
            broadcast_tournament(fastify, {
                event: 'player-socket',
                id: USER_ID
            });
        }
        // t.conn_socket = (connection.socket);

        // incoming messages
        connection.socket.on('message', async (m) => {
            const data = JSON.parse(m);

            if (data.type === 'register') { // register
                await handle_tournament_registration(USER_ID, fastify, false, data?.username || null);
            }
            if (data.type === 'force_start') { // force_start
                await tournament_force_start(USER_ID, fastify, connection.socket);
            }
        });

        // bind-disconnection
        // cleanup
        connection.socket.on('close', () => {
            const sock = t.player_sockets.get(USER_ID);
            if (sock === connection.socket) {
                t.player_sockets.delete(USER_ID);
            }
        });
    });
}





module.exports = pong_routes;


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
    const interval = setInterval(() => {
        // Physique balle classique A CHANGER UN PEU PTET
        game.ball.x += game.ball.vx;
        game.ball.y += game.ball.vy;

        // rebonds
        if (game.ball.y <= 0 || game.ball.y >= game.height) {
            game.ball.vy *= -1;
        }

        // Score ai
        if (game.ball.x <= 0){
            game.scores.p2 += 1;
        } 
        //score joueur
        else if (game.ball.x >= game.width){
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

        // Collisions paddles
        // Gauche
        if (
            game.ball.x <= 20 + game.paddleWidth &&
            game.ball.x >= 20 - game.paddleWidth &&
            game.ball.y >= game.paddles.p1 &&
            game.ball.y <= game.paddles.p1 + game.paddleHeight
        ) {
            game.ball.vx = Math.abs(game.ball.vx);
        }
        // Droite
        if (
            game.ball.x >= (game.width - 30) - game.paddleWidth &&
            game.ball.x <= (game.width - 30) + game.paddleWidth &&
            game.ball.y >= game.paddles.p2 &&
            game.ball.y <= game.paddles.p2 + game.paddleHeight
        ) {
            game.ball.vx = -Math.abs(game.ball.vx);
        }

        // 1hz
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
            } 
            else{
                simulateAIKey(game, game.ai_state.currentDirection);
            }
        }

        // Broadcast
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





// game ending: 'give_up', 'victory' or 'disconnection'
const handle_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    if (!game || game?.ended)
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
            [   players[0],  players[1], (winner === 'p1') ? players[0] : players[1],  
                scores.p1,  scores.p2,
                player_names[0], player_names[1]
            ]
        );
        console.log(`OUPI GOUPI LE WINNER EST ${((winner === 'p1') ? players[0] : players[1])}`)
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
    game.ended = (true);
    sockets.forEach((socket, i) => {
        if (socket.readyState === 1) {
            const d = {
                type: 'game_end',
                reason,
                scores,
                winner: winner === 'p1' ? (player_names[0]) : player_names[1],
                looser: (winner === 'p1' || winner == 'null') ? (player_names[1]) : player_names[0],
                player_names: (player_names),
                you_are_winner: (i === 0 && winner === 'p1') || (i === 1 && winner === 'p2')
            };
            socket.send(JSON.stringify(d));
        }
    });
    // TOURNAMENT 
    if(game?.TOURNAMENT_GAME == true)
    {
        const t = fastify.p_tournament;
        const b = t.current_bracket;
        t.matches_done[b] += 1;
        const bucket_names = ["quarter", "semi_finals", "final"];
        // const tc = t.current_match;
        // console.log("bracket_res [" + bucket_names[b] + "]  ["+  t.current_match + "]"); 
        t.players[game?.p1_index_in_t].status = winner === 'p1' ? "waiting": "eliminated";  
        t.players[game?.p2_index_in_t].status = winner === 'p1' ? "eliminated": "waiting";
        t.bracket_results[bucket_names[b]][game?.TC || 0] = {
            winner:  winner === 'p1' ? game.players[0] : game.players[1],
            loser: winner === 'p1' ? game.players[1] : game.players[0],
            scores: [game.scores.p1, game.scores.p2], // Optional format
            is_bot_match: false
        };
        // surtout pas batar
        //t.current_match++;
        broadcast_tournament(fastify, {
            event: './'
        });
        // t_detect_next_bracket(fastify);
    
        t_detect_next_bracket(fastify);
    }
    if(fastify){
        fastify?.p_rooms.delete(game.id);
    }
    console.log(`Game ${game.id} ended (${reason}) — Winner: ${winner}`);
}



const handle_ai_game_end = async (game, reason = 'victory', fastify = null, user_id = null) => {
    // console.log('🔵 [AI_GAME_END] Function called with:', {
    //     game_id: game?.id,
    //     reason,
    //     user_id,
    //     has_fastify: !!fastify
    // });

    if (!game || game?.ended)
        return;

    clearInterval(game.interval);

    const { scores, players, sockets, player_names } = game;

    let winner = null;

    if (reason === 'victory') {
        if (scores.p1 > scores.p2) winner = 'p1';
        else if (scores.p2 > scores.p1) winner = 'p2';
    } else if (reason === 'give-up') {
        winner = 'p2';
    }

    if (!sockets || !Array.isArray(sockets))
        return;

    const player_id = players[0];

    console.log("SOCKETWZZZZ:", game.sockets[0], " 2:", game.sockets[1]);
    const socket = game.sockets[0];

    if (socket && socket.readyState === 1) {
        const d = {
            type: 'game_end',
            reason,
            scores,
            winner: winner === 'p1' ? player_names[0] : player_names[1],
            looser: winner === 'p1' ? player_names[1] : player_names[0],
            player_names,
            you_are_winner: winner === 'p1'
        };

        socket.send(JSON.stringify(d));
        console.log("successfully sent");
    } else {
        console.error('❌ [AI_GAME_END] Cannot send message - socket not ready (state:', socket?.readyState, ')');
    }

    try {
        console.log('💾 [AI_GAME_END] Starting DB operations...');

        let winner_id = null;

        try {
            let aiUser = await fastify.db.get(
                'SELECT id FROM users WHERE username = ?',
                ['AI_BOT']
            );

            if (!aiUser) {
                await fastify.db.run(
                    'INSERT INTO users (username, password) VALUES (?, ?)',
                    ['AI_BOT', 'no_password']
                );

                aiUser = await fastify.db.get(
                    'SELECT id FROM users WHERE username = ?',
                    ['AI_BOT']
                );

                AI_USER_ID = aiUser.id;

                if (!AI_USER_ID)
                    throw new Error('AI_USER_ID could not be retrieved.');

                console.log('✅ [AI_GAME_END] AI user ID:', AI_USER_ID);
            } else {
                AI_USER_ID = aiUser.id;
            }

        } catch (err) {
            console.error('❌ [AI_GAME_END] Error creating/finding AI user:', err);
            AI_USER_ID = -1;
        }

		winner_id = (winner === 'p1') ? players[0] : AI_USER_ID;
        await fastify.db.run(
            `INSERT INTO games (
                player1_id, player2_id, winner_id,
                player1_score, player2_score,
                p1_name, p2_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                players[0],
                AI_USER_ID,
                winner_id,
                scores.p1,
                scores.p2,
                player_names[0],
                player_names[1]
            ]
        );
        if (winner === 'p1') {
            await fastify.db.run(
                `UPDATE users SET wins = wins + 1 WHERE id = ?`,
                [player_id]
            );
        } else {
            await fastify.db.run(
                `UPDATE users SET losses = losses + 1 WHERE id = ?`,
                [player_id]
            );
        }

        game.ended = true;

    } catch (err) {
        console.error("❌ [AI_GAME_END] DB error:", err);
    }
    // TOURNAMENT 
    if(game?.TOURNAMENT_GAME == true)
    {
        const t = fastify.p_tournament;
        const b = t.current_bracket;
        t.matches_done[b] += 1;
        const bucket_names = ["quarter", "semi_finals", "final"];
        // const tc = t.current_match;
        // console.log("bracket_res [" + bucket_names[b] + "]  ["+  t.current_match + "]"); 
        t.players[game?.p1_index_in_t].status = winner === 'p1' ? "waiting": "eliminated";  
        t.players[game?.p2_index_in_t].status = winner === 'p1' ? "eliminated": "waiting";
        t.bracket_results[bucket_names[b]][game?.TC || 0] = {
            winner:  winner === 'p1' ? game.players[0] : game.players[1],
            loser: winner === 'p1' ? game.players[1] : game.players[0],
            scores: [game.scores.p1, game.scores.p2], // Optional format
            is_bot_match: false
        };
        // surtout pas batar
        //t.current_match++;
        broadcast_tournament(fastify, {
            event: './'
        });
        // t_detect_next_bracket(fastify);
    
        t_detect_next_bracket(fastify);
    }
    if (fastify) {
        fastify.p_rooms.delete(game.id);
    }

    console.log(`✅ [AI_GAME_END] AI Game ${game.id} ended (${reason}) — Winner: ${winner}`);
};

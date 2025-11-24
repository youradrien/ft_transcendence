import Page from '../template/page.ts';
import Pong from '../component/pong.ts';
import { i18n } from '../i18n';

export default class PlayPage extends Page {
  async render(): Promise<HTMLElement> {
    let joined_game: boolean = false;
    let queued_up: boolean = false;
    const container = document.createElement('div');
    container.id = this.id;
    container.innerHTML = `
      <div id="play-content" style="
        width: 100%;
        height: 100%;
        padding: 2rem;
        text-align: center;
        font-family: 'Press Start 2P', cursive;
        position: relative;
        min-height: 80vh;
      ">
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

        <h1 style="margin-bottom: 1rem; font-size: 32px; animation: fadeInUp 0.38s ease-out;">${i18n.t('online_title')}</h1>
        <p style="margin-bottom: 0.2rem;  font-size: 14px; animation: fadeInUp 0.5s ease-out;" id="player-status">${i18n.t('looking_for_players')}</p>
        <p style="margin-bottom: 0.2rem;  font-size: 14px; animation: fadeInUp 0.63s ease-out;" id="rooms-status">${i18n.t('looking_for_rooms')}</p>

        ${!joined_game ? `
            <div id="active-games" style="margin: 0 auto; margin-top: 3rem;
                min-width: 600px; 
                animation: fadeInUp 0.82s ease-out;
            ">
              <h2 style="margin-bottom: 1rem; font-size: 32px;">${i18n.t('active_games')}</h2>
              <div id="game-list" style="display: flex; flex-direction: column; gap: 1rem;"></div>
            </div>
          `
        : ""}

        <div id="arcade-panel" style="
          width: 260px;
          padding: 1rem;
          border: 3px solid #444;
          border-radius: 16px;
          background: rgba(25,25,25,0.8);
          backdrop-filter: blur(4px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.45);
          position: absolute;
          transition: 0.3s;
          top: 2rem;
          left: 2rem;
          text-align: left;
          font-family: 'Press Start 2P', cursive;
          color: #fff;
          animation: fadeInUp 0.6s ease-out;
        ">
          <h3 style="font-size: 14px; margin-bottom: 1rem;">${i18n.t('arcade_panel')}</h3>
          <p id="ap-player" style="font-size: 10px; opacity: 0.9;">${i18n.t('player_label', { name: '...' })}</p>
          <p id="ap-queue"  style="font-size: 10px; opacity: 0.9;">${i18n.t('queue_label', { count: '...' })}</p>
          <p id="ap-rooms"  style="font-size: 10px; opacity: 0.9;">${i18n.t('rooms_label', { count: '...' })}</p>
          <p id="ap-tournaments"  style="font-size: 10px; opacity: 0.9;">${i18n.t('tournaments_label', { count: '...' })}</p>
          <p id="ap-tournaments"  style="font-size: 10px; opacity: 0.9;">${i18n.t('average_elo_label', { elo: '...' })}</p>

          <div style="
            margin-top: 1rem;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, #bbdfff, #0095ff);
            box-shadow: 0 0 10px #0095ff;
          "></div>
          <p style="font-size: 9px; margin-top: 1rem; opacity: 0.7;">
            ${i18n.t('tip_esc')}
          </p>
        </div>

          
          <div class="title-banner" id ="title-banner"  style="animation: fadeInUp 0.8s ease-out;">
              <h1 style="margin-bottom: 2px; font-size: 36px; ">${i18n.t('pong_arcade')}</h1>
              <p style="margin-top: 3px;">${i18n.t('choose_game_mode')}</p>
              <div class="neon-divider"></div>
          </div>


          <div class="menu-box" id="menu-box" style="animation: fadeInUp 1s ease-out;">
              <h1 class="menu-title">${i18n.t('game_modes')}</h1>
              <button id="singleBtn" class="arcade-btn arcade-yellow">${i18n.t('single_player')}</button>
              <button id="multiBtn" class="arcade-btn arcade-blue" style="position:relative;">
                ${i18n.t('multiplayer')}
                <span id="queue-count" style="
                  position: absolute;
                  top: -10px;
                  right: -10px;
                  background: #00ff00;
                  color: black;
                  font-size: 10px;
                  padding: 4px 6px;
                  border-radius: 10px;
                  font-weight: bold;
                  box-shadow: 0 0 6px rgba(0,0,0,0.4);
                ">0</span>
              </button>
              <button id="aiBtn" class="arcade-btn arcade-orange">${i18n.t('play_vs_ai')}</button>
          </div>

          <div class="title-banner" id ="title-banner-t"  style="animation: fadeInUp 0.8s ease-out;">
              <div class="neon-divider ee"></div>
              <h1 style="margin-bottom: 2px; font-size: 36px; ">${i18n.t('TOURNAMENT_MODE')}</h1>
              <p style="margin-top: 3px;">${i18n.t('mode_tournament')}</p>
              <button id="tBtn" class="arcade-btn arcade-orange">${i18n.t('play_tournament')}</button>
          </div>
        <style>
              /* Retro Arcade Button */
              .arcade-btn {
                font-family: 'Press Start 2P', cursive;
                font-size: 12px;
                padding: 14px 24px;
                margin: 12px;
                border: 3px solid #333;
                border-radius: 8px;
                background-color: #1e1e1e;
                color: #fff;
                text-transform: uppercase;
                cursor: pointer;
                letter-spacing: 1px;
                transition: 0.18s ease-out;
                box-shadow: 0 4px 0 #000;
              }

              #play-content {
                background: radial-gradient(circle at center, #353535 0%, #1a1a1a4f 60%, #09090900 100%);
                background-size: cover;
                background-attachment: fixed;
              }

              .arcade-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 0 #000;
                background-color: #292929;
              }

              .arcade-btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 0 #000;
              }

              /* Highlight variations */
              .arcade-green { background: #0ac700; }
              .arcade-blue  { background: #008cff; }
              .arcade-red   { background: #ff4040; }
              .arcade-yellow { background: #ffd900; color: #000; }
              .arcade-orange { background: #ff9100; color: #000; }

              /* Disable behavior */
              .arcade-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }

              /* Sub-menu container */
              .menu-box {
                width: 950px;
                margin: 2rem auto;
                padding: 20px;
                border: 3px solid #444;
                border-radius: 16px;
                background: rgba(20,20,20,0.75);
                backdrop-filter: blur(4px);
                display: flex;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
              }

              .menu-title {
                font-size: 26px;
                margin-bottom: 1rem;
                color: #fff;
                letter-spacing: 2px;
              }

              #active-games {
                margin-top: 2rem;
                padding: 1rem;
                border-radius: 12px;
                width: 600px;
              }
              .title-banner {
                text-align: center;
                margin-top: 2rem;
                margin-bottom: 1.5rem;
                font-family: 'Press Start 2P', cursive;
                color: #fff;
              }

              .title-banner h1 {
                font-size: 28px;
                margin-bottom: 0.5rem;
                text-shadow: 0px 3px #000;
              }

              .title-banner p {
                font-size: 12px;
                color: #cccccc;
                opacity: 0.8;
              }
              .neon-divider {
                width: 80%;
                height: 4px;
                background: linear-gradient(90deg, #bbdfffff, #0095ffff);
                border-radius: 4px;
                margin: 1.5rem auto;
                box-shadow: 0 0 12px #b4ddffff, 0 0 12px #0099ffff;
              }
              .ee {  
                background: linear-gradient(90deg, #fff946ff, #ff9d00ff);
         
              }

              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
              }
        </style>

        <h1 id="game-join-h1" style="margin-bottom: 1rem; font-size: 30px;">JOINING ' '</h1>
        <h2 id="game-counter" style="margin-bottom: 1rem; font-size: 22px;">. . . . .</h2>

        <div id="game-area"> </div>
      </div>
    `;
    const p_st = container.querySelector('#player-status') as HTMLParagraphElement;
    const s = container.querySelector('#singleBtn') as HTMLButtonElement;
    const r_st = container.querySelector('#rooms-status') as HTMLParagraphElement;
    const q_btn = container.querySelector('#multiBtn') as HTMLButtonElement;
    // const hst_btn = container.querySelector('#hostGameBtn') as HTMLButtonElement;
    const aiBtn = container.querySelector('#aiBtn') as HTMLButtonElement;
    const tBtn = container.querySelector('#tBtn') as HTMLButtonElement;
    const gCounter = container.querySelector('#game-counter') as HTMLButtonElement;
    const gJntitle = container.querySelector('#game-join-h1') as HTMLButtonElement;
    let socket: WebSocket; // <-- wsocket var 
    let aiSocket: WebSocket |  null = null;
    let currentGameMode: 'multiplayer' | 'ai' | 'single' | null = null; // Track current game mode

    // start [MULTIPLAYER, AI, SINGLE-PLAYER]
    const start_game = async (
        game_mode: boolean, game_data?: object, game_ai?: boolean | false, is_local?: boolean | false
    ) => {
        joined_game = true;

        // grab UI
        const e = container.querySelector('#active-games') as HTMLElement;
        const m = container.querySelector('#menu-box') as HTMLElement;
        const L = container.querySelector('#title-banner') as HTMLElement;
        const LT = container.querySelector('#title-banner-t') as HTMLElement;
        const game_area = document.querySelector('#game-area');
        const l_box = container.querySelector('#arcade-panel') as HTMLElement;

        l_box.style.top = '-12rem';
        l_box.style.left = '0rem';

        // Hide menu UI
        [e, p_st, r_st, m, L, LT, gCounter, gJntitle].forEach(el => {
            if (el) el.style.display = 'none';
        });
        e.innerHTML = '';

        // --- Button setup for AI/Local ---
        if (game_ai) {
            currentGameMode = 'ai';
            aiBtn.innerText = '🎮 Playing vs AI';
            aiBtn.style.backgroundColor = '#ff6600';
        }
        
        if (is_local) {
            currentGameMode = 'single';
            s.innerText = '🎮 Playing Local';
            s.style.backgroundColor = '#00cc44';
            s.style.color = 'white';
        }

        // ============================================================
        //  MULTIPLAYER/AI/LOCAL GAME
        // ============================================================
        if (game_mode) 
        {
            if (game_ai) {
                currentGameMode = 'ai';
            } else if (is_local) {
                currentGameMode = 'single';
            } else {
                currentGameMode = 'multiplayer';
            }

            const pong_page = new Pong(
                is_local ? "local-pong" : (game_ai ? "ai-pong" : "multiplayer-pong"),
                this.router,
                {
                    multiplayer: true as Boolean,
                    socket: (game_ai ? aiSocket : socket) as WebSocket,
                    game_data,
                    isaigame: game_ai,
                    islocal: is_local
                }
            );

            const pong_container = await pong_page.render();

            if (game_area) {
                game_area.innerHTML = '';
                game_area.appendChild(pong_container);
                
                if (is_local) {
                    q_btn.style.display = 'none';
                    s.style.backgroundColor = '#cc0000ff';
                    s.style.color = 'white';
                    s.innerText = '❌ GIVE UP';
                } else {
                    aiBtn.disabled = true;
                }
            }
            return;
        }

        // ============================================================
        //  OFFLINE SINGLEPLAYER (currently not used)
        // ============================================================
        currentGameMode = 'single';
    };

    // Fetch active games helper
    const fetch_games = async () => {
        try {
            const res = await fetch('http://localhost:3010/api/pong/active-games', {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                const _gl = container.querySelector('#game-list') as HTMLDivElement;
                _gl.innerHTML = '';

                data.data.forEach((game: any) => {
                    const _game_bx = document.createElement('div');
                    _game_bx.style.padding = '1rem';
                    _game_bx.style.border = '1px solid #444';
                    _game_bx.style.borderRadius = '12px';
                    _game_bx.style.backgroundColor = '#1e1e1e';
                    _game_bx.style.color = '#f1f1f1';
                    _game_bx.style.fontSize = '0.85rem';
                    _game_bx.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
                    _game_bx.style.display = 'flex';
                    _game_bx.style.flexDirection = 'column';
                    _game_bx.style.alignItems = 'center';
                    _game_bx.style.justifyContent = 'center';
                    _game_bx.style.minWidth = '220px';

                    const idP = document.createElement('p');
                    idP.style.margin = '0 0 0.5rem';
                    idP.style.fontWeight = 'bold';
                    idP.style.color = '#888';
                    idP.textContent = `🏓 Game ID: ${game.id}`;

                    const scoreP = document.createElement('p');
                    scoreP.style.margin = '0';
                    scoreP.style.fontSize = '0.95rem';
                    scoreP.textContent = `${game.player1.username} [${game.player1.score}] vs ${game.player2.username} [${game.player2.score}]`;

                    _game_bx.appendChild(idP);
                    _game_bx.appendChild(scoreP);
                    _gl.appendChild(_game_bx);
                });
            }
        } catch (err) {
            console.error('Failed to fetch active games:', err);
        }
    };

    // (FETCH) stats of current serv state - initial page load
    try {
        const ress = await fetch('http://localhost:3010/api/pong/active-games', {
          credentials: 'include'
        });
        const dataa = await ress.json();
        if (dataa.success)
        {
            const _gl = container.querySelector('#game-list') as HTMLDivElement;
            _gl.innerHTML = ''; // clear previous games

            dataa.data.forEach((game: any) => {
                  const _game_bx = document.createElement('div');
                  _game_bx.style.padding = '1rem';
                  _game_bx.style.border = '1px solid #444';
                  _game_bx.style.borderRadius = '12px';
                  _game_bx.style.backgroundColor = '#1e1e1e';
                  _game_bx.style.color = '#f1f1f1';
                  _game_bx.style.fontSize = '0.85rem';
                  _game_bx.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
                  _game_bx.style.display = 'flex';
                  _game_bx.style.flexDirection = 'column';
                  _game_bx.style.alignItems = 'center';
                  _game_bx.style.justifyContent = 'center';
                  _game_bx.style.minWidth = '220px';

                  const idP = document.createElement('p');
                  idP.style.margin = '0 0 0.5rem';
                  idP.style.fontWeight = 'bold';
                  idP.style.color = '#888';
                  idP.textContent = `🏓 Game ID: ${game.id}`;

                  const scoreP = document.createElement('p');
                  scoreP.style.margin = '0';
                  scoreP.style.fontSize = '0.95rem';
                  scoreP.textContent = `${game.player1.username} [${game.player1.score}] vs ${game.player2.username} [${game.player2.score}]`;

                  _game_bx.appendChild(idP);
                  _game_bx.appendChild(scoreP);
                  _gl.appendChild(_game_bx);
            });
        }
        gCounter.innerHTML = "";
        gJntitle.innerHTML = "";
        const ga = document.querySelector('#game-area');
        if (ga)
          ga.innerHTML = '';
        const res = await fetch('http://localhost:3010/api/pong/status', {
          credentials: 'include'
        });
        const data = await res.json();
        const qc = container.querySelector('#queue-count') as HTMLSpanElement;
        console.log(data?.data);
        const online = data?.data?.queuedPlayers ?? 0;
        if(data?.data?.joinedQueue)
        {
            q_btn.style.backgroundColor = '#00cc44';  // Green background
            q_btn.style.color = 'white';              // White text
            q_btn.innerText = '✅ Queued!';
        }
        r_st.innerText = `🔵 ${data?.data?.activeRooms} currently active pong room(s)...`;
        p_st.innerText = `🟢 ${online} player(s) in queue`;
        qc.innerText = String(online);
        if(data?.data?.alr_in_game){
            // auto click the queue-up btn
            q_btn.click(); // <- this will trigger everythn needed by itself cuh
        }
    } catch (err) {
        const p_st = container.querySelector('#player-status') as HTMLParagraphElement;
        p_st.innerText = '⚠️ Could not load player status';
        console.error('Failed to fetch data:', err);
    }



    // (AI) btn handler
    aiBtn.onclick = async () => {
        if(queued_up) return;
        try {
            aiSocket = new WebSocket('ws://localhost:3010/api/pong/ai/ws'); 
            aiBtn.innerText = '🤖 Connecting to AI...';
            aiBtn.disabled = true;
            
            aiSocket.onmessage = async (msg) => {
                const data = JSON.parse(msg.data);
                if (data.type === 'start') {
                    await start_game(true, data?.ehh, true); 
                }                
                if (data.type === 'game_over') {
                    alert(`Game Over! ${data.winner} wins!\nScore: ${data.scores.p1} - ${data.scores.p2}`);
                    // Recharge la page6
                    window.location.reload();
                }
            };
            aiSocket.onerror = (err) => {
                console.error('AI WebSocket error:', err);
                aiBtn.innerText = '❌ Connection failed';
                aiBtn.disabled = false;
            };
            aiSocket.onclose = () => {
                aiBtn.disabled = false;
                aiBtn.innerText = '🤖 PLAY vs AI';
                aiBtn.style.backgroundColor = '#ff6600';
            }
        } catch (err) {
            console.error('Failed to start AI game:', err);
            aiBtn.innerText = '❌ Failed. Retry?';
            aiBtn.disabled = false;
        }
    };


    // tournament link-btn
    tBtn.onclick = async () => {
        if(queued_up) return ;
        this.router.navigate('/tournament');
    }

    
    // (queue) btn handler
    q_btn.onclick = async () => {
      if(queued_up) return;
      try {
          if(!socket || socket == null)
          {
            socket = new WebSocket('ws://localhost:3010/api/pong/ws');
          }
          socket.onmessage = async (msg) => {
              const data = JSON.parse(msg.data);
              const qc = container.querySelector('#queue-count') as HTMLSpanElement;
              if(data?.queueLength >= 0) {
                  qc.innerText = String(data?.queueLength);
                  p_st.innerText = `🟢 ${data?.queueLength} player(s) in queue`;
              }
              if(data?.type == "waiting")
              {
                  queued_up = true;
                  q_btn.style.backgroundColor = '#00cc44';
                  q_btn.style.color = 'white';            
                  q_btn.innerText = '✅ Queued!';
              }
              if(data?.type == "creating")
              {
                  r_st.innerText = `🔵 ${data?.roomsLength} currently active pong room(s)...`;
                  qc.innerText = '';
                  queued_up = true;
                  // countdown.. either /actual game-countdown/ or /5s warmup time/
                  let _time_l = data?.countdown_v;
                  if(data?.is_a_comeback)
                  {
                    aiBtn.disabled = true;
                    gJntitle.innerHTML = "JOINING BACK YOUR GAME!";
                    q_btn.style.backgroundColor = '#ffbb00ff';  // Green background
                    q_btn.style.color = 'black';              // White text
                    q_btn.innerText = '⚡ joining. .';
                  }else{
                    gJntitle.innerHTML = "STARTING....";
                    q_btn.style.backgroundColor = '#1383e4ff'; 
                    q_btn.style.color = 'white';            
                    q_btn.innerText = '🔵 creating game...';
                  }
                  for(let i = 0; i < (_time_l); i++){
                      const t_left = _time_l - i;
                      setTimeout(() => {
                        gCounter.innerText = (!data?.is_a_comeback) ?
                          `⚔️ GAME-Joined! ⚔️  ${t_left}sec before start${(t_left % 2 == 0) ? '...'  : '..'}`
                          :
                          `WELCOME-BACK 🔄 ${t_left}sec (prepare urself bro)`;
                      }, i * 1000);
                  }
              }
              if(data?.type == "waiting-update")
              {
                  p_st.innerText = `🟢 ${data?.queueLength} player(s) in queue`;
                  r_st.innerText = `🔵 ${data?.roomsLength} currently active pong room(s)...`;
                  await fetch_games();
              }
              if(data?.type == "error")
              {
                  alert(data.message);
              }
              if(data?.type == "start")
              {
                  start_game(true, data.ehh);
              }
          };

        
      } catch (err) {
        console.log(err);
      }
    };


    // single player btn handler (local multiplayer)
    s.onclick = async () => {
      if(queued_up) return;
      
      if (!joined_game) {
        // Start local multiplayer game via backend
        try {
          const localSocket = new WebSocket('ws://localhost:3010/api/pong/local/ws');
          s.innerText = '🎮 Connecting...';
          s.disabled = true;
          
          localSocket.onmessage = async (msg) => {
            const data = JSON.parse(msg.data);
            if (data.type === 'start') {
              currentGameMode = 'single';
              socket = localSocket;
              await start_game(true, data?.ehh, false, true);
            }
            
            if (data.type === 'game_end') {
              alert(`Game Over!\n${data.winner} wins!\nScore: ${data.scores.p1} - ${data.scores.p2}`);
              window.location.reload();
            }
          };

          localSocket.onerror = (err) => {
            console.error('Local WebSocket error:', err);
            s.innerText = '❌ Connection failed';
            s.disabled = false;
          };
          
          localSocket.onclose = () => {
            s.disabled = false;
            s.innerText = '🎯 SINGLE PLAYER';
            currentGameMode = null;
          };

        } catch (err) {
          console.error('Failed to start local game:', err);
          s.innerText = '❌ Failed. Retry?';
          s.disabled = false;
        }
      } else {
        // Give up functionality
        if (currentGameMode === 'ai' && aiSocket && aiSocket.readyState === WebSocket.OPEN) {
          aiSocket.send(JSON.stringify({ type: "player_giveup" }));
        }
        else if (currentGameMode === 'multiplayer' && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "player_giveup" }));
          socket.close();
        }
        else if (currentGameMode === 'single' && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "player_giveup" }));
          socket.close();
        }
        
        setTimeout(() => window.location.reload(), 5000);
      }
    };


    return container;
  }
}
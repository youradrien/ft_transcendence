import Page from '../template/page.ts';
import Pong from '../component/pong.ts';

export default class PlayPage extends Page {
  async render(): Promise<HTMLElement> {
    let joined_game: boolean = false;
    const container = document.createElement('div');
    container.id = this.id;
    container.innerHTML = `
    <div id="play-content">
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          overflow: hidden;
        }

        #play-content {
          width: 100%;
          height: 100vh;
          padding: 2rem;
          text-align: center;
          font-family: 'Press Start 2P', cursive;
          position: relative;
          background: radial-gradient(circle at center,rgba(255, 255, 255, 0.05) 0%, #00000047 100%);
          border: 4px solid rgb(17, 17, 17);
          border-radius: 24px;
          color: #f1f1f1;
          overflow-y: auto;
          animation: fadeIn 1s ease-in-out;
        }

        h1, h2, p {
          color: #f5f5f5;
          text-shadow: 0 0 6px #0ff;
        }

        #active-games {
          margin-top: 3rem;
          min-width: 500px;
          background: rgba(20, 20, 20, 0.4);
          border: 2px solid rgba(0, 255, 255, 0.2);
          border-radius: 16px;
          box-shadow: 0 0 20px rgba(0,255,255,0.1);
          padding: 1rem;
          backdrop-filter: blur(6px);
          animation: glowIn 1.5s ease-out;
        }

        #active-games h2 {
          color: #00ffff;
          text-shadow: 0 0 10px #00ffff;
        }

        #game-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .game-box {
          padding: 1rem;
          border: 1px solid #333;
          border-radius: 12px;
          background-color: #1a1a1a;
          color: #f1f1f1;
          font-size: 0.85rem;
          box-shadow: 0 0 10px rgba(0,255,255,0.05);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .game-box:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 15px rgba(0,255,255,0.4);
        }

        /* GAME MODE PANEL */
        #game-mode-panel {
          margin-top: 2rem;
          padding: 1.5rem;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          background: rgba(10,10,10,0.35);
          box-shadow: 0 0 15px rgba(0,255,255,0.1);
          backdrop-filter: blur(8px);
          animation: fadeInUp 1s ease-out;
        }

        #game-mode-panel h1 {
          font-size: 20px;
          margin-bottom: 1rem;
          color: #00ffff;
        }

        button {
          font-family: 'Press Start 2P', cursive;
          font-size: 14px;
          padding: 1rem;
          margin: 1rem;
          border: 2px solid #00ffff;
          border-radius: 12px;
          background: linear-gradient(145deg, #0f0f0f, #1c1c1c);
          color: #00ffff;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 10px rgba(0,255,255,0.2);
        }

        button:hover {
          background: #00ffff;
          color: #000;
          box-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff inset;
          transform: scale(1.05);
          border-radius: 5px;
        }

        #aiBtn {
          border-color: #ffae00;
          color: #ffae00;
        }
        #aiBtn:hover {
          background: #ffae00;
          color: #000;
          box-shadow: 0 0 20px #ffae00, 0 0 30px #ffae00 inset;
        }

        #queue-count {
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
          animation: pulse 1.2s infinite;
        }

        /* KEYFRAMES */
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 5px #00ff00; }
          50% { transform: scale(1.2); box-shadow: 0 0 15px #00ff00; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glowIn {
          from { box-shadow: 0 0 0 rgba(0,255,255,0); }
          to { box-shadow: 0 0 20px rgba(0,255,255,0.4); }
        }
      </style>

      <h1>PONG 🎮</h1>
      <p id="player-status">Looking for players...</p>
      <p id="rooms-status">Looking for any rooms?...</p>

      ${!joined_game ? `
        <div id="active-games">
          <h2>🏓 Active Games</h2>
          <div id="game-list"></div>
        </div>
      ` : ""}

      <div id="game-mode-panel">
        <h1>GAME MODES</h1>
        <div>
          <button id="singleBtn">🎯 SINGLE Player</button>
          <div style="display: inline-block; position: relative;">
            <button id="multiBtn">🚀 Queue for Match</button>
            <span id="queue-count">0</span>
          </div>
        </div>
        <div>
          <button id="hostGameBtn">🕹️ Host Custom Game</button>
          <button id="aiBtn">🤖 PLAY vs AI</button>
        </div>
      </div>

      <h1 id="game-join-h1">JOINING ' '</h1>
      <h2 id="game-counter">. . . . .</h2>

      <div id="game-area"></div>
    </div>
  `;
    const p_st = container.querySelector('#player-status') as HTMLParagraphElement;
    const sgl = container.querySelector('#singleBtn') as HTMLParagraphElement;
    const r_st = container.querySelector('#rooms-status') as HTMLParagraphElement;
    const q_btn = container.querySelector('#multiBtn') as HTMLButtonElement;
    const hst_btn = container.querySelector('#hostGameBtn') as HTMLButtonElement;
    const aiBtn = container.querySelector('#aiBtn') as HTMLButtonElement;
    const gCounter = container.querySelector('#game-counter') as HTMLButtonElement;
    const gJntitle = container.querySelector('#game-join-h1') as HTMLButtonElement;
    let socket: WebSocket; // <-- wsocket var 
    let nahh: boolean = false;
    let aiSocket: WebSocket |  null = null;
    let currentGameMode: 'multiplayer' | 'ai' | 'single' | null = null; // Track current game mode
    // whole func dedicated to update active games data
    const fetch_games = async () => {
        try {
        const res = await fetch('http://localhost:3010/api/pong/active-games', {
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          const _gl = container.querySelector('#game-list') as HTMLDivElement;
          _gl.innerHTML = ''; // clear previous games

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

                // Append to box
                _game_bx.appendChild(idP);
                _game_bx.appendChild(scoreP);

                // Add to game list
                _gl.appendChild(_game_bx);
          });
        }
      } catch (err) {
        console.error('Failed to fetch active games:', err);
      }
    };

    // start either multiplayer or single player
    // start either multiplayer or single player
    const start_game = async (game_mode: boolean, game_data? : object, game_ai?: boolean | false) => 
    {
        joined_game = (true);
        const e = container.querySelector('#active-games') as HTMLElement;
        e.innerHTML = '';
        p_st.style.display = 'none';
        r_st.style.display = 'none';
        gCounter.style.display = 'none';
        gJntitle.style.display = 'none';
        if(game_ai){
            aiBtn.innerText = '🎮 Playing vs AI';
            aiBtn.style.backgroundColor = '#ff6600';
        }
        if(game_mode) // multiplayer
        {
          if(game_ai){
            currentGameMode = 'ai';
          }
          // component
          const pong_page = new Pong(game_ai ? "ai-pong" : "multiplayer-pong", 
            this.router, 
            {
              multiplayer : true as (Boolean),
              socket: (game_ai ? (aiSocket): (socket)) as (WebSocket),
              game_data: (game_data),
              isaigame: (game_ai)
            }
          );

          // render && append 
          const pong_container = await pong_page.render();

          // For example, append to a div with id "gameArea"
          const game_area = document.querySelector('#game-area');
          if (game_area)
          {
              // del prev games
              aiBtn.disabled = true
              game_area.innerHTML = '';
              game_area.appendChild(pong_container);
              q_btn.style.backgroundColor = '#cc0000ff';  // Green background
              q_btn.style.color = 'white';              // White text
              q_btn.innerText = '🔌 Disconnect';
              sgl.style.backgroundColor = '#f5d500ff';  // Green background
              sgl.style.color = 'black';              // White text
              sgl.innerText = '❌ GIVE UP';
          }
      }else
      {
        currentGameMode = 'single';
        const solo_pong = new Pong("pong_ahhh_single", this.router, {
          multiplayer : false,
        });
        // render && append 
        const pong_container = await solo_pong.render();

        // For example, append to a div with id "gameArea"
        const game_area = document.querySelector('#game-area');
        if (game_area)
        {
            // del prev games
            game_area.innerHTML = '';
            game_area.appendChild(pong_container);
        }
        q_btn.innerText = '- - - - -';
        sgl.innerText = '- - - -';
      }
    };
    // (queue) btn handler
    aiBtn.onclick = async () => {
      try {
          aiSocket = new WebSocket('ws://localhost:3010/api/pong/ai/ws'); 
          aiBtn.innerText = '🤖 Connecting to AI...';
          aiBtn.disabled = true;
          
          aiSocket.onmessage = async (msg) => {
              const data = JSON.parse(msg.data);
              if (data.type === 'start') {
                  nahh = false;
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
              currentGameMode = null; // Reset game mode
          }

      } catch (err) {
          console.error('Failed to start AI game:', err);
          aiBtn.innerText = '❌ Failed. Retry?';
          aiBtn.disabled = false;
          currentGameMode = null;
      }
    };
    // (queue) btn handler
    q_btn.onclick = async () => {
      try {
      if (nahh) return;

      if (joined_game) {
        try {
          if (currentGameMode === 'ai' && aiSocket && aiSocket.readyState === WebSocket.OPEN)
          {
            this.router.navigate('/'); // simple navigation
            return;
          }
          else if (currentGameMode === 'multiplayer' && socket && socket.readyState === WebSocket.OPEN)
          {
            // Multi: fermeture OK
            socket.close();
            setTimeout(() => window.location.reload(), 200);
            return;
          }
        } catch (_) {}
        setTimeout(() => window.location.reload(), 200);
        return;
      }
        if(!socket || socket == null)
        {
          socket = new WebSocket('ws://localhost:3010/api/pong/ws');
        }
        socket.onmessage = async (msg) => {
            const data = JSON.parse(msg.data);
            const qc = container.querySelector('#queue-count') as HTMLSpanElement;
            const queueBtn = container.querySelector('#multiBtn') as HTMLButtonElement;
            if(data?.queueLength >= 0){
              qc.innerText = String(data?.queueLength);
              p_st.innerText = `🟢 ${data?.queueLength} player(s) in queue`;
            }
            if(data?.type == "waiting")
            {
                queueBtn.style.backgroundColor = '#00cc44';
                queueBtn.style.color = 'white';            
                queueBtn.innerText = '✅ Queued!';
            }
            if(data?.type == "creating")
            {

                r_st.innerText = `🔵 ${data?.roomsLength} currently active pong room(s)...`;
                qc.innerText = '';
                await fetch_games();
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
                    queueBtn.style.backgroundColor = '#1383e4ff'; 
                    queueBtn.style.color = 'white';            
                    queueBtn.innerText = '🔵 creating game...';
                }
                nahh = true;
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
              nahh = false;
              start_game(true, data.ehh);
            }
        };
      } catch (err) {
        console.log(err);
      }
    };

    // stats of current serv state
    // so : players in queue, rooms, total online plyr count
    try {
        await fetch_games();
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
    }

    // single player btn handler
    const s = container.querySelector('#singleBtn') as HTMLButtonElement;
    s.onclick = async () => {
      if(!joined_game)
      {
        await start_game(false); // <-- single player pong
      }else
      {
        console.log(currentGameMode);
        // Check which socket to use based on current game mode
        if (currentGameMode === 'ai' && aiSocket && aiSocket.readyState === WebSocket.OPEN)
        {
          aiSocket.send(JSON.stringify({
            type: "player_giveup"
          }));
          // aiSocket.close();
        }
        else if(currentGameMode === 'multiplayer' && socket && socket.readyState === WebSocket.OPEN)
        {
          socket.send(JSON.stringify({
            type: "player_giveup"
          }));
          socket.close();
        }
        // Reload page after giving up
        setTimeout(() => window.location.reload(), 5000);
      }
    };

    // custom game BTN handler
    hst_btn.onclick = async () => {
        try {

        } catch (error) {
          console.log(error);
        }
    };

    return container;
  }
}

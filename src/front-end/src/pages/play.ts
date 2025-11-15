import Page from '../template/page.ts';
import Pong from '../component/pong.ts';

export default class PlayPage extends Page {
  async render(): Promise<HTMLElement> {
    let joined_game: boolean = false;
    const container = document.createElement('div');
    container.id = this.id;
    container.innerHTML = `
      <div id="play-content" style="
        width: 100%;
        height: 100vh;
        padding: 2rem;
        text-align: center;
        font-family: 'Press Start 2P', cursive;
        position: relative;
      ">
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

        <h1 style="margin-bottom: 1rem; font-size: 32px;">Pong 🎮</h1>
        <p style="margin-bottom: 0.2rem;  font-size: 14px;" id="player-status">Looking for players...</p>
        <p style="margin-bottom: 0.2rem;  font-size: 14px;" id="rooms-status">Looking for any rooms?...</p>

        ${!joined_game ? `
            <div id="active-games" style="margin-top: 3rem;
                min-width: 500px; 
                background-color: rgba(35, 35, 35, 0.5);
            ">
              <h2 style="margin-bottom: 1rem; font-size: 32px;">🏓 Active Games</h2>
              <div id="game-list" style="display: flex; flex-direction: column; gap: 1rem;"></div>
            </div>
          `
        : ""}

        <div style="margin-top: 2rem; position: relative; display: flex; flex-direction: column; padding: 20px; border: 2px solid grey; 
            border-radius 16px; ">
          <h1 id="game-modes">GAME-MODES</h1>
          <div>
              <button id="singleBtn" style="margin: 1rem;">🎯 SINGLE-Player</button>
              <div style="display: inline-block; position: relative;">
                <button id="multiBtn" style="margin: 1rem; position: relative;">
                  🚀 Queue for Match
                </button>
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
              </div>
          </div>

          <div>
                <button id="hostGameBtn" style="margin: 1rem;" background-color: #007bffff;>🕹️ Host custom-game</button>
                <button id="aiBtn" style="margin: 1rem; background-color: #ffae00ff;">🤖 PLAY vs AI</button>
          </div>

        </div>

        <h1 id="game-join-h1" style="margin-bottom: 1rem; font-size: 30px;">JOINING ' '</h1>
        <h2 id="game-counter" style="margin-bottom: 1rem; font-size: 22px;">. . . . .</h2>

        <div id="game-area"> </div>
      </div>
    `;
    const p_st = container.querySelector('#player-status') as HTMLParagraphElement;
    const sgl = container.querySelector('#singleBtn') as HTMLParagraphElement;
    const r_st = container.querySelector('#rooms-status') as HTMLParagraphElement;
    const q_btn = container.querySelector('#multiBtn') as HTMLButtonElement;
    // const hst_btn = container.querySelector('#hostGameBtn') as HTMLButtonElement;
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
    const start_game = async (
      game_mode: boolean, 
      game_data?: object, 
      game_ai?: boolean | false,
      is_local?: boolean | false  // NEW PARAMETER
    ) => {
      joined_game = true;
      const e = container.querySelector('#active-games') as HTMLElement;
      e.innerHTML = '';
      p_st.style.display = 'none';
      r_st.style.display = 'none';
      gCounter.style.display = 'none';
      gJntitle.style.display = 'none';
      
      if (game_ai) {
        aiBtn.innerText = '🎮 Playing vs AI';
        aiBtn.style.backgroundColor = '#ff6600';
      }
      
      if (is_local) {
        sgl.innerText = '🎮 Playing Local';
        sgl.style.backgroundColor = '#00cc44';
        sgl.style.color = 'white';
      }
      
      if (game_mode) {
        if (game_ai) {
          currentGameMode = 'ai';
        } else if (is_local) {
          currentGameMode = 'single';
        } else {
          currentGameMode = 'multiplayer';
        }
        
        // Component
        const pong_page = new Pong(
          is_local ? "local-pong" : (game_ai ? "ai-pong" : "multiplayer-pong"), 
          this.router, 
          {
            multiplayer: true as Boolean,
            socket: (game_ai ? aiSocket : socket) as WebSocket,
            game_data: game_data,
            isaigame: game_ai,
            islocal: is_local  // NEW FLAG
          }
        );

        const pong_container = await pong_page.render();
        const game_area = document.querySelector('#game-area');
        
        if (game_area) {
          aiBtn.disabled = true;
          game_area.innerHTML = '';
          game_area.appendChild(pong_container);
          
          if (is_local) {
            q_btn.style.display = 'none'; // Hide multiplayer button
            sgl.style.backgroundColor = '#cc0000ff';
            sgl.style.color = 'white';
            sgl.innerText = '❌ GIVE UP';
          } else {
            q_btn.style.backgroundColor = '#cc0000ff';
            q_btn.style.color = 'white';
            q_btn.innerText = '🔌 Disconnect';
            sgl.style.backgroundColor = '#f5d500ff';
            sgl.style.color = 'black';
            sgl.innerText = '❌ GIVE UP';
          }
        }
      }else
      {
        // currentGameMode = 'single';
        // const solo_pong = new Pong("pong_ahhh_single", this.router, {
        //   multiplayer : false,
        // });
        // // render && append 
        // const pong_container = await solo_pong.render();

        // // For example, append to a div with id "gameArea"
        // const game_area = document.querySelector('#game-area');
        // if (game_area)
        // {
        //     // del prev games
        //     game_area.innerHTML = '';
        //     game_area.appendChild(pong_container);
        // }
        // q_btn.innerText = '- - - - -';
        // sgl.innerText = '- - - -';
        currentGameMode = 'single';
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
      if (!joined_game) {
        // Start local multiplayer game via backend
        try {
          const localSocket = new WebSocket('ws://localhost:3010/api/pong/local/ws');
          s.innerText = '🎮 Connecting...';
          s.disabled = true;
          
          localSocket.onmessage = async (msg) => {
            const data = JSON.parse(msg.data);
            if (data.type === 'start') {
              nahh = false;
              currentGameMode = 'single';
              socket = localSocket; // Assign to main socket variable for cleanup
              
              // Start the game with local multiplayer flag
              await start_game(true, data?.ehh, false, true); // Added 4th param for local
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
            s.innerText = '🎯 SINGLE-Player';
            currentGameMode = null;
          };

        } catch (err) {
          console.error('Failed to start local game:', err);
          s.innerText = '❌ Failed. Retry?';
          s.disabled = false;
        }
      } else {
        // Give up functionality
        console.log(currentGameMode);
        
        if (currentGameMode === 'ai' && aiSocket && aiSocket.readyState === WebSocket.OPEN) {
          aiSocket.send(JSON.stringify({ type: "player_giveup" }));
        }
        else if (currentGameMode === 'multiplayer' && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "player_giveup" }));
          socket.close();
        }
        else if (currentGameMode === 'single' && socket && socket.readyState === WebSocket.OPEN) {
          // Local multiplayer give up
          socket.send(JSON.stringify({ type: "player_giveup" }));
          socket.close();
        }
        
        setTimeout(() => window.location.reload(), 5000);
      }
    };

    return container;
  }
}
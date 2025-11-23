import Page from "../template/page";
import { i18n } from '../i18n';

export default class TournamentPage extends Page {
  async render(): Promise<HTMLElement> {
    const container = document.createElement("div");
    container.id = this.id;
    let tournament_online: boolean = false;
    let _registered: boolean = false;

    container.innerHTML = `
    <style>
      #tournament-wrapper {
        padding: 2rem;
        color: #f1f1f1;
        font-family: 'Press Start 2P', cursive;
        background: radial-gradient(circle at center, #3b88ff33 0%, #1a1a1a4f 60%, #09090900 100%);
        background-size: cover;
        background-attachment: fixed;
        animation: fadeInUp 0.5s ease-out;
      }
      h1, h2 {
        text-align: center;
        margin-bottom: 1.2rem;
      }
      #registration-box {
        background: rgba(40,40,40,0.6);
        padding: 1.5rem;
        border-radius: 12px;
        max-width: 500px;
        margin: 0 auto 2rem auto;
        text-align: center;
        border: 2px solid #00000029;
      }
      input, button {
        padding: 10px;
        margin: 8px;
        border-radius: 6px;
        border: none;
        font-family: inherit;
      }
      button {
        cursor: pointer;
        color: white;
      }
      button:hover {
        filter: brightness(1.15);
      }
      #players-list {
        margin-top: 1rem;
        font-size: 14px;
      }


      /* === History === */
      #history-box {
        margin-top: 4rem;
        background: rgba(20,20,20,0.6);
        padding: 1.5rem;
        border-radius: 12px;
      }
      .history-entry {
        border-bottom: 1px solid #444;
        padding: 1rem 0;
      }
      .history-entry:last-child {
        border-bottom: none;
      }
      .history-title {
        font-size: 16px;
        margin-bottom: 5px;
      }

      /* ==== BRACKET === */
      #big-bracket {
            display: flex;
            justify-content: center;
            gap: 3rem;
            margin-top: 2rem;
            font-family: 'Press Start 2P', cursive;
            color: #f1f1f1;
       }
        #bracket {
            display: flex;
            justify-content: center;
            gap: 3rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }

        .round-box {
            background: rgba(20,20,20,0.6);
            padding: 1.5rem;
            border-radius: 12px;
            min-width: 260px;
            border: 1px solid #333;
            box-shadow: 0 0 12px rgba(0,0,0,0.3);
        }

        .round-box h3 {
            text-align: center;
            margin-bottom: 1.2rem;
            font-size: 16px;
            color: #f1f1f1;
        }

        .round {
            display: flex;
            flex-direction: column;
            gap: 2.6rem;
            position: relative;
        }
        .round.sf {
            display: flex;
            flex-direction: column;
            height: 92%; /* ensure container takes full height for spacing to work */
            justify-content: space-around;
            min-height: 110vh;
        }
        .match {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            position: relative;
            padding-left: 1.5rem;
        }

        .player {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 0.4rem 0.6rem;
            background: #1f1f1f;
            border-radius: 8px;
            border: 1px solid #444;
            width: 200px;
        }

        .pfp {
            width: 40px;
            height: 40px;
            background: #333;
            border-radius: 6px;
            border: 1px solid #555;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .winner {
            background: #004d2a;
            border-color: #00ff90;
            color: #00ff90;
        }

        .champion {
            background: #5b4200;
            border-color: gold;
            color: gold;
        }

        .final-match {
            gap: 2rem;
        }


        /* ─────────────────────────────────────────
            CONNECTING LINES
        ───────────────────────────────────────── */

        /* QF → SF */
        .qf .match::after {
            content: "";
            position: absolute;
            right: -1.5rem;
            top: 25%;
            width: 1.5rem;
            height: 50%;
            border-right: 3px solid #666;
            border-top: 3px solid #666;
        }

        .qf .match:nth-child(even)::after {
            top: auto;
            bottom: 25%;
            border-top: none;
            border-bottom: 3px solid #666;
        }

        /* SF horizontal lines */
        .sf .match.mid::before {
            content: "";
            position: absolute;
            left: -2rem;
            top: 50%;
            width: 2rem;
            border-top: 3px solid #888;
        }

        .sf .match.mid::after {
            content: "";
            position: absolute;
            right: -2rem;
            top: 50%;
            width: 2rem;
            border-top: 3px solid #888;
        }

        /* Final line */
        .final .final-match::before {
            content: "";
            position: absolute;
            left: -2rem;
            top: 50%;
            width: 2rem;
            border-top: 4px solid gold;
        }
            /* Player List Container */
            #players-display {
              max-width: 700px;
              margin: 1.5rem auto 2rem auto;
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 1rem;
            }

            /* Player Card */
            .player-card {
              display: flex;
              align-items: center;
              gap: 1rem;
              background: rgba(30, 30, 30, 0.7);
              border: 1px solid #444;
              padding: 0.8rem 1rem;
              width: 260px;
              border-radius: 14px;
              box-shadow: 0 0 8px #00000055;
              cursor: pointer;
              font-family: 'Press Start 2P', cursive;
              transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .player-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 0 12px #3b88ff55;
            }

            /* PFP Circle */
            .player-card .pfp {
              width: 48px;
              height: 48px;
              border-radius: 10px;
              background: #222;
              border: 2px solid #666;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 18px;
            }

            /* Username + ELO stacked */
            .player-info {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .player-username {
              font-size: 12px;
            }

            .player-elo {
              font-size: 10px;
              color: #aaa;
            }

        @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
              }
    </style>

    <div id="tournament-wrapper">
      <h1>🏆 Tournament Mode</h1>
      <h3 style= "margin-top: 0px;">8-PLAYERS 1v1 Competitive GAME-MODE</h3>
      <div
          style="display: flex; align-items: center; gap: 8px; margin-left:auto; justify-content: center;">
          <span 
          id="onln" 
           style="
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #ff4c4c;
            box-shadow: 0 0 8px #ff4c4c;
            transition: background-color 0.3s, box-shadow 0.3s;
          "></span>
          <span 
          id="onln-2" 
          style="
            font-size: 14px;
            color: #ff4c4c;
            text-shadow: 0 0 4px #ff4c4c;
          ">
            ${tournament_online ? i18n.t('online') : i18n.t('offline')}
          </span>
      </div>

      <div id="registration-box">
        <h2>Player Registration</h2>
        <input id="player-name" placeholder="Enter alias..." maxlength="12" />
        <button id="add-player-btn">Join Tournament</button>
        <p id="player-count">0 / 8 players registered</p>
        <div 
            id="lobby-status"
            style="display: flex; align-items: center; gap: 8px; margin-left:auto; justify-content: center;"
        >
            <span id="lobby-status-1" style="
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: #888888ff;
              box-shadow: 0 0 8px  #888888ff;
              transition: background-color 0.3s, box-shadow 0.3s;
            "></span>
            <span  id="lobby-status-2" style="
              font-size: 14px;
              color: #888888ff;
              text-shadow: 0 0 4px #888888ff;
            ">
              Inactive: empty Tournament
            </span>
        </div>
        <button id="start-btn" disabled>Pay to Start Tournament</button>
      </div>

    <h2>Players</h2>
    <div id="players-display">  </div>
      
    <h2>Bracket</h2>
    <div id="bracket">

        <!-- Quarterfinals -->
        <div class="round-box">
            <h3>Quarterfinals</h3>
            <div class="round qf">
            <div class="match">
                <div class="player"><div class="pfp">A</div><span>Alice</span></div>
                <div class="player"><div class="pfp">B</div><span>Bob</span></div>
            </div>

            <div class="match">
                <div class="player"><div class="pfp">C</div><span>Charlie</span></div>
                <div class="player"><div class="pfp">D</div><span>David</span></div>
            </div>

            <div class="match">
                <div class="player"><div class="pfp">E</div><span>Eva</span></div>
                <div class="player"><div class="pfp">F</div><span>Ferdy</span></div>
            </div>

            <div class="match">
                <div class="player"><div class="pfp">G</div><span>Gino</span></div>
                <div class="player"><div class="pfp">H</div><span>Helena</span></div>
            </div>
            </div>
        </div>


        <!-- Semifinals -->
        <div class="round-box">
            <h3>Semifinals</h3>
            <div class="round sf">
                <div class="match mid">
                    <div class="player winner">Winner 1</div>
                    <div class="player winner">Winner 2</div>
                </div>
                <div class="match mid">
                    <div class="player winner">Winner 3</div>
                    <div class="player winner">Winner 4</div>
                </div>
            </div>
        </div>


        <!-- Final -->
        <div class="round-box">
            <h3>FINAL 🏁</h3>
            <div class="round final">
            <div class="match final-match">
                <div class="player champion">Champion</div>
                <div class="player champion">Finalist</div>
            </div>
            </div>
        </div>

    </div>


    </div>
    `;
    // === DOM elm ===
    const nameInput = container.querySelector("#player-name") as HTMLInputElement;
    const addBtn = container.querySelector("#add-player-btn") as HTMLButtonElement;
    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    let ws_tournament: WebSocket;


    // update tournament, fill. everythn
    const update_tournament_state = async (tournament_data: any, self_registered: boolean) => {
        console.log("e");
        console.log(tournament_data);

        // online
        const on = container.querySelector("#onln") as HTMLButtonElement;
        const on2 = container.querySelector("#onln-2") as HTMLButtonElement;
        if(tournament_data?.active)
        {
          on.style.color = "#7bff00ff";
          on.style.boxShadow = "0 0 8px #7bff00ff";
          on.style.backgroundColor = "#7bff00ff";
          on2.style.color = "#7bff00ff";
          on2.style.textShadow = "0 0 4px #7bff00ff";
          on2.innerHTML = "ONLINE";
        }

        // plyr count
        const c = document.getElementById("player-count") as HTMLElement;
        c.innerHTML = `${tournament_data.players.length} / 8 players joined.`;

        // plyr list
        const plyr_display = document.getElementById("players-display") as HTMLElement;
        plyr_display.innerHTML = "";
        let i: number  = 0;
        tournament_data.players.forEach((player: any) => {
          const card = document.createElement("div");
          card.className = "player-card";
          card.style.animation = "fadeInUp 0.85s ease-out";
          let C = "#ffffffff";
          let t:string = "rr";
          if(tournament_data?.players_status[i] == "waiting"){
            C = "#fff200ff";
            t = "Waiting..."
          }
          if(tournament_data?.players_status[i] == "in_match"){
            C = "#00e5ffff";
            t = "Currently IN-MATCH!";
          }
          if(tournament_data?.players_status[i] == "eliminated"){
            C = "#ff3434ff";
            t = "Eliminated ❌";
          }
          card.innerHTML = `
            <div class="pfp">
              <img src=${player.pfp} ></img>
            
            </div>
            <div class="player-info" style="text-align: left;">
              <span class="player-username">${player.username} as <i>${player.tournament_pseudo}</i></span>
              <span class="player-elo">ELO: ${player.elo ?? 1000}</span>
              <span  style="color: ${C}; text-shadow: 0 0 4px ${C}" class="player-elo"> ${t} </span>
            </div>
          `;
          card.onclick = async () => {  this.router.navigate('/profile/' + player?.username);  }
          plyr_display.appendChild(card);
          i++;
        });
    
        // status
        const lb1 = document.getElementById("lobby-status-1") as HTMLElement;
        const lb2 = document.getElementById("lobby-status-2") as HTMLElement;
        let color: string = "#ffffffff";
        if(tournament_data?.tournament_status == "inactive"){
            lb2.innerHTML = `Inactive: Empty Tournament`;
            color  = "#888888ff";
        }
        if(tournament_data?.tournament_status == "preparing"){
            lb2.innerHTML = `Tournament Open: (waiting for players...)`;
            color  = "#09b9ffff";
        }
        if(tournament_data?.tournament_status == "in-progress"){
            lb2.innerHTML = `Running: Tournament in progress`;
            color  = "#7bff00ff";
        }
        lb1.style.backgroundColor = (color);
        lb2.style.color = (color);
        lb1.style.boxShadow = `0 0 8px ${color}`;
        lb2.style.textShadow = `0 0 4px ${color}`;
        // btn-status
        if(self_registered) {
          addBtn.innerHTML = 'JOINED';
          addBtn.style.backgroundColor = '#00b7ffff';
        }
    };



  
    // (tournament) ws-endpoint handler
    try {
        ws_tournament = new WebSocket('ws://localhost:3010/api/pong/tournament/ws'); 
        
        ws_tournament.onmessage = async (msg) => {
            const data = JSON.parse(msg.data);
            // console.log(data);
            if (data?.type === 'tournament-update'){
                update_tournament_state(data?.tournament, data?.self_registered);
            }                
        };
        ws_tournament.onerror = (err) => {
            console.error('ws_tournament error:', err);
        };
        ws_tournament.onclose = () => { }
    } catch (err) {
        console.error('fail at: ', err);
    }




    // ------------------------------------
    //     REGISTRATION LOGIC
    // ------------------------------------
    addBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name || !ws_tournament || _registered) {
        return;
      }

      console.log(name);
      // if (this.registeredPlayers.length >= this.maxPlayers) {
      //   alert("Tournament is full!");
      //   return;
      // }
      ws_tournament.send(JSON.stringify({
          type: "register"
      }));
      _registered = (true);
      // this.registeredPlayers.push(name);
      nameInput.value = "";
    };



    // ------------------------------------
    //     START TOURNAMENT
    // ------------------------------------
    startBtn.onclick = () => {

    };


    return container;
  }
}
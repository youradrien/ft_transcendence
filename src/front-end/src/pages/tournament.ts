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
            min-height: 10vh;
        }
        .match {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            position: relative;
            padding-left: 1.5rem;
        }

        .match > span{
          max-width: 150px;
          overflow-x: scroll;
        }

        .player {
            display: flex;
            align-items: center;
            overflow-x: scroll;
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
            min-width: 40px;
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
              max-width: 1100px;
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
      <div  style="display: flex; align-items: center; gap: 8px; margin-left:auto; justify-content: center;" >
          <span 
          id="t-prize" 
          style="
            font-size: 18px;
            margin-top: 12px;
            color: #fffb00;
            text-shadow: 0 0 4px #ffd000ff;
          ">
           -
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
        <button
        style= "border: 2px solid #ffffff2e;"
        id="force-start-btn">FORCE-START Tournament </button>
        <span style="
              font-size: 12px;
              color: #ffffffff;
              text-shadow: 0 0 4px #ffffffff;
            " id="t-cost"> </span>
      </div>

    <h2>Players</h2>
    <div id="players-display">  </div>
      
    <h2 style="font-size: 36px; ">Bracket</h2>
    <h3 style="font-size: 16px; text-shadow: 0 0 20px #d9d9d9; animation: fadeInUp 0.85s ease-out" id="curr_bracket"> </h3>
    <div id="bracket">

        <!-- Quarterfinals -->
        <div class="round-box">
            <h3>Quarterfinals</h3>
            <h4 id="qf-count">0/4</h4>
            <div class="round qf">
            <div class="match">
                <div id="qf-1" class="player"><div class="pfp">A</div>
                    <div style="display: flex; flex-direction: column;"> <span>Alice</span>  <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px">PLAYER_1</p> </div>
                  </div>
                <div id="qf-2" class="player"><div class="pfp">B</div>
                    <div style="display: flex; flex-direction: column;"> <span>Bob</span>   <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px">PLAYER_2</p> </div>
                </div>
            </div>

            <div class="match">
                <div id="qf-3" class="player"><div class="pfp">C</div>
                    <div style="display: flex; flex-direction: column;"> <span>Charlie</span>  <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px">PLAYER_3</p> </div>
                </div>
                <div id="qf-4" class="player"><div class="pfp">D</div>
                    <div style="display: flex; flex-direction: column;"> <span>David</span>   <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px"> PLAYER_4</p>  </div>
                </div>
            </div>

            <div class="match">
                <div id="qf-5" class="player"><div class="pfp">E</div>
                    <div style="display: flex; flex-direction: column;">  <span>Eva</span>   <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px"> PLAYER_5</p> </div>
                </div>
                <div id="qf-6" class="player"><div class="pfp">F</div>
                    <div style="display: flex; flex-direction: column;">  <span>Ferdy</span>   <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px"> PLAYER_6</p> </div>
                </div>
            </div>

            <div class="match">
                <div id="qf-7" class="player"><div class="pfp">G</div>
                    <div style="display: flex; flex-direction: column;">  <span>Gino</span> <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px">PLAYER_7</p></div> 
                </div>
                <div id="qf-8" class="player"><div class="pfp">H</div>
                    <div style="display: flex; flex-direction: column;">  <span>Helena</span>  <p style="font-size: 10px; color: grey; margin: 0 auto; margin-left: 0px"> PLAYER_8</p> </div>
                </div> 
            </div>
            </div>
        </div>


        <!-- Semifinals -->
        <div class="round-box">
            <h3>Semifinals</h3>
            <h4 id="sf-count">0/2</h4>
            <div class="round sf">
                <div class="match mid">
                    <div id="sf-1" class="player winner"> <div class="pfp">W1</div>
                      Winner 1 </div>
                    <div id="sf-2"class="player winner"> <div class="pfp">W2</div>
                      Winner 2 </div>
                </div>
                <div class="match mid">
                    <div id="sf-3" class="player winner"> <div class="pfp">W3</div>
                        Winner 3  </div>
                    <div id="sf-4" class="player winner"> <div class="pfp">W4</div>
                        Winner 4  </div>
                </div>
            </div>
        </div>


        <!-- Final -->
        <div class="round-box">
            <h3>FINAL 🏁</h3>
            <h4 id="f-count">0/1</h4>
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
    const f_startBtn = container.querySelector("#force-start-btn") as HTMLButtonElement;
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
        // prize
        const tp = document.getElementById("t-prize") as HTMLElement;
        if(tournament_data?.tournament_prize){
          tp.innerHTML = `TOURNAMENT PRIZE:  +${tournament_data?.tournament_prize}elo 🥇`;
        }
        // cost 
        const tc = document.getElementById("t-cost") as HTMLElement;
        tc.innerHTML = `${tournament_data?.tournament_prize / 4} ELO`;

        // plyr list
        const plyr_display = document.getElementById("players-display") as HTMLElement;
        plyr_display.innerHTML = "";
        let i: number  = 0;
        tournament_data.players.forEach((player: any) => {
          const card = document.createElement("div");
          card.className = "player-card";
          // card.style.animation = "fadeInUp 0.85s ease-out";
          let C = "#ffffffff";
          let t:string = "rr";
          if(player?.status == "waiting"){
            C = "#fff200ff";
            t = "Waiting..."
          }
          if(player?.status == "in_match"){
            C = "#00e5ffff";
            t = "Playing (IN-MATCH!)";
          }
          if(player?.status == "eliminated"){
            C = "#ff3434ff";
            t = "Eliminated ❌";
          }
          card.innerHTML = `
            <div class="pfp">
              <img src=${player.pfp} ></img>
            
            </div>
            <div class="player-info" style="text-align: left;">
              <span class="player-username">${player.username} as <i style="text-shadow: 0 0 4px white;">${player.tournament_pseudo}</i></span>
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
            lb2.innerHTML = `Registration Open: (waiting for players...)`;
            color  = "#09b9ffff";
        }
        if(tournament_data?.tournament_status == "in-progress"){
            lb2.innerHTML = `Registration closed: Tournament in-progress`;
            color  = "#7bff00ff";

            f_startBtn.innerHTML = "STARTED !";
            f_startBtn.style.backgroundColor = "#7bff00ff";
        }
        lb1.style.backgroundColor = (color);
        lb2.style.color = (color);
        lb1.style.boxShadow = `0 0 8px ${color}`;
        lb2.style.textShadow = `0 0 4px ${color}`;
        // btn-status
        if(self_registered) {
          addBtn.innerHTML = 'JOINED';
          addBtn.style.backgroundColor = '#00b7ffff';
          _registered = (true);
        }
        // brackets
        for(let i = 0; i < 3; i++)
        {  
          let s:string[] = ["qf", "sf", "f"];
          let w:string[] = ["quarter", "semi_finals", "final"];
          for(let j = 0; j < tournament_data?.bracket[i].length; j++)
          {
            let player = tournament_data?.bracket[i][j];
            const br_result = tournament_data?.bracket_results[w[i]][Math.floor(j / 2)];
            console.log("br_result: " + br_result);
            if(player != null)
            {
              const match = document.getElementById(s[i] + "-" + (j + 1)) as HTMLElement;

              if(match) {
                  // colouring for win/losses bracket
                  // console.log(player);
                  if(br_result){
                    if(br_result?.winner == player.userId){
                      match.style.border = "2px solid #00ff28";
                    }else{
                      match.style.border = "2px solid #a63c3c";
                    }
                  }
                  const d = match.querySelector("div") as HTMLElement;  // returns first span OR div
                  const e = match.querySelector("span") as HTMLElement;  // returns first span OR div
                  const f = match.querySelector("p") as HTMLElement;  // returns first span OR div
                  d.innerHTML = `<img src=${player?.pfp} />`;
                  e.innerHTML = `${player?.tournament_pseudo}`;
                  f.innerHTML = `${player?.username}`;
              }
            }
          }
        }
        // matchescount
        const a = container.querySelector("#qf-count") as HTMLInputElement;
        const b = container.querySelector("#sf-count") as HTMLInputElement;
        const cc = container.querySelector("#player-name") as HTMLInputElement;
        if(tournament_data?.matches_done)
        {
          a.innerHTML = `${tournament_data?.matches_done[0]} / 4`;
          b.innerHTML = `${tournament_data?.matches_done[1]} / 2`;
          cc.innerHTML = `${tournament_data?.matches_done[2]} / 1`;
        }
        // current round
        const d = container.querySelector("#curr_bracket") as HTMLInputElement;
        let vs:string [] = ["QUARTER-FINAL", "SEMI-FINAL", "FINAL"];
        d.innerHTML = `CURRENT ROUND: ${vs[tournament_data?.current_bracket] || '...'}`;        
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
            if(data?.type === 'too_poor'){
                alert("COULDNT AFFORD THE START..(poor af)");
            }
            if(data?.type === 'cant_join'){
                alert("Can't register to tournament now.");
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

      // console.log(name);
      // if (this.registeredPlayers.length >= this.maxPlayers) {
      //   alert("Tournament is full!");
      //   return;
      // }
      ws_tournament.send(JSON.stringify({
          type: "register",
          username: (name)
      }));
      _registered = (true);
      // this.registeredPlayers.push(name);
      nameInput.value = "";
    };



    // ------------------------------------
    //     START TOURNAMENT
    // ------------------------------------
    f_startBtn.onclick = async () => {
      console.log("_registered: " + _registered);
        if (! _registered || ws_tournament == null) {
          return;
        }

        console.log("FORCE START");
        ws_tournament.send(JSON.stringify({
            type: "force_start"
        }));
        nameInput.value = "";
    };


    return container;
  }
}
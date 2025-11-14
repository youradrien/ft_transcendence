import Page from "../template/page";

interface Match {
  p1?: string;
  p2?: string;
  winner?: string;
}

interface BracketState {
  qf: Match[];
  sf: Match[];
  final: Match;
}

interface TournamentRecord {
  id: number;
  name: string;
  date: string;
  players: string[];
  winner: string;
  bracket: BracketState;
}

export default class TournamentPage extends Page {
  private registeredPlayers: string[] = [];
  private maxPlayers = 8;

  private bracketState: BracketState = {
    qf: [],
    sf: [],
    final: {},
  };

  private history: TournamentRecord[] = [
    {
      id: 1,
      name: "Spring Championship",
      date: "2025-02-01",
      players: ["Alice", "Bob", "Céline", "David", "Eva", "Ferdy", "Gino", "Helena"],
      winner: "David",
      bracket: {
        qf: [
          { p1: "Alice", p2: "Bob", winner: "Bob" },
          { p1: "Céline", p2: "David", winner: "David" },
          { p1: "Eva", p2: "Ferdy", winner: "Eva" },
          { p1: "Gino", p2: "Helena", winner: "Gino" },
        ],
        sf: [
          { p1: "Bob", p2: "David", winner: "David" },
          { p1: "Eva", p2: "Gino", winner: "Eva" },
        ],
        final: { p1: "David", p2: "Eva", winner: "David" },
      },
    },
  ];

  async render(): Promise<HTMLElement> {
    const container = document.createElement("div");
    container.id = this.id;

    container.innerHTML = `
    <style>
      #tournament-wrapper {
        padding: 2rem;
        color: #f1f1f1;
        font-family: 'Press Start 2P', cursive;
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
        background: #2e9afe;
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
            justify-content: space-evenly /* <-- THIS MAKES THEM SPACED EVENLY */
            height: 92%; /* ensure container takes full height for spacing to work */
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


    </style>

    <div id="tournament-wrapper">
      <h1>🏆 Tournament Mode</h1>

      <div id="registration-box">
        <h2>Player Registration</h2>
        <input id="player-name" placeholder="Enter alias..." maxlength="12" />
        <button id="add-player-btn">Add player</button>
        <p id="players-list">0 / ${this.maxPlayers} players registered</p>
        <button id="start-btn" disabled>Start Tournament</button>
      </div>

      
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


      <div id="history-box">
        <h2>Tournament History</h2>
        <div id="history-list"></div>
      </div>
    </div>
    `;

    // === DOM elements ===
    const nameInput = container.querySelector("#player-name") as HTMLInputElement;
    const addBtn = container.querySelector("#add-player-btn") as HTMLButtonElement;
    const startBtn = container.querySelector("#start-btn") as HTMLButtonElement;
    const playersList = container.querySelector("#players-list") as HTMLParagraphElement;


    const historyDiv = container.querySelector("#history-list") as HTMLElement;

    // ------------------------------------
    //     UPDATE DISPLAY HELPERS
    // ------------------------------------

    const updatePlayerList = () => {
      playersList.innerText = `${this.registeredPlayers.length} / ${this.maxPlayers} players registered`;
      startBtn.disabled = this.registeredPlayers.length !== this.maxPlayers;
    };


    const drawHistory = () => {
      historyDiv.innerHTML = "";
      this.history.forEach((t) => {
        const entry = document.createElement("div");
        entry.className = "history-entry";
        entry.innerHTML = `
          <div class="history-title">🏆 ${t.name} — ${t.date}</div>
          <div><strong>Winner:</strong> <span style="color:#00ff90">${t.winner}</span></div>
          <div><strong>Players:</strong> ${t.players.join(", ")}</div>
        `;
        historyDiv.appendChild(entry);
      });
    };


    // ------------------------------------
    //     REGISTRATION LOGIC
    // ------------------------------------
    addBtn.onclick = () => {
      const name = nameInput.value.trim();
      if (!name) return;

      if (this.registeredPlayers.length >= this.maxPlayers) {
        alert("Tournament is full!");
        return;
      }
      this.registeredPlayers.push(name);
      nameInput.value = "";
      updatePlayerList();
    };

    // ------------------------------------
    //     START TOURNAMENT
    // ------------------------------------
    startBtn.onclick = () => {
      this.generateBracket();
    };

    // ------------------------------------
    //     INITIAL RENDER
    // ------------------------------------
    updatePlayerList();
    drawHistory();

    return container;
  }

  // ===============================================================
  //                BRACKET GENERATION LOGIC
  // ===============================================================

  private generateBracket() {
    const shuffled = [...this.registeredPlayers].sort(() => Math.random() - 0.5);

    this.bracketState.qf = [
      { p1: shuffled[0], p2: shuffled[1] },
      { p1: shuffled[2], p2: shuffled[3] },
      { p1: shuffled[4], p2: shuffled[5] },
      { p1: shuffled[6], p2: shuffled[7] },
    ];

    this.bracketState.sf = [
      { p1: undefined, p2: undefined },
      { p1: undefined, p2: undefined },
    ];

    this.bracketState.final = { p1: undefined, p2: undefined };
  }

}

import Page from '../template/page.ts';

declare const Chart: any;

/* 
en gros
component page PROFILE (pour voir le profil des autres)
- prends les donnees en fonction de l'URL navigateur
- si c'est vide call /api/me-info (pour juste recuperer ses propres infos)
- fill le HTML avec la data que lAPI me return
*/
export default class UserProfilePage extends Page {
  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.id = this.id;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.padding = '40px';
    container.style.backgroundColor = '#222'; // dark background
    container.style.color = '#fff';
    container.style.fontFamily = '"Press Start 2P", cursive'; // pixel font
    container.style.minHeight = '100vh';
    container.style.background =
      'radial-gradient(circle at top,rgba(11, 11, 11, 0.48) 0%, rgba(11, 11, 11, 0.21) 100%)';
    let pfp = 'https://avatars.githubusercontent.com/u/9919?s=200&v=4';

    const path = window.location.pathname; // e.g. /profile:john_doe
    const match = path.match(/^\/profile\/([^/]+)$/);
    let user_api_call = match ? 'api/profile/' + match[1] : null;
    if (!user_api_call) {
      user_api_call = 'api/me-info';
    }
    let USER_DATA: any;

    try {
      const response = await fetch(`http://localhost:3010/${user_api_call}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('User not found');
      }
      USER_DATA = !match ? (await response.json())?.user : await response.json();
      if (USER_DATA?.avatar_url) {
        pfp = USER_DATA.avatar_url;
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // document.getElementById('profile')!.innerHTML = `<p>User not found.</p>`;
    }
    let win_rate: string;
    if (USER_DATA?.wins != null && USER_DATA?.losses != null && USER_DATA.losses > 0) {
      // win_rate = (100 / (USER_DATA.wins / USER_DATA.losses)).toFixed(1) + '%';
      win_rate = ((USER_DATA.wins / (USER_DATA.wins + USER_DATA.losses)) * 100).toFixed(1) + '%';
    } else {
      win_rate = '--';
    }
    if (user_api_call == 'api/me-info') {
      USER_DATA.is_online = true;
    }
    const social_btns_HTML = !(user_api_call == 'api/me-info')
      ? `
      <div style="display: flex; gap: 12px;">
        <button style="${greenButtonStyle}">ADD FRIEND</button>
        <button style="${greenButtonStyle}">SEND DM</button>
      </div>
    `
      : '';
    container.innerHTML = `
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
      
      <style>
        .dashboard-panel {
          min-width: 600px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 25px;
        }

        .dashboard-panel canvas {
          background: rgba(15, 15, 15, 0.9);
          border-radius: 12px;
          border: 1px solid #00ffff44;
          box-shadow: 0 0 15px rgba(0,255,255,0.2);
          padding: 15px;
          width: 100%;
          max-width: 550px;
          height: 300px;
          animation: fadeIn 1s ease;
        }
        .dashboard-panel {
          min-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 25px;
        }

        .charts-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: flex-start;
          gap: 30px;
          width: 100%;
        }

        .dashboard-panel canvas {
          background: rgba(15, 15, 15, 0.24);
          border-radius: 12px;
          border: 2px solid rgba(98, 98, 98, 0.55);
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
          padding: 15px;
          flex: 1;
          min-width: 450px;
          height: 320px;
          animation: fadeIn 1s ease;
          transition: all 0.3s ease;
        }

        .dashboard-panel canvas:hover {
          transform: scale(1.03);
          box-shadow: 0 0 25px #00ffff55;
        }
      
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #1c1c1c;
        padding: 20px;
        border: 2px solid #333;
        width: 99%;
        border-radius: 13px;
        transition: all 0.3s ease;
      ">
        <div style="display: flex; align-items: center; gap: 16px; flex-direction: row; margin-bottom: 20px; 
          background-color: #00000054;
          padding: 10px 35px;
          border-radius: 15px;
        ">
          <img src="${pfp}" alt="User Avatar" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #fff;" />
          <div style="display: flex; align-items: center; gap: 1px; margin-right: 20px;  flex-direction: column;">
            <h1 style="font-size: 28px; margin: 0; color: white;">${USER_DATA?.username}</h1>
            <h2 style="font-size: 18px; margin: 0; color: white; margin-top: 5px; ">${USER_DATA?.elo} ELO 🏆</h2>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; margin-left:auto;">
            <span style="
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: ${USER_DATA?.is_online ? '#00ff44' : '#ff4c4c'};
              box-shadow: 0 0 8px ${USER_DATA?.is_online ? '#00ff44' : '#ff4c4c'};
              transition: background-color 0.3s, box-shadow 0.3s;
            "></span>
            <span style="
              font-size: 14px;
              color: ${USER_DATA?.is_online ? '#00ff44' : '#ff4c4c'};
              text-shadow: 0 0 4px ${USER_DATA?.is_online ? '#00ff44' : '#ff4c4c'};
            ">
              ${USER_DATA?.is_online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>



        <h1 style="font-size: 18px; margin: 10px; color: white; text-align: left;">WINRATE ${win_rate}</h1>
        <div style"display: flex; flex-direction: column; margin: 0 auto; min-width: 300px; margin-top: 30px;">
          <h1 style="font-size: 11px; margin: 0; color: white; text-align: left;">last seen: ${USER_DATA?.last_online}</h1>
          <h1 style="font-size: 11px; margin: 0; color: white; text-align: left;">member since: ${USER_DATA?.created_at}</h1>
        </div>

        <div style="display: flex; margin-top: 30px; gap: 30px; flex-wrap: wrap; justify-content: center;">

          <!-- GAMESSSSS -->
          <div id="game-history" style="flex: 1; min-width: 600px;
                border: 2px solid #333; padding: 16px;
                overflow-y: scroll;
                animation: fadeInUp 0.6s ease-out;
          >
            <h2 style="margin: 0 0 16px 0;">GAME-HISTORY</h2>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
              <span style="color: lime;">WINNER</span>
              <span style="color: red;">LOSER</span>
            </div>
            <div style="background: #222; padding: 8px; margin-bottom: 6px;">PLAYER-1 &nbsp;&nbsp;&nbsp; PLAYER-2</div>
          </div>

          <!-- STATISTICS -->
          <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 20px;">
            
            ${social_btns_HTML}
    

            <div style="border: 2px solid #333; padding: 16px; 
                animation: fadeInUp 1.1s ease-out;
            ">
              <h3 style="margin: 0 0 12px 0;">WINS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; LOSSES</h3>
              <div style="font-size: 32px;">
                <span style="color: lime;">${USER_DATA?.wins}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <span style="color: red;">${USER_DATA?.losses}</span>
              </div>
            </div>

            <!-- Achievements -->
            <div style="border: 2px solid #333; padding: 16px;
                    animation: fadeInUp 1.3s ease-out;
            ">
              <h3 style="margin: 0 0 12px 0;">ACHIEVEMENTS</h3>
              <div style="display: grid; grid-template-columns: repeat(3, 40px); gap: 12px;">
                <div style="width: 40px; height: 40px; background: #fff;"></div>
                <div style="width: 40px; height: 40px; background: #666;"></div>
                <div style="width: 40px; height: 40px; background: #666;"></div>
                <div style="width: 40px; height: 40px; background: #333;"></div>
                <div style="width: 40px; height: 40px; background: #333;"></div>
                <div style="width: 40px; height: 40px; background: #333;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- DASHBOARD SECTION -->
        <div class="panel dashboard-panel">
            <h3>📊 PERFORMANCE DASHBOARD</h3>
            <div style="display: flex; flex-direction: row; justify-content: space-between; width: 89%;  ">
              <h2 style="margin: 0;">WINS/LOSSES </h2>
              <h2 style="margin: 0;">GAMES ANALYSIS </h2>
            </div>
            <div class="charts-row">
              
              <canvas id="userPerformanceChart"></canvas>
              <canvas id="matchHistoryChart"></canvas>
            </div>
        </div>

      </div>
    `;
    // fill ts with game infos
    try {
      const g = await fetch(`http://localhost:3010/api/${USER_DATA?.username}/games`, {
        credentials: 'include',
      });
      const u = await g.json();
      u?.games.forEach((game: any) => {
        const e = document.createElement('div');
        e.className = 'game-entry';
        e.style.background = '#222';
        e.style.padding = '8px';
        e.style.marginBottom = '6px';
        e.style.display = 'flex';
        e.style.borderRadius = '12px';
        e.style.justifyContent = 'space-between';
        e.style.cursor = 'pointer';
        // e.style.fontSize = '12px';

        const winnerName = game.winner_id === 1 ? game.p1_name : game.p2_name;
        const L = winnerName === game.p1_name ? game.p2_name : game.p1_name;

        const w = winnerName === game.p1_name ? game.player1_score : game.player2_score;
        const l = winnerName === game.p1_name ? game.player2_score : game.player1_score;

        const ix = USER_DATA?.username == game.p1_name ? 1 : 2;

        if (game.winner_id == ix) {
          e.style.border = '2px solid #4fff4f';
        } else {
          if (game.player1_score != game.player2_score) e.style.border = '2px solid rgb(19, 19, 19)';
          else e.style.border = '2px solid rgba(255, 255, 255, 0.14)';
        }
        const p1Link = `<a href="/profile/${encodeURIComponent(game.p1_name)}" 
                     style="color: #00ffff; text-decoration: underline;">${game.p1_name}</a>`;
        const p2Link = `<a href="/profile/${encodeURIComponent(game.p2_name)}" 
                     style="color: #00ffff; text-decoration: underline;">${game.p2_name}</a>`;
        USER_DATA?.username;
        e.innerHTML = `
              <span style="color: lime; font-size: 11px; ">${winnerName} (${w})</span>
              <span style="color: white;"> ${game.p1_name == USER_DATA?.username ? game.p1_name : p1Link} 
                vs  ${game.p2_name == USER_DATA?.username ? game.p2_name : p2Link} </span>
              <span style="color: red; font-size: 11px; ">${L} (${l})</span>
            `;
        const h = container.querySelector('#game-history');
        if (h) {
          h.appendChild(e);
        }
      });

      // call dashboard func && load chart.js
      const chartScript = document.createElement('script');
      chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      chartScript.onload = () => {
        // Once loaded, build charts
        const ctx1 = (container.querySelector('#userPerformanceChart') as HTMLCanvasElement).getContext('2d');
        const ctx2 = (container.querySelector('#matchHistoryChart') as HTMLCanvasElement).getContext('2d');

        const winRate = USER_DATA?.wins || 0;
        const lossRate = USER_DATA?.losses || 0;
        // const totalGames = winRate + lossRate;
        // const winPercent = totalGames ? Math.round((winRate / totalGames) * 100) : 0;

        // user Performance Chart (Doughnut)
        new Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels: ['Wins', 'Losses'],
            datasets: [
              {
                data: [winRate, lossRate],
                backgroundColor: ['#09ff00ff', '#ff1e1eff'],
                borderColor: '#111',
                borderWidth: 2,
                hoverOffset: 20,
              },
            ],
          },
          options: {
            maintainAspectRatio: false, // <--- key fix
            aspectRatio: 1.6, // optional (wider ratio looks natural)
            plugins: {
              legend: {
                labels: {
                  color: '#BBBBBB',
                  font: { family: 'Press Start 2P', size: 8 },
                },
              },
            },
            animation: {
              animateScale: true,
              animateRotate: true,
            },
          },
        });
        const font = new FontFace(
          'Press Start 2P',
          'url(https://fonts.gstatic.com/s/pressstart2p/v12/e3t4euO8T-267oIAQAu6jDQyK3nVivNj.woff2)'
        );
        font.load().then(loaded_f => {
          document.fonts.add(loaded_f);
        });
        document.fonts.add(font);
        // Match History Chart (Line)
        // either charts from actual data
        // or default chart samplee.
        if (u?.games?.length > 0) {
          const labels: string[] = ['----'],
            differences: number[] = [0];
          u.games.forEach((game: any, index: number) => {
            // label: "player1 vs player2"
            labels.push(`${index}: ${game.p1_name} vs ${game.p2_name}`);
            // difference: (player1 - player2)
            let diff = 0;
            if (USER_DATA.username === game.p1_name) diff = game.player1_score - game.player2_score;
            else if (USER_DATA.username === game.p2_name) diff = game.player2_score - game.player1_score;
            else diff = game.player1_score - game.player2_score;

            differences.push(diff);
          });
          new Chart(ctx2, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Score Difference',
                  data: differences,
                  fill: false,
                  borderColor: '#00ffff',
                  backgroundColor: '#444444',
                  tension: 0.4,
                  pointRadius: 5,
                  pointHoverRadius: 8,
                  pointBackgroundColor: '#0099ffff',
                },
              ],
            },
            options: {
              maintainAspectRatio: false, // <--- key fix
              aspectRatio: 1.6, // optional (wider ratio looks natural)
              scales: {
                x: {
                  ticks: { color: '#00ffff', font: { family: 'Press Start 2P', size: 8 } },
                  grid: { color: '#222' },
                },
                y: {
                  ticks: { color: '#00ffff', font: { family: 'Press Start 2P', size: 8 } },
                  grid: { color: '#333' },
                },
              },
              plugins: {},
              animation: { duration: 1600, easing: 'easeOutQuart' },
            },
          });
        } else {
          new Chart(ctx2, {
            type: 'line',
            data: {
              labels: ['Game 1', 'Game 2', 'Game 3', 'Game 4', 'Game 5', 'Game 6'],
              datasets: [
                {
                  label: 'Score Difference',
                  data: [3, -2, 1, 4, -1, 8],
                  fill: false,
                  borderColor: '#00ffff',
                  backgroundColor: '#444444',
                  tension: 0.4,
                  pointRadius: 5,
                  pointHoverRadius: 8,
                  pointBackgroundColor: '#ffffffff',
                },
              ],
            },
            options: {
              maintainAspectRatio: false, // <--- key fix
              aspectRatio: 1.6, // optional (wider ratio looks natural)
              scales: {
                x: {
                  ticks: { color: '#ffffffff', font: { family: 'Press Start 2P', size: 8 } },
                  grid: { color: '#222' },
                },
                y: {
                  ticks: { color: '#ffffffff', font: { family: 'Press Start 2P', size: 8 } },
                  grid: { color: '#333' },
                },
              },
              plugins: {
                title: {
                  display: true,
                  text: 'This chart will show the score difference between players across recent matches',
                  color: '#11ff00ff',
                  font: { family: 'Press Start 2P', size: 18 },
                  padding: { top: 5, bottom: 9 },
                },
                legend: {
                  display: true,
                  labels: {
                    color: '#ffffffff',
                    font: { family: 'Press Start 2P', size: 9 },
                    padding: 15,
                  },
                },
              },
              animation: { duration: 1200, easing: 'easeOutQuart' },
            },
          });
        }
      };
      document.body.appendChild(chartScript);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }

    return container;
  }
}

// ✅ Green pixel-style button
const greenButtonStyle = `
  background-color: #0f0;
  color: black;
  font-weight: bold;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  padding: 10px 14px;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 6px #0f0;
  transition: transform 0.2s ease;
}
button:hover {
  transform: scale(1.05);
}
`;

import Page from '../template/page.ts';
export default class Header extends Page {
  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.id = this.id;
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.padding = '15px';
    // container.style.backgroundColor = '#2b2b2bff';
    // container.style.boxShadow = '0 4px 8px rgba(24, 24, 24, 1)';
        container.style.background = 'linear-gradient(180deg, #2b2b2b 0%, #1f1f1f 100%)';
    container.style.boxShadow = '0 0 25px rgba(184, 184, 184, 0.2)';
    container.style.marginTop = '5px';
    container.style.marginLeft = 'auto';
    container.style.marginRight = 'auto';
    container.style.fontFamily = '"Press Start 2P", cursive'; // pixel font
    container.style.zIndex = '1000';
    container.style.borderRadius = '18px';
    container.style.width = '99%';
    container.style.minWidth = '99%';
    container.style.marginBottom = '10px';

    // Inject inner HTML
    container.innerHTML = `
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

      <style>
        #header-container {
          text-align: center;
          font-family: 'Press Start 2P', cursive;
          color: #00ffff;
          transition: all 0.3s ease;
        }

        #header-container h1 {
          font-size: 30px;
          color: #00ffff;
          text-shadow: 0 0 10px #00ffff, 0 0 20px #0088ff;
          margin-bottom: 5px;
          letter-spacing: 1px;
          animation: headerGlow 2s ease-in-out infinite alternate;
        }

        #online-count {
          font-size: 12px;
          color: #6bff6b;
          margin-bottom: 30px;
          text-shadow: 0 0 4px #00ff00;
        }

        #header-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        button {
          position: relative;
          font-family: 'Press Start 2P', cursive;
          font-size: 10px;
          padding: 10px 20px;
          background: linear-gradient(145deg, #101010, #1b1b1b);
          border: 2px solid #00ffff;
          color: #00ffff;
          border-radius: 10px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          text-transform: uppercase;
          box-shadow: 0 0 10px rgba(0,255,255,0.1);
        }

        button:hover {
          background: #00ffff;
          color: #000;
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 0 20px #00ffff, 0 0 30px #00ffff inset;
        }

        /* Ripple click animation */
        button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255,255,255,0.5);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: width 0.5s ease, height 0.5s ease, opacity 0.3s ease;
        }

        button:active::after {
          width: 200%;
          height: 200%;
          opacity: 0;
          transition: 0s;
        }

        /* Logout button special */
        #logoutBtn {
          border-color: #ff5555;
          color: #ff5555;
        }

        #logoutBtn:hover {
          background: #ff5555;
          color: #000;
          box-shadow: 0 0 25px #ff5555, 0 0 30px #ff5555 inset;
        }

        /* Glow animation for header text */
        @keyframes headerGlow {
          from { text-shadow: 0 0 5px #00ffff, 0 0 15px #0088ff; }
          to { text-shadow: 0 0 15px #00ffff, 0 0 30px #00ccff; }
        }
      </style>

      <div id="header-container">
        <h1>Transcendance</h1>

        <div id="online-count">playerz online</div>

        <div id="header-buttons">
          <button id="homeBtn">Home</button>
          <button id="playBtn">Play</button>
          <button id="leaderboardBtn">Leaderboard</button>
          <button id="friendsBtn">Friends</button>
          <button id="tournamentBtn">Tournament</button>
          <button id="logoutBtn">Logout</button>
        </div>
      </div>
    `;

    // Button event handlers
    container.querySelector('#leaderboardBtn')?.addEventListener('click', () => {
      this.router.navigate('/leaderboard');
    });
    container.querySelector('#homeBtn')?.addEventListener('click', () => {
      this.router.navigate('/');
    });
    container.querySelector('#playBtn')?.addEventListener('click', () => {
      this.router.navigate('/play');
    });
    container.querySelector('#friendsBtn')?.addEventListener('click', () => {
      this.router.navigate('/friends');
    });
    container.querySelector('#logoutBtn')?.addEventListener('click', async () => {
      try {
        const res = await fetch('http://localhost:3010/api/logout', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          console.log('[+] Logged out successfully');
          localStorage.clear();
          this.router.navigate('/');
        } else {
          console.error('[-] Logout failed');
        }
      } catch (err) {
        console.error('[-] Error during logout:', err);
      }
    });
    const activeButtonStyle = `
      background-color: #d0d0d0ff;
      color: black;
      font-weight: bold;
    `;
    const curpath = window.location.pathname;
    const routeButtonMap: Record<string, string> = {
      '/': 'homeBtn',
      '/play': 'playBtn',
      '/leaderboard': 'leaderboardBtn',
      '/friends': 'friendsBtn',
    };
    Object.entries(routeButtonMap).forEach(([route, buttonId]) => {
      const b = container.querySelector(`#${buttonId}`) as HTMLButtonElement;
      if (b &&  curpath.startsWith(route)) {
        if(curpath == "/" && route != "/")
          return;
        b.style.cssText += activeButtonStyle;
      }
    });


    const _count = container.querySelector('#online-count') as HTMLElement;
    const updateOnlineCount = async () => {
      try {
        const res = await fetch('http://localhost:3010/api/users/online', {
          credentials: 'include',
        });
        const json = await res.json();
        if (json.success) {
          _count.innerText = `${json.data.online_players} playerz online.`;
        }
      } catch (err) { _count.innerText = '⚠️ Server error'; }
    };
    // auto-refresh every 45 seconds
    updateOnlineCount();
    setInterval(updateOnlineCount, 45000);    
    return container;
  }
}
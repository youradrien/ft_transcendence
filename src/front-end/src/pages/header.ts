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
   
      <h1 style = "margin-bottom: 5px; ">Transcendance</h1>

      <div id="online-count" style="
        font-size: 12px;
        color: #6bff6bff;
        margin-bottom: 30px;
      ">
         playerz online
      </div>

      <div style="
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      ">
      <style>
      </style>
        <button id="homeBtn" >Home</button>
        <button id="playBtn" >Play</button>
        <button id="leaderboardBtn" >Leaderboard</button>
        <button id="friendsBtn">Friends</button>
        <button id="friendsBtn">Tournament</button>
        <button id="logoutBtn" style="background-color: #f44336; color: white;">Logout</button>
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
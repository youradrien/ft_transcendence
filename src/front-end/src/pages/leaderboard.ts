import Page from '../template/page.ts';

type Player = {
  username: string;
  avatar_url: string;
  elo: number;
};

export default class LeaderboardPage extends Page {
  constructor(id: string, router: any) {
    super(id, router);
  }

  async FETCH_PLAYERS(): Promise<Player[]> {
    try {
      const R = await fetch('http://localhost:3010/api/leaderboard', {
        credentials: 'include'
      });
      if (!R.ok)
        throw new Error(`API error: ${R.status} + ${R.json()}`);
      const _data = await R.json();
      return _data?.users; // Adjust this depending on how your API sends data
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }

  async render(): Promise<HTMLElement> {
    const _playerz = await this.FETCH_PLAYERS();
    const container = document.createElement('div');
    container.id = this.id;
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px',
      backgroundColor: '#181818d1',
      color: 'white',
      fontFamily: '"Press Start 2P", cursive',
      minHeight: '70vh',
      maxHeight: '70vh',
      borderRadius: '18px'
    });
    container.innerHTML = `
      <h1 style="font-size: 24px; margin-bottom: 30px;">LEADERBOARD</h1>
      <div id="leaderboard" style="
        width: 100%;
        max-width: 850px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        cursor: crosshair;
      ">
        ${_playerz.length === 0 ? '<div>No players found.</div>' : ''}
      </div>
    `;

    const list = container.querySelector('#leaderboard') as HTMLElement;
    const sortedPlayers = [..._playerz].sort((a, b) => b.elo - a.elo);
    sortedPlayers.forEach((player, index) => {
      const C = document.createElement('div');
      C.style.display = 'flex';
      C.style.alignItems = 'center';
      C.style.justifyContent = 'space-between';
      C.style.padding = '16px';
      C.style.background = '#1c1c1c';
      C.style.border = '2px solid #333';
      C.style.borderRadius = '8px';
      C.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.1)';
      C.style.transition = 'transform 0.35s ease';
      C.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px; cursor: crosshair;">
          <div style="font-size: 12px; color: lime; cursor: crosshair;">#${index + 1}</div>
          <img src="${player.avatar_url}" alt="${player.username}" style="
            width: 55px;
            height: 55px;
            border-radius: 50%;
            border: 2px solid white;
          " />
          <div style="font-size: 16px; display: flex; flex-direction: column">
              <p style="margin: 0px;" >  ${player.username} </p>
              <p style="text-align: left; margin: 0px; font-size: 10px;" >  ${player.username} </p>
            </div>
        </div>
        <div style="font-size: 13px; color: #0f0; cursor: crosshair;">${player.elo}</div>
      `;
      // movement effect
      C.addEventListener('mouseenter', () => {
        C.style.transform = 'translateY(-10px) scale(1.04)';
        C.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.4)';
      });
      C.addEventListener('mouseleave', () => {
        C.style.transform = 'translateY(0) scale(1)';
        C.style.boxShadow = '0 0 8px rgba(0, 255, 0, 0.1)';
      });

      C.addEventListener('click', () => {
        this.router.navigate(`/profile/${player.username}`);
      });
      list.appendChild(C);
    });

    return container;
  }
}
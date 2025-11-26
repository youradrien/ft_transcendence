import Page from '../template/page.ts';
import { i18n } from '../i18n';


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
      position: "relative",
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
      <h1 style="font-size: 24px; margin-bottom: 30px;">${i18n.t('leaderboard_title')}</h1>
      <div id="leaderboard" style="
        width: 100%;
        max-width: 850px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        cursor: crosshair;
      ">
        ${_playerz.length === 0 ? `<div>${i18n.t('no_players_found')}</div>` : ''}
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
          <div style="font-size: 16px;">${player.username}</div>
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
	//   C.addEventListener('click', async () => {
    //   const profile = new UserProfilePage('profile-page', this.router);
    //   const profileEl = await profile.render({ showCanvas: true }); // orbes activées
    //   const outlet = document.getElementById('app'); // ton outlet principal
    //   outlet!.innerHTML = '';
    //   outlet!.appendChild(profileEl);
    //   history.pushState(null, '', `/profile/${player.username}`); // met à jour l'URL
    //   });


      C.addEventListener('click', () => {
        this.router.navigate(`/profile/${player.username}`);
      });
      list.appendChild(C);
    });


	// YELLOW ORBS !!

	const trophyContainer = document.createElement('div');
	Object.assign(trophyContainer.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100%',
		height: '100%',
		pointerEvents: 'none',
		zIndex: '-1',
	});

	const NUM_TROPHIES_SIDE = 72;
	const sides = ['left', 'right'];

	sides.forEach(side => {

		for (let i = 0; i < NUM_TROPHIES_SIDE; i++) {

			const trophy = document.createElement('div');
			Object.assign(trophy.style, {
			width: '8px',
			height: '8px',
			backgroundColor: 'yellow',
			border: '1px solid orange',
			borderRadius: '50%',
			position: 'absolute',
			top: `${Math.random() * 95 + 2.5}%`,
			animation: `blink ${Math.random() * 2 + 1}s infinite alternate`
		});

		if (side === 'left') {
			trophy.style.left = `${Math.random() * 50}%`; // 0 → 25% largeur page
			trophy.style.right = 'auto';
		} else {
			trophy.style.right = `${Math.random() * 50}%`; // 0 → 25% largeur page côté droit
			trophy.style.left = 'auto';
		}

		trophyContainer.appendChild(trophy);
	}
  });

	const style = document.createElement('style');
	style.textContent = `
		@keyframes blink {
		0% { opacity: 0.2; transform: translateY(0); }
		50% { opacity: 1; transform: translateY(-2px); }
		100% { opacity: 0.2; transform: translateY(0); }
	}
	`;
	document.head.appendChild(style);
	container.appendChild(trophyContainer);

	return container;
  }
}

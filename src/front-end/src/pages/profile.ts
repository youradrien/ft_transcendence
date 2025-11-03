import Page from '../template/page.ts';

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
    
      
    const path = window.location.pathname; // e.g. /profile:john_doe
    const match = path.match(/^\/profile:(.+)$/);
    let user_api_call = match ? ("/api/profile/" + match[1]) : null;
    if(!user_api_call){
      user_api_call = "api/me-info"
    }
    let USER_DATA: any;

    try {
        const response = await fetch(`http://localhost:3010/${user_api_call}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('User not found');
        }
        USER_DATA = (await response.json())?.user;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // document.getElementById('profile')!.innerHTML = `<p>User not found.</p>`;
    }
    
    const social_btns_HTML = !(user_api_call == "api/me-info") ? `
      <div style="display: flex; gap: 12px;">
        <button style="${greenButtonStyle}">ADD FRIEND</button>
        <button style="${greenButtonStyle}">SEND DM</button>
      </div>
    ` : '';
    container.innerHTML = `
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #1c1c1c;
        padding: 30px;
        border: 2px solid #333;
        width: 1000px;
        border-radius: 13px;
      ">
        <div style="display: flex; align-items: center; gap: 16px;">
          <img src="https://avatars.githubusercontent.com/u/9919?s=200&v=4" alt="User Avatar"
            style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid #fff;" />
          <h1 style="font-size: 28px; margin: 0; color: white;">${USER_DATA?.username}</h1>
        </div>

        <div style"display: flex; flex-direction: column; margin: 0 auto; min-width: 300px">
          <h1 style="font-size: 13px; margin: 0; color: white; text-align: left;">last seen: ${USER_DATA?.last_online}</h1>
          <h1 style="font-size: 13px; margin: 0; color: white; text-align: left;">member since: ${USER_DATA?.created_at}</h1>
        </div>

        <div style="display: flex; margin-top: 30px; gap: 30px; flex-wrap: wrap; justify-content: center;">

          <!-- GAMESSSSS -->
          <div id="game-history" style="flex: 1; min-width: 600px; border: 2px solid #333; padding: 16px; overflow-y: scroll;">
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
    

            <div style="border: 2px solid #333; padding: 16px;">
              <h3 style="margin: 0 0 12px 0;">WINS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; LOSSES</h3>
              <div style="font-size: 32px;">
                <span style="color: lime;">${USER_DATA?.wins}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <span style="color: red;">${USER_DATA?.losses}</span>
              </div>
            </div>

            <!-- Achievements -->
            <div style="border: 2px solid #333; padding: 16px;">
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
      </div>
    `;
    // fill ts with game infos
    try {
        const g = await fetch(`http://localhost:3010/api/${USER_DATA?.username}/games`, {
          credentials: 'include'
        });
        let u = await(g.json());
        u?.games.forEach((game: any) => {
          const e = document.createElement('div');
          e.className = 'game-entry';
          e.style.background = '#222';
          e.style.padding = '8px';
          e.style.marginBottom = '6px';
          e.style.display = 'flex';
          e.style.borderRadius = '12px';
          e.style.justifyContent = 'space-between';
          // e.style.fontSize = '12px';

          const winnerName = (game.winner_id === 1 ? game.p1_name : game.p2_name);
          const L  = (winnerName === game.p1_name) ? game.p2_name : game.p1_name;

          const w = (winnerName === game.p1_name) ? game.player1_score : game.player2_score;
          const l  = (winnerName === game.p1_name) ? game.player2_score : game.player1_score;
          if(winnerName == USER_DATA.username){
            e.style.border = '2px solid #4fff4f';
          }else{
            if(game.player1_score != game.player2_score)
              e.style.border = '2px solid #800';
          }
          e.innerHTML = `
            <span style="color: lime; font-size: 11px; ">${winnerName} (${w})</span>
            <span style="color: white;">${game?.p1_name} vs ${game?.p2_name}</span>
            <span style="color: red; font-size: 11px; ">${L} (${l})</span>
          `;
          const h = container.querySelector('#game-history');
          if(h)
          {

            h.appendChild(e);
          }
        });
        
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
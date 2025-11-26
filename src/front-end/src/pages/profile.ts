import Page from '../template/page.ts';
import { i18n } from '../i18n';
          declare const Chart: any;

type FriendshipStatus = 'friends' | 'pending' | 'none';

/* 
en gros
component page PROFILE (pour voir le profil des autres)
- prends les donnees en fonction de l'URL navigateur
- si c'est vide call /api/me-info (pour juste recuperer ses propres infos)
- fill le HTML avec la data que lAPI me return
*/
export default class UserProfilePage extends Page {

  async getFriendshipStatus(username: string): Promise<FriendshipStatus> {
    try {
        const res = await fetch(`http://localhost:3010/api/friends/status/${username}`, {
            credentials: 'include',
        });

        if (!res.ok) {
            console.error('Failed to fetch friendship status:', res.statusText);
            return 'none';
        }

        const data = await res.json();

        if (!data.success) {
            console.error('API returned error:', data.error);
            return 'none';
        }

        if (['friends', 'pending', 'none'].includes(data.status)) {
            return data.status as FriendshipStatus;
        } else {
            console.warn('Unexpected friendship status:', data.status);
            return 'none';
        }
    } catch (err) {
        console.error('Error fetching friendship status:', err);
        return 'none';
    }
}

  async render(options?: { showCanvas?: boolean}): Promise<HTMLElement> {

	const { showCanvas = true } = options || {};
    const container = document.createElement('div');
    container.id = this.id;
	container.style.position = "relative";
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.padding = '40px';
    container.style.backgroundColor = '#222'; // dark background
    container.style.color = '#fff';
    container.style.fontFamily = '"Press Start 2P", cursive'; // pixel font
    container.style.minHeight = '100vh';
    container.style.background = 'radial-gradient(circle at top,rgba(11, 11, 11, 0.48) 0%, rgba(11, 11, 11, 0.21) 100%)';
    let pfp = "https://avatars.githubusercontent.com/u/9919?s=200&v=4";

	let currentUser: { username: string } | null = null;
	try {
			const meRes = await fetch('http://localhost:3010/api/me-info', {
			credentials: 'include'
		});
		if (meRes.ok) {
			const data = await meRes.json();
			currentUser = data.user; // data.user.username, etc.
		}
	} catch (err) {
    	console.error('Failed to fetch current user', err);
	}

    const path = window.location.pathname; // e.g. /profile:john_doe
    const match = path.match(/^\/profile\/([^/]+)$/);
	const viewedUsername = match ? match[1] : currentUser?.username;
	const isMyProfile = currentUser?.username === viewedUsername;
    let user_api_call = match ? ("api/profile/" + match[1]) : null;
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
        USER_DATA = !match ? 
          (await response.json())?.user
          :
          (await response.json());
        if(USER_DATA?.avatar_url){
          pfp = USER_DATA.avatar_url;
        }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // document.getElementById('profile')!.innerHTML = `<p>${i18n.t('user_not_found')}</p>`;
    }
    let win_rate: string;
    if (USER_DATA?.wins != null && USER_DATA?.losses != null && USER_DATA.losses > 0) {
        // win_rate = (100 / (USER_DATA.wins / USER_DATA.losses)).toFixed(1) + '%';
        win_rate = ((USER_DATA.wins / (USER_DATA.wins + USER_DATA.losses)) * 100).toFixed(1) + '%';
    } else {
        win_rate = '--';
    }
    if( user_api_call == "api/me-info" ){
      USER_DATA.is_online = (true);
    }
    const social_btns_HTML = !(user_api_call == "api/me-info") ? `
      <div style="display: flex; gap: 12px;">
        <button id="add-friend-btn" style="${greenButtonStyle}">${i18n.t('add_friend')}</button>
        <button id="unfriend-btn" style="${greenButtonStyle}; display:none; background-color:#ff4444;">${i18n.t('unfriend')}</button>
        <button id="pending-btn" style="${greenButtonStyle}; display:none; background-color:#ffcc33;">${i18n.t('pending_decline')}</button>
        <button id="send-dm-btn" style="${greenButtonStyle}">${i18n.t('send_dm')}</button>
      </div>
    ` : '';

    const editBtnHTML = isMyProfile ? `
      <button id="edit-username-btn" style="background: none; border: none; cursor: pointer; font-size: 14px; margin-left: 8px;" title="Edit">
        ✏️
      </button>
    ` : '';

    const avatarEditOverlay = isMyProfile ? `
      <div id="avatar-edit-overlay" style="
        position: absolute;
        top: 0;
        left: 0;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        <span style="font-size: 24px;">📷</span>
      </div>
    ` : '';

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

        #avatar-container:hover #avatar-edit-overlay {
          display: flex !important;
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
          animation: fadeInUp 0.35s ease-out;
        ">
          <div id="avatar-container" style="position: relative; width: 80px; height: 80px;">
            <img id="profile-avatar" src="${pfp}" alt="User Avatar" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #fff;" />
            ${avatarEditOverlay}
          </div>
          <div style="display: flex; align-items: center; gap: 1px; margin-right: 20px;  flex-direction: column;">
            <div style="display: flex; align-items: center;">
              <h1 style="font-size: 28px; margin: 0; color: white;">${USER_DATA?.username}</h1>
              ${editBtnHTML}
            </div>
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
              ${USER_DATA?.is_online ? i18n.t('online') : i18n.t('offline')}
            </span>
          </div>
        </div>



        <h1 style="font-size: 18px; margin: 10px; color: white; text-align: left;">${i18n.t('winrate')} ${win_rate}</h1>
        <div style="display: flex; flex-direction: column; margin: 0 auto; min-width: 300px; margin-top: 30px;">
          <h1 style="font-size: 11px; margin: 0; color: white; text-align: left;">${i18n.t('last_seen')} ${USER_DATA?.last_online}</h1>
          <h1 style="font-size: 11px; margin: 0; color: white; text-align: left;">${i18n.t('member_since')} ${USER_DATA?.created_at}</h1>
        </div>

        <div style="display: flex; margin-top: 30px; gap: 30px; flex-wrap: wrap; justify-content: center;">

          <!-- GAMESSSSS -->
          <div id="game-history" style="flex: 1; min-width: 600px;
                border: 2px solid #333; padding: 16px;
                overflow-y: scroll;
                animation: fadeInUp 0.6s ease-out;
          ">
            <h2 style="margin: 0 0 16px 0;">${i18n.t('game_history')}</h2>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
              <span style="color: lime;">${i18n.t('winner_caps')}</span>
              <span style="color: red;">${i18n.t('loser')}</span>
            </div>
            <div style="background: #222; padding: 8px; margin-bottom: 6px;">${i18n.t('player_1')} &nbsp;&nbsp;&nbsp; ${i18n.t('player_2')}</div>
          </div>

          <!-- STATISTICS -->
          <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column, gap: 20px;">
            
            ${social_btns_HTML}
            <div style="border: 2px solid #333; padding: 16px; 
                animation: fadeInUp 1.1s ease-out;
            ">
              <h3 style="margin: 0 0 12px 0;">${i18n.t('wins')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${i18n.t('losses')}</h3>
              <div style="font-size: 32px;">
                <span style="color: lime;">${USER_DATA?.wins}</span> &nbsp;&nbsp;&nbsp;&nbsp;
                <span style="color: red;">${USER_DATA?.losses}</span>
              </div>
            </div>

        </div>

        <!-- DASHBOARD SECTION -->
        <div class="panel dashboard-panel">
            <h3>📊 ${i18n.t('performance_dashboard')}</h3>
            <div style="display: flex; flex-direction: row; justify-content: space-between; width: 89%;  ">
              <h2 style="margin: 0;">${i18n.t('wins_losses')} </h2>
              <h2 style="margin: 0;">${i18n.t('games_analysis')} </h2>
            </div>
            <div class="charts-row">
              
              <canvas id="userPerformanceChart"></canvas>
              <canvas id="matchHistoryChart"></canvas>
            </div>
        </div>

      </div>
    `;

	const content = document.getElementById('content');
	if (content) {
		content.innerHTML = '';
		content.appendChild(container);
	}

	//// BLUE ORBS IF OPTION SHOWCANVAS ////
		if (showCanvas) {

			const orbContainer = document.createElement('div');
			Object.assign(orbContainer.style, {
			position: 'fixed',
			top: '0',
			left: '0',
			width: '100%',
			height: '100%',
			pointerEvents: 'none',
			zIndex: '-1'
		});

		const NUM_ORBS = 80;
		for (let i = 0; i < NUM_ORBS; i++) {
			const orb = document.createElement('div');
			const size = Math.random() * 6 + 4;
			Object.assign(orb.style, {
				width: `${size}px`,
				height: `${size}px`,
				background: '#00ffff',
				position: 'absolute',
				borderRadius: '50%',
				opacity: (Math.random() * 0.3 + 0.1).toString(),
				left: `${Math.random() * 100}%`,
				top: `${Math.random() * 100}%`,
				animation: `orbBlink ${1.5 + Math.random() * 3}s infinite ease-in-out`
			});
			orbContainer.appendChild(orb);
		}

		// Orbs animation
		if (!document.querySelector('#orbBlink-style')) {

			const style = document.createElement('style');
			style.id = 'orbBlink-style';
			style.textContent = `
			@keyframes orbBlink {
				0% { transform: scale(0.8); opacity: 0.1; }
				50% { transform: scale(1); opacity: 0.5; }
				100% { transform: scale(0.8); opacity: 0.1; }
			}`;
			document.head.appendChild(style);
		}

		container.appendChild(orbContainer);
	}

// Logic for edit username button
  const editUsernameBtn = container.querySelector('#edit-username-btn') as HTMLButtonElement;
    if (editUsernameBtn) {
      editUsernameBtn.onclick = async () => {
        const newName = prompt("New username:", USER_DATA?.username);
        if (newName && newName !== USER_DATA?.username) {
          try {
            const res = await fetch('http://localhost:3010/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ username: newName })
            });
            
            const data = await res.json();
            if (res.ok && data.success) {
                window.location.reload();
            } else {
                alert("Failed to update username: " + (data.error || data.message || "Unknown error"));
            }
          } catch (e) {
            console.error(e);
            alert("Error updating username");
          }
        }
      };
    }

  // Logic for edit profile picture
  if (isMyProfile) {
    const avatarContainer = container.querySelector('#avatar-container') as HTMLElement;
    const avatarEditOverlay = container.querySelector('#avatar-edit-overlay') as HTMLElement;
    
    if (avatarContainer && avatarEditOverlay) {
      avatarEditOverlay.onclick = async () => {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (!file)
            return;
          
          if (file.size > 3 * 1024 * 1024) {
            alert('File too large. Maximum size is 3MB.');
            return;
          }
          
          if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
          }
          
          try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64String = event.target?.result as string;
              
              // Check base64 size (max ~4MB base64 = ~3MB file)
              if (base64String.length > 4 * 1024 * 1024) {
                alert('Image too large after conversion. Please select a smaller image (max 3MB).');
                return;
              }
              
              try {
                const res = await fetch('http://localhost:3010/api/user/avatar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ avatar_url: base64String })
                });
                
                const data = await res.json();
                if (res.ok && data.success) {
                  // Update avatar immediately without reload
                  const avatarImg = container.querySelector('#profile-avatar') as HTMLImageElement;
                  if (avatarImg) {
                    avatarImg.src = base64String;
                  }
                  alert('Avatar updated successfully!');
                } else {
                  console.error('Avatar update failed:', data);
                  alert("Failed to update avatar: " + (data.error || data.message || "Unknown error"));
                }
              } catch (fetchError) {
                console.error('Network error:', fetchError);
                alert('Failed to upload image. The file may be too large or there was a network error. Please try a smaller image (max 2MB recommended).');
              }
            };
            
            reader.onerror = () => {
              alert('Error reading file. Please try again.');
              console.error('FileReader error');
            };
            
            reader.readAsDataURL(file);
          } catch (e) {
            console.error('Unexpected error:', e);
            alert("Error processing image. Please try a smaller file.");
          }
        };
        
        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
      };
    }
  }

	// Button for adding the current user as a friend :
	const addFriendBtn = container.querySelector('#add-friend-btn') as HTMLButtonElement;  
	if (addFriendBtn) {

		addFriendBtn.onclick = async () => {
			addFriendBtn.disabled = true;
			addFriendBtn.textContent = i18n.t('sending');

			try {
				const route = 'api/friends/requests';
				const response = await fetch(`http://localhost:3010/${route}`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ username: USER_DATA.username })
				});

				const data = await response.json();

				if (data.success) {
					addFriendBtn.textContent = i18n.t('sent');
					addFriendBtn.style.backgroundColor = "#888";
				} else {
					addFriendBtn.disabled = false;
					addFriendBtn.textContent = i18n.t('add_friend_btn');
					alert(`${i18n.t('friend_request_failed')}${data.error}`);
				}
			} catch (error) {
				addFriendBtn.disabled = false;
				addFriendBtn.textContent = i18n.t('add_friend_btn');
				console.error('Error adding friend:', error);
			}
		};
	}

	// Logic for activate the correct button regarding the user's relationship with the viewed profile :
	if (!isMyProfile) {

		const statusRes = await fetch(`http://localhost:3010/api/friends/status/${USER_DATA.username}`, {
			credentials: 'include'
		});
		const statusData = await statusRes.json();
		const status = statusData.status;
		const pendingType = statusData.pendingType || null;

		const unfriendBtn = container.querySelector('#unfriend-btn') as HTMLButtonElement;
		const pendingBtn = container.querySelector('#pending-btn') as HTMLButtonElement;

		if (status === 'friends') {

			addFriendBtn.style.display = 'none';
			pendingBtn.style.display = 'none';
			unfriendBtn.style.display = 'inline-block';
		} else if (status === 'pending') {

			addFriendBtn.style.display = 'none';
			unfriendBtn.style.display = 'none';
			pendingBtn.style.display = 'inline-block';

			if (pendingType === 'received') {
				pendingBtn.disabled = true;
				pendingBtn.textContent = i18n.t('request_received');
			} else {
				 pendingBtn.disabled = false;
			}
		} else {
			addFriendBtn.style.display = 'inline-block';
			unfriendBtn.style.display = 'none';
			pendingBtn.style.display = 'none';
		}

		// Unfriend button activation (if the current user and the viewed profile are already friends) :
		if (unfriendBtn) {

			unfriendBtn.onclick = async () => {

				unfriendBtn.disabled = true;
				unfriendBtn.textContent = i18n.t('processing');

				const res = await fetch(`http://localhost:3010/api/friends/${USER_DATA.username}`, {
					method: 'DELETE',
					credentials: 'include'
				});

				const data = await res.json();
				if (data.success) {
					unfriendBtn.style.display = 'none';
					addFriendBtn.style.display = 'inline-block';
					addFriendBtn.textContent = i18n.t('add_friend');
					addFriendBtn.disabled = false;
				} else {
					alert("Error: " + data.error);
					unfriendBtn.disabled = false;
					unfriendBtn.textContent = i18n.t('unfriend');
				}
			};
		}

		// Pending button activation (If the current user had sent a request to the viewed profile) :
		if (pendingBtn) {

			pendingBtn.onclick = async () => {

				pendingBtn.disabled = true;
				pendingBtn.textContent = i18n.t('processing');

				const res = await fetch(`http://localhost:3010/api/friends/requests/${USER_DATA.username}`, {
					method: 'DELETE',
					credentials: 'include'
				});

				const data = await res.json();
				if (data.success) {
					pendingBtn.style.display = 'none';
					addFriendBtn.style.display = 'inline-block';
					addFriendBtn.textContent = i18n.t('add_friend');
					addFriendBtn.disabled = false;
				} else {
					alert("Error: " + data.error);
					pendingBtn.disabled = false;
					pendingBtn.textContent = i18n.t('request_pending');
				}
			};
		}

	}

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
            e.style.cursor = 'pointer';
            // e.style.fontSize = '12px';
            // -- FIX gagnant/perdant selon deux schémas possibles du winner_id:
            //    - IA: winner_id est 1 ou 2 (côté)
            //    - MULTI: winner_id est un user_id réel (player1_id ou player2_id)
            const winnerIsP1 = (game.winner_id === 1) || (game.winner_id === game.player1_id);
            const winnerIsP2 = (game.winner_id === 2) || (game.winner_id === game.player2_id);
            let winnerSide: 'p1' | 'p2';
            if (winnerIsP1) {
              winnerSide = 'p1';
            } else if (winnerIsP2) {
              winnerSide = 'p2';
            } else {
              // Fallback si winner_id ne matche pas: déduire via les scores
              winnerSide = (game.player1_score >= game.player2_score) ? 'p1' : 'p2';
            }

            const winnerName = winnerSide === 'p1' ? game.p1_name : game.p2_name;
            const L          = winnerSide === 'p1' ? game.p2_name : game.p1_name;
            const w          = winnerSide === 'p1' ? game.player1_score : game.player2_score;
            const l          = winnerSide === 'p1' ? game.player2_score : game.player1_score;

            // Bordure: vert si l'utilisateur courant a gagné, sinon neutre (ou gris si égalité)
            const userIsP1 = USER_DATA?.username === game.p1_name;
            const userIsP2 = USER_DATA?.username === game.p2_name;

            if ((userIsP1 && winnerSide === 'p1') || (userIsP2 && winnerSide === 'p2')) {
              e.style.border = '2px solid #4fff4f';
            } else {
              if (game.player1_score != game.player2_score)
                e.style.border = '2px solid rgb(19, 19, 19)';
              else
                e.style.border = '2px solid rgba(255, 255, 255, 0.14)';
            }

            const p1Link = `<a href="/profile/${encodeURIComponent(game.p1_name)}" 
                     style="color: #00ffff; text-decoration: underline;">${game.p1_name}</a>`;
            const p2Link = `<a href="/profile/${encodeURIComponent(game.p2_name)}" 
                     style="color: #00ffff; text-decoration: underline;">${game.p2_name}</a>`;
            USER_DATA?.username
            e.innerHTML = `
              <span style="color: lime; font-size: 11px; ">${winnerName} (${w})</span>
              <span style="color: white;"> ${game.p1_name == USER_DATA?.username ? game.p1_name : p1Link} 
                ${i18n.t('vs')}  ${game.p2_name == USER_DATA?.username ? game.p2_name : p2Link} </span>
              <span style="color: red; font-size: 11px; ">${L} (${l})</span>
            `;
            const h = container.querySelector('#game-history');
            if(h)
            {

              h.appendChild(e);
            }
          });

          // call dashboard func && load chart.js
          const chartScript = document.createElement('script');
          chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
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
                labels: [i18n.t('chart_wins'), i18n.t('chart_losses')],
                datasets: [{
                  data: [winRate, lossRate],
                  backgroundColor: ['#09ff00ff', '#ff1e1eff'],
                  borderColor: '#111',
                  borderWidth: 2,
                  hoverOffset: 20,
                }]
              },
              options: {
                maintainAspectRatio: false, // <--- key fix
                aspectRatio: 1.6, // optional (wider ratio looks natural)
                plugins: {
                  legend: {
                    labels: {
                      color: '#BBBBBB',
                      font: { family: 'Press Start 2P', size: 8 }
                    }
                  }
                },
                animation: {
                  animateScale: true,
                  animateRotate: true
                }
              }
            });
            const font = new FontFace("Press Start 2P", "url(https://fonts.gstatic.com/s/pressstart2p/v12/e3t4euO8T-267oIAQAu6jDQyK3nVivNj.woff2)");
            font.load().then((loaded_f) => {
                document.fonts.add(loaded_f);
            });
            document.fonts.add(font);
            // Match History Chart (Line)
            // either charts from actual data 
            // or default chart samplee.
            if (u?.games?.length > 0)
            {
                const labels:string[] = ["----"], differences: number[] = [0];
                u.games.forEach((game: any, index: number) => {
                  // label: "player1 vs player2"
                  labels.push(`${index}: ${game.p1_name} ${i18n.t('vs')} ${game.p2_name}`);
                  // difference: (player1 - player2)
                  let diff;
                  if (USER_DATA.username === game.p1_name)
                    diff = game.player1_score - game.player2_score;
                  else if (USER_DATA.username === game.p2_name)
                    diff = game.player2_score - game.player1_score;
                  else
                    diff = game.player1_score - game.player2_score;

                  differences.push(diff);
                });
                new Chart(ctx2, {
                  type: 'line',
                  data: {
                    labels: labels,
                    datasets: [{
                      label: i18n.t('chart_score_difference'),
                      data: differences,
                      fill: false,
                      borderColor: '#00ffff',
                      backgroundColor: '#444444',
                      tension: 0.4,
                      pointRadius: 5,
                      pointHoverRadius: 8,
                      pointBackgroundColor: '#0099ffff'
                    }]
                  },
                  options: {
                    maintainAspectRatio: false, // <--- key fix
                    aspectRatio: 1.6, // optional (wider ratio looks natural)
                    scales: {
                      x: {
                        ticks: { color: '#00ffff', font: { family: 'Press Start 2P', size: 8 } },
                        grid: { color: '#222' }
                      },
                      y: {
                        ticks: { color: '#00ffff', font: { family: 'Press Start 2P', size: 8 } },
                        grid: { color: '#333' }
                      }
                    },
                    plugins: {
                    },
                    animation: { duration: 1600, easing: 'easeOutQuart' }
                  }
                });
            }
            else
            {
                new Chart(ctx2, {
                  type: 'line',
                  data: {
                    labels: [1, 2, 3, 4, 5, 6].map(n => i18n.t('game_label', { n })),
                    datasets: [{
                      label: i18n.t('chart_score_difference'),
                      data: [3, -2, 1, 4, -1, 8],
                      fill: false,
                      borderColor: '#00ffff',
                      backgroundColor: '#444444',
                      tension: 0.4,
                      pointRadius: 5,
                      pointHoverRadius: 8,
                      pointBackgroundColor: '#ffffffff'
                    }]
                  },
                  options: {
                    maintainAspectRatio: false, // <--- key fix
                    aspectRatio: 1.6, // optional (wider ratio looks natural)
                    scales: {
                      x: {
                        ticks: { color: '#ffffffff', font: { family: 'Press Start 2P', size: 8 } },
                        grid: { color: '#222' }
                      },
                      y: {
                        ticks: { color: '#ffffffff', font: { family: 'Press Start 2P', size: 8 } },
                        grid: { color: '#333' }
                      }
                    },
                    plugins: {
                      title: {
                        display: true,
                        text: i18n.t('chart_description'),
                        color: '#11ff00ff',
                        font: { family: 'Press Start 2P', size: 18 },
                        padding: { top: 5, bottom: 9 }
                      },
                      legend: {
                        display: true,
                        labels: {
                          color: '#ffffffff',
                          font: { family: 'Press Start 2P', size: 9 },
                          padding: 15
                        }
                      }
                    },
                    animation: { duration: 1200, easing: 'easeOutQuart' }
                  }
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
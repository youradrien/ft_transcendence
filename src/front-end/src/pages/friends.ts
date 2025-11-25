import Page from '../template/page.ts';
import { i18n } from '../i18n';

type FriendFromAPI = {

	id: number;
	username: string;
	avatar_url: string;
	online: boolean;
	last_seen: string;
};

function formatLastSeen(dateString: string | null | undefined) {

	if (!dateString)
		return i18n.t('unknown');

	const date = new Date(dateString);
	const diffMs = Date.now() - date.getTime();

	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1)
		return i18n.t('just_now');
	if (minutes < 60)
		return i18n.t('min_ago', { count: minutes });

	const hours = Math.floor(minutes / 60);
	if (hours < 24)
		return i18n.t('hours_ago', { count: hours });

	const days = Math.floor(hours / 24);
	return i18n.t('days_ago', { count: days, plural: days > 1 ? "s" : "" });
}

type Friend = {

	id: number,
	username: string;
	avatar_url: string;
	online?: boolean;
	last_seen?: string | null;
};

export default class Friends extends Page {

  cleanup?: () => void;

  //Method for fetching user's friends.
  async FETCH_FRIENDS(): Promise<Friend[]> {

	try {
		const res = await fetch('http://localhost:3010/api/friends', {
			method: 'GET',
			credentials: 'include',
		});
		const data = await res.json();
		if (!data.success) {
			console.error('Failure while fetching friends', data.error);
			return [];
		}
		const friendsFromAPI = data.friends as FriendFromAPI[];

		return friendsFromAPI.map(f => ({
			id: f.id,
			username: f.username,
			avatar_url: f.avatar_url,
			online: f.online,
			last_seen: f.last_seen
		}));
	} catch(err) {
		console.error('Error fetch friends', err);
		return [];
	}
  }

  //Get all user's friend requests:
	async FETCH_FRIEND_REQUESTS(): Promise<Friend[]> {

		try {
				const res = await fetch('http://localhost:3010/api/friends/requests', {
				method: 'GET',
				credentials: 'include',
			});

			const data = await res.json();
			if (!data.success) {
				console.error('Failure while fetching friend requests', data.error);
				return [];
			}
			return data.requests as Friend[];
		} catch (err) {
			console.error('Error fetching friend requests', err);
			return [];
		}
	}

  //Method for accepting a friend request :
	async ACCEPT_FRIEND_REQUEST(username: string): Promise<boolean> {

		try {
			const res = await fetch(`http://localhost:3010/api/friends/requests/accept/${username}`, {
				method: 'POST',
				credentials: 'include',
		});
			const data = await res.json();
			return data.success === true;
		} catch (err) {
			console.error('Error accepting friend request', err);
			return false;
		}
	}

  // Method for declinig a friend request :
	async DECLINE_FRIEND_REQUEST(username: string): Promise<boolean> {

		try {
			const res = await fetch(`http://localhost:3010/api/friends/requests/decline/${username}`, {
				method: 'POST',
				credentials: 'include',
		});
			const data = await res.json();
			return data.success === true;
		} catch (err) {
		console.error('Error declining friend request', err);
		return false;
		}
	}

  // Method for removing a friend.
	async REMOVE_FRIEND(username: string): Promise<boolean> {

		try {
			const res = await fetch(`http://localhost:3010/api/friends/${username}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			const data = await res.json();
			if (!data.success) {
				console.error('Failure while removing friend', data.error);
				return false;
			}
			return true;
		} catch (error) {
			console.error('Error while deleting friend', error);
			return false;
		}
	}

  // FRIEND CARD :

  createFriendCard(friend: Friend, removeCallBack: (username: string) => void): HTMLElement {

	const card = document.createElement("div");
	Object.assign(card.style, {
		width: "100%",
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "12px 16px",
		background: "#0f0f0dff",
		border: "2px solid #333",
		borderRadius: "8px",
		boxShadow: "0 0 8px rgba(0, 255, 0, 0.06)",
		transition: "transform 0.25s ease, box-shadow 0.25s ease",
		boxSizing: "border box"
	});

	// Friend's avatar, username and status -> left side of card :
	const left = document.createElement("div");
	Object.assign(left.style, {
		display: "flex",
		alignItems : "center",
		gap: "12px"
	});

	const avatar = document.createElement("img");
	avatar.src = friend.avatar_url;
	avatar.alt = friend.username;
	Object.assign(avatar.style, {
		width: "55px",
		height: "55px",
		borderRadius: "50%",
		border: "2px solid white",
		flexShrink: "0"
	});

	const textWrap = document.createElement("div");
	Object.assign(textWrap.style, {
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		minWidth: "250px", 
		maxWidth: "600px",
		width: "auto"
	});

	const usernameEl = document.createElement("div");
	usernameEl.textContent = friend.username;
	usernameEl.style.fontSize = "16px";
	usernameEl.style.whiteSpace = "normal";
	usernameEl.style.overflow = "visible";
	usernameEl.style.textOverflow = "clip";

	const statusEl = document.createElement("div");
	statusEl.style.fontSize = "12px";
	statusEl.style.marginTop = "4px";

	if (friend.online) {
		statusEl.textContent = "Online";
		statusEl.style.color = "lime";
	} else {
		statusEl.textContent = `Last seen: ${formatLastSeen(friend.last_seen)}`;
		statusEl.style.color = "#fc2929ff";
	}

	textWrap.appendChild(usernameEl);
	textWrap.appendChild(statusEl);

	left.appendChild(avatar);
	left.appendChild(textWrap);

	//Button "Unfriend" -> right side of the card :

	const right = document.createElement('div');
	Object.assign(right.style, {
		display: "flex",
		alignItems: "center",
		gap: "8px"
	});

	const unfBtn = document.createElement("button");
	unfBtn.textContent = `${i18n.t('unfriend_button')}`;
	Object.assign(unfBtn.style, {
		background: "#ff4444",
		color: "white",
		border: "none",
		borderRadius: "6px",
		padding: "6px 10px",
		cursor: "pointer"
	});
	unfBtn.onclick = async (e) => {
		e.stopPropagation();
		unfBtn.disabled = true;
		unfBtn.textContent = "Removing...";

		const success = await this.REMOVE_FRIEND(friend.username);
		if (!success) {
			unfBtn.disabled = false;
			alert("Failed to remove friend.");
			return ;
		}
		removeCallBack(friend.username);
	};

	right.appendChild(unfBtn);

	card.appendChild(left);
	card.appendChild(right);

	//Mouse events listening :

	card.addEventListener("mouseenter", () => {
		card.style.transform = "translateY(-6px) scale(1.02)";
		card.style.boxShadow = "0 0 10px rgba(255,255,255,0.12)";
	});
	card.addEventListener("mouseleave", () => {
		card.style.transform = "translateY(0) scale(1)";
		card.style.boxShadow = "0 0 8px rgba(0,255,0,0.06)";
	});
	card.onclick = () => {
		this.router.navigate(`/profile/${friend.username}`);
	};

	return card;
  }

  // FRIEND REQUEST CARD :

  createFriendRequestCard(friend: Friend, acceptCallback: (username: string) => void, declineCallback: (username: string) => void): HTMLElement {
    const card = document.createElement("div");
    Object.assign(card.style, {
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        background: "#002244",
        border: "2px solid #333",
        borderRadius: "8px",
        boxShadow: "0 0 8px rgba(0, 255, 0, 0.06)",
        boxSizing: "border-box",
        gap: "12px"
    });

    // Left: avatar + username + status
    const left = document.createElement("div");
    Object.assign(left.style, { display: "flex", alignItems: "center", gap: "12px" });

    const avatar = document.createElement("img");
    avatar.src = friend.avatar_url;
    avatar.alt = friend.username;
    Object.assign(avatar.style, { width: "55px", height: "55px", borderRadius: "50%", border: "2px solid white" });

    const textWrap = document.createElement("div");
    Object.assign(textWrap.style, { display: "flex", flexDirection: "column", justifyContent: "center" });

    const usernameEl = document.createElement("div");
    usernameEl.textContent = friend.username;
    usernameEl.style.fontSize = "16px";

    const statusEl = document.createElement("div");
    statusEl.textContent = friend.online ? "Online" : `Last seen: ${formatLastSeen(friend.last_seen)}`;
    statusEl.style.fontSize = "12px";
    statusEl.style.color = friend.online ? "lime" : "#fc2929ff";

    textWrap.appendChild(usernameEl);
    textWrap.appendChild(statusEl);
    left.appendChild(avatar);
    left.appendChild(textWrap);

    // Right: Accept / Decline buttons
    const right = document.createElement("div");
    Object.assign(right.style, { display: "flex", gap: "8px" });

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = `${i18n.t('accept_button')}`;
    Object.assign(acceptBtn.style, {
        background: "#44ff44",
        color: "white",
        border: "none",
        borderRadius: "6px",
        padding: "6px 10px",
        cursor: "pointer"
    });
    acceptBtn.onclick = async (e) => {
        e.stopPropagation();
        acceptBtn.disabled = true;
        const success = await this.ACCEPT_FRIEND_REQUEST(friend.username);
        if (success) acceptCallback(friend.username);
        else {
            acceptBtn.disabled = false;
            acceptBtn.textContent = "Accept";
            alert("Failed to accept friend request");
        }
    };

    const declineBtn = document.createElement("button");
    declineBtn.textContent = `${i18n.t('decline_button')}`;
    Object.assign(declineBtn.style, {
        background: "#ff4444",
        color: "white",
        border: "none",
        borderRadius: "6px",
        padding: "6px 10px",
        cursor: "pointer"
    });
    declineBtn.onclick = async (e) => {
        e.stopPropagation();
        declineBtn.disabled = true;
        const success = await this.DECLINE_FRIEND_REQUEST(friend.username);
        if (success) declineCallback(friend.username);
        else {
            declineBtn.disabled = false;
            declineBtn.textContent = "Decline";
            alert("Failed to decline friend request");
        }
    };

    right.appendChild(acceptBtn);
    right.appendChild(declineBtn);

    card.appendChild(left);
    card.appendChild(right);

    card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-6px) scale(1.02)";
        card.style.boxShadow = "0 0 10px rgba(255,255,255,0.12)";
    });
    card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0) scale(1)";
        card.style.boxShadow = "0 0 8px rgba(0,255,0,0.06)";
    });

    return card;
}

	///// PAGE RENDERING /////

async render(): Promise<HTMLElement> {

	const container = document.createElement("div");
	container.id = this.id;
	Object.assign(container.style, {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		padding: "40px",
		backgroundColor: "#181818d1",
		color: "white",
		fontFamily: '"Press Start 2P", cursive',
		minHeight: "70vh",
		borderRadius: "18px"
	});

    const bgCanvas = document.createElement('canvas');
    bgCanvas.style.position = 'absolute';
    bgCanvas.style.top = '0';
    bgCanvas.style.left = '0';
    bgCanvas.style.width = '100%';
    bgCanvas.style.height = '100%';
    bgCanvas.style.zIndex = '-1';
    bgCanvas.style.pointerEvents = 'none';
    container.appendChild(bgCanvas);

    const ctx = bgCanvas.getContext('2d')!;
    const NUM_PARTICLES = 70;

    type Particle = { x:number, y:number, vx:number, vy:number, r:number, color:string, halo:string };
    const particles: Particle[] = [];

    for (let i=0; i<NUM_PARTICLES; i++) {
        const isGreen = Math.random() > 0.5;
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            r: Math.random() * 4 + 2,
            color: isGreen ? 'rgba(0,255,0,1)' : 'rgba(230, 22, 22, 1)',
            halo: isGreen ? 'rgba(0,255,0,0.2)' : 'rgba(255,255,255,0.2)'
        });
    }

    function resizeCanvas() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function animate() {
        ctx.clearRect(0,0,bgCanvas.width,bgCanvas.height);

        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < p.r || p.x > bgCanvas.width - p.r) p.vx *= -1;
            if (p.y < p.r || p.y > bgCanvas.height - p.r) p.vy *= -1;

            const gradient = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(0.7, p.halo);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        requestAnimationFrame(animate);
    }
    animate();

	const content = document.createElement("div");
	Object.assign(content.style, {
		width: "100%",
		maxWidth: "850px",
		display: "flex",
		flexDirection: "column",
		gap: "16px"
	});

	content.innerHTML = `<h1 style="font-size: 24px; margin-bottom: 10px;">${i18n.t('friends_page_title')}</h1>`;
	container.appendChild(content);

	const listContainer = document.createElement("div");
	Object.assign(listContainer.style, {
		width: "100%",
		display: "flex",
		flexDirection: "column",
		gap: "12px",
		boxSizing: "border-box"
	});
	content.appendChild(listContainer);

	let friends = await this.FETCH_FRIENDS();
	let requests = await this.FETCH_FRIEND_REQUESTS();

	if (!Array.isArray(friends)) friends = [];
	if (!Array.isArray(requests)) requests = [];

	console.log("Friends:", friends);
	console.log("Friend requests:", requests);

	const renderList = () => {
		listContainer.innerHTML = "";

		if (friends.length === 0 && requests.length === 0) {
			const empty = document.createElement("div");
			empty.textContent = `${i18n.t('no_friends_title')}`;
			empty.style.opacity = "0.8";
			listContainer.appendChild(empty);
			return ;
		}

		// Friends:
		friends.forEach(friend => {
			const card = this.createFriendCard(friend, (username) => {
				friends = friends.filter(f => f.username !== username);
				renderList();
			});
			listContainer.appendChild(card);
		});

		// Requests:
		requests.forEach(req => {
			if (!req || !req.username) return;

			const card = this.createFriendRequestCard(req,
				(username) => {
					friends = friends.concat(req);
					requests = requests.filter(r => r.username !== username);
					renderList();
				},
				(username) => {
					requests = requests.filter(r => r.username !== username);
					renderList();
				}
			);

			listContainer.appendChild(card);
		});
	};

	renderList();
	return container;
  }
}

////// CARD CONTAINER STRUCTURE ///////

// card (conteneur principal)
// ├─ left (conteneur enfant)
// │  ├─ avatar (élément)
// │  └─ textWrap (conteneur enfant)
// │     ├─ usernameEl
// │     └─ statusEl
// └─ right (conteneur enfant)
//    └─ unfBtn

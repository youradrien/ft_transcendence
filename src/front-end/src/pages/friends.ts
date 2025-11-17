import Page from '../template/page.ts';

type FriendFromAPI = {

	id: number;
	username: string;
	avatar: string;
	online: boolean;
	last_seen: string;
};


function formatLastSeen(dateString: string | null | undefined) {

	if (!dateString)
		return "unknown";

	const date = new Date(dateString);
	const diffMs = Date.now() - date.getTime();

	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1)
		return "Just now";
	if (minutes < 60)
		return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24)
		return `${hours} hours ago`;

	const days = Math.floor(hours / 24);
	return `${days} day${days > 1 ? "s" : ""} ago`;
}

type Friend = {

	id: number,
	username: string;
	avatar_url: string;
	online?: boolean;
	last_seen?: string | null;
};

export default class Friends extends Page {


  //Method for fetching user's friends.

  async FETCH_FRIENDS(): Promise<Friend[]> {

	try {
		const res = await fetch('api/friends', {
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
			avatar_url: f.avatar,
			online: f.online,
			last_seen: f.last_seen
		}));
	} catch(err) {
		console.error('Error fetch friends', err);
		return [];
	}
  }

  createFriendCard(friend: Friend, removeCallBack: (username: string) => void): HTMLElement {

	const card = document.createElement("div");
	Object.assign(card.style, {
		width: "100%",
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		padding: "12px 16px",
		background: "#1c1c1c",
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
		width: "48px",
		height: "48px",
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

	//Button "Unfriend" and actions (such as view profile, etc) -> right side of the card :

	const right = document.createElement('div');
	Object.assign(right.style, {
		display: "flex",
		alignItems: "center",
		gap: "8px"
	});

	//Button "view profile" :
	const viewBtn = document.createElement("button");
	viewBtn.textContent = "Profile";
	Object.assign(viewBtn.style, {
		background: "#2b2b2b",
		color: "white",
		border: "1px solid #3002faff",
		borderRadius: "6px",
		padding: "6px 10px",
		cursor: "pointer"
	});
	// WARNING : NOT SURE, JUST A SUPPOSITION FOR THE MOMENT !!
	viewBtn.onclick = (e) => {
		e.stopPropagation();
		this.router.navigate(`/profile/${friend.username}`);
	};

	//Button "Unfriend" :

	const unfBtn = document.createElement("button");
	unfBtn.textContent = "Unfriend";
	Object.assign(unfBtn.style, {
		background: "#ff4444",
      color: "white",
      border: "none",
      borderRadius: "6px",
      padding: "6px 10px",
      cursor: "pointer"
	});
	unfBtn.onclick = (e) => {
		e.stopPropagation();
		unfBtn.disabled = true;
		unfBtn.textContent = "Removing...";
		//Callback provided by page = delete friend and refresh page !!
		removeCallBack(friend.username);
	};

	right.appendChild(viewBtn);
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


	// PAGE RENDERING :

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

    const content = document.createElement("div");
    Object.assign(content.style, {
      width: "100%",
      maxWidth: "850px",
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    });

    content.innerHTML = `<h1 style="font-size: 24px; margin-bottom: 10px;">FRIENDS</h1>`;
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

    const renderList = () => {
      listContainer.innerHTML = "";
      if (friends.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "No friends yet.";
        empty.style.opacity = "0.8";
        listContainer.appendChild(empty);
        return;
      }

      friends.forEach(friend => {
        const card = this.createFriendCard(friend, (username) => {
          friends = friends.filter(f => f.username !== username);
          renderList();
        });
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
//    ├─ viewBtn
//    └─ unfBtn

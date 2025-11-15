import Page from '../template/page.ts';

export default class Friends extends Page {

  async render(): Promise<HTMLElement> {

	const container = document.createElement('div');
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
		maxHeight: "70vh",
		borderRadius: "18px"
	});

	const content = document.createElement('div');
	content.style.width = '100%';
	  Object.assign(content.style, {
      width: '100%',
      maxWidth: '850px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    });
	content.innerHTML = `
	<h1 style="font-size: 24px; margin-bottom: 30px;">FRIENDS</h1>
	<div id="friends-list" style="
		width: 100%;
		max-width: 850px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		cursor: crosshair;
		">
		<!-- Rien pour le moment -->
		</div>`
	;
	container.appendChild(content);

	  const mockFriends = [
      { username: "Jean Bernard", avatar: "https://i.pravatar.cc/50?img=1" },
      { username: "Charles Raoul", avatar: "https://i.pravatar.cc/50?img=2" },
      { username: "Marie Odette", avatar: "https://i.pravatar.cc/50?img=3" }
    ];

    const list = content.querySelector("#friends-list") as HTMLElement;

	// Fausse liste d'amis juste pour tester le front ! (Un MOCK en gros)
	mockFriends.forEach(friend => {

	const card = document.createElement("div");
	Object.assign(card.style, {
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        background: "#1c1c1c",
        border: "2px solid #333",
        borderRadius: "8px",
        boxShadow: "0 0 8px rgba(0, 255, 0, 0.1)",
        transition: "transform 0.35s ease"
      });

      const left = document.createElement("div");
      Object.assign(left.style, {
        display: "flex",
        alignItems: "center",
        gap: "16px"
      });

      const avatar = document.createElement("img");
      avatar.src = friend.avatar;
      avatar.alt = friend.username;
      Object.assign(avatar.style, {
        width: "55px",
        height: "55px",
        borderRadius: "50%",
        border: "2px solid white"
      });

      const username = document.createElement("div");
      username.textContent = friend.username;
      username.style.fontSize = "16px";

      left.appendChild(avatar);
      left.appendChild(username);

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Unfriend";
      Object.assign(removeBtn.style, {
        background: "#ff4444",
        color: "white",
        border: "none",
        borderRadius: "4px",
        padding: "6px 12px",
        cursor: "pointer"
      });

      removeBtn.onclick = () => {
        console.log("Remove friend:", friend.username);
      };

      card.appendChild(left);
      card.appendChild(removeBtn);

      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-5px) scale(1.03)";
        card.style.boxShadow = "0 0 8px rgba(255, 255, 255, 0.4)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0) scale(1)";
        card.style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.1)";
      });

      list.appendChild(card);
    });

    return container;
  }
}

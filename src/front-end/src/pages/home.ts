import Page from '../template/page.ts';
import Profile from './profile.ts'; // adjust path as needed
import { i18n } from '../i18n';

type User = {
  username: string;
  avatar: string;
  wins: number;
  losses: number;
};

export default class MainPage extends Page {
  async own_user(): Promise<User | null> {
    try {
      const res = await fetch('http://localhost:3010/api/me-info', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const user = await res.json();
      return user;
    } catch (err) {
      return null;
    }
  }

  async render(): Promise<HTMLElement> {

    const container = document.createElement('div');
    container.id = this.id;
	container.style.position = 'relative';

	// Balls in background (CANVA) !!
	const bgCanvas = document.createElement('canvas');
	bgCanvas.style.position = 'fixed';
	bgCanvas.style.top = '0';
	bgCanvas.style.left = '0';
	bgCanvas.style.width = '100%';
	bgCanvas.style.height = '100%';
	bgCanvas.style.zIndex = '-1';
	bgCanvas.style.pointerEvents = 'none';
	container.appendChild(bgCanvas);

	const ctx = bgCanvas.getContext('2d')!;
	let balls: {x:number, y:number, vx:number, vy:number, r:number}[] = [];
	const NUM_BALLS = 70;

	function resizeCanvas() {

		bgCanvas.width = window.innerWidth || 800;
		bgCanvas.height = window.innerHeight || 600;
	}
	window.addEventListener('resize', resizeCanvas);
	resizeCanvas();

	function initBalls() {

		const w = bgCanvas.width;
		const h = bgCanvas.height;
		balls = [];
		for (let i=0; i<NUM_BALLS; i++) {

			balls.push({
				x: Math.random() * w,
				y: Math.random() * h,
				vx: (Math.random()-0.5)*3,
				vy: (Math.random()-0.5)*3,
				r: Math.random()*3 + 2
			});
		}
	}
	initBalls();

	function animate() {

		ctx.clearRect(0,0,bgCanvas.width,bgCanvas.height);

		for (let b of balls) {

			if (![b.x,b.y,b.r].every(v => typeof v === 'number' && !isNaN(v))) continue;
			b.x += b.vx;
			b.y += b.vy;

			if (b.x < b.r || b.x > bgCanvas.width - b.r) b.vx *= -1;
			if (b.y < b.r || b.y > bgCanvas.height - b.r) b.vy *= -1;

			ctx.beginPath();
			ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
			ctx.fillStyle = 'white'; // couleur simple, sûre
			ctx.fill();
		}
		requestAnimationFrame(animate);
	}
	animate();


	const content = document.createElement('div');
	content.style.width = '100%';

	const user = await this.own_user();
	if (user) {

		const pfp = new Profile('profile-page', this.router);
		const pfp_element = await pfp.render();
		content.appendChild(pfp_element);
	} else {
		content.innerHTML = `<p style="color: red;">${i18n.t('profile_load_error')}</p>`;
	}

	container.appendChild(content);
	return container;
  }
}
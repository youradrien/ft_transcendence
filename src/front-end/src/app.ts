import { Router } from '../router';
import NTFoundPage from './pages/404';
import AuthPage from './pages/auth';
import Header from './pages/header';
import HomePage from './pages/home';
import Leaderboard from './pages/leaderboard';
import Play from './pages/play';
import Profile from './pages/profile';

export class App {
  private router = new Router('app');

  constructor() {
    this.setupRoutes();
  }

  private async check_authentication(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:3010/api/me', { credentials: 'include' });
      const data = await res.json();
      if (data?.success) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private setupRoutes(): void {
    this.router.addRoute('/', async () => {
      await this.renderPage(HomePage, 'main-page');
      return undefined;
    });

    this.router.addRoute('/auth', async () => {
      await this.renderPage(AuthPage, 'auth-page');
      return undefined;
    });

    this.router.addRoute('/play', async () => {
      await this.renderPage(Play, 'play-page');
      return undefined;
    });

    this.router.addRoute('/leaderboard', async () => {
      await this.renderPage(Leaderboard, 'leaderboard-page');
      return undefined;
    });

    this.router.addRoute('/profile/:username', async () => {
      await this.renderPage(Profile, 'profile-page');
      return undefined;
    });

    // 🧱 catch-all fallback for unknown routes
    this.router.addRoute('*', async () => {
      await this.renderPage(NTFoundPage, 'not-found-page');
      return undefined;
    });

    this.router.loadRoute();
  }

  private async renderPage<T extends new (id: string, router: any) => { render: () => Promise<HTMLElement> }>(
    PageClass: T, // any <T>
    id: string
  ): Promise<void> {
    // auth for each rendered page
    const isAuthenticated = await this.check_authentication();
    if (!isAuthenticated && !(id == 'login-page' || id == 'auth-page')) {
      this.router.navigate('/auth');
      return;
    }
    if (isAuthenticated && id == 'auth-page') {
      this.router.navigate('/');
      return;
    }

    // complete DOM clear before every rendering
    const app = document.getElementById('app')!;
    while (app.firstChild) {
      app.removeChild(app.firstChild);
    }

    // header
    if (isAuthenticated) {
      const header = new Header('header', this.router);
      const headerElement = await header.render();
      app.appendChild(headerElement);
    }

    const page = new PageClass(id, {
      navigate: (route: string) => this.router.navigate(route),
    });
    const pageElement = await page.render();
    app.appendChild(pageElement);
  }
}

export default App;

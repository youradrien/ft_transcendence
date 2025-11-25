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
      const res = await fetch('https://localhost:3010/api/me-info', {
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
    const content = document.createElement('div');
    content.style.width = '100%';

    // fetch before trying to render profile
    const user = await this.own_user();
    if (user)
    {
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
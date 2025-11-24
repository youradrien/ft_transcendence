import { i18n } from '../i18n';

export default class NotFoundPage {
//   private id: string;
//   private router: any;

//   constructor(id: string, router: any) {
//     this.id = id;
//     this.router = router;
//   }

  async render(): Promise<HTMLElement> {
    const div = document.createElement('div');
    div.className = 'text-center mt-20 text-red-600';
    div.innerHTML = `
      <h1 class="text-4xl font-bold">${i18n.t('404_title')}</h1>
      <p class="mt-4">${i18n.t('404_message')}</p>
      <a href="/" class="mt-6 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        ${i18n.t('go_home')}
      </a>
    `;
    return div;
  }
}

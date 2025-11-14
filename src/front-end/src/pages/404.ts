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
      <h1 class="text-4xl font-bold">404 - Page Not Found</h1>
      <p class="mt-4">The page you're looking for doesn't exist.</p>
      <a href="/" class="mt-6 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Go Home
      </a>
    `;
    return div;
  }
}

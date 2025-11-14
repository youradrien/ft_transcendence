export default class Page {
  protected id: string;
  protected router: { navigate: (path: string) => void };
  protected options?: any;

  constructor(id: string, router: { navigate: (path: string) => void }, options?: any) {
    this.id = id;
    this.router = router;
    this.options = options;
  }

  // Render the page content
  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.id = this.id;
    container.innerHTML = `
      <h1>Default Page</h1>
      <p>This is the base page template.</p>
    `;

    // You can add event listeners here if needed
    // e.g. container.querySelector('button')?.addEventListener('click', ...);

    return container;
  }
}

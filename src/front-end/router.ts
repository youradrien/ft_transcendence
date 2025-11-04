export class Router {
  private routes: Record<string, () => HTMLElement | void | Promise<HTMLElement | void>> = {};
  private outletId: string;

  constructor(outletId: string) {
    this.outletId = outletId;

    const outlet = document.getElementById(this.outletId);
    if (!outlet) {
      throw new Error(`Outlet with id "${this.outletId}" not found.`);
    }

    // back/forward browser buttons
    window.addEventListener('popstate', () => this.loadRoute());
    window.addEventListener('DOMContentLoaded', () => this.loadRoute());

    // Delegated click handler for links
    document.body.addEventListener('click', (e: MouseEvent) => {
      if (!e) {
        console.warn('Click event is null or undefined');
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Find closest anchor tag in case event target is nested inside
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (
        href &&
        // href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith('/#')
      ) {
        e.preventDefault();
        this.navigate(href);
      }
    });
  }

  addRoute(path: string, renderFn: () => HTMLElement | void | Promise<HTMLElement | void>): void {
    this.routes[path] = renderFn;
  }

  navigate(path: string) {
    history.pushState(null, '', path);
    this.loadRoute();
  }

  async loadRoute(): Promise<void> {
    const path = window.location.pathname || '/';
    const outlet = document.getElementById(this.outletId);
    if (!outlet) {
      console.error(`Outlet with id "${this.outletId}" not found on route load.`);
      return;
    }

    let renderFn = this.routes[path];
    // let params: Record<string, string> = {};

    //no exact match, try dynamic ones
    if (!renderFn){
      for (const route in this.routes) {
        if (route === '*' || !route.includes(':')) continue;

        // conversion
        // -> /profile/:username → /^\/profile\/([^/]+)$/
        const pattern = new RegExp(
          '^' +
            route.replace(/:[^/]+/g, '([^/]+)') +
            '$'
        );

        const match = path.match(pattern);
        if (match) {
          renderFn = this.routes[route];
          // const paramNames = (route.match(/:([^/]+)/g) || []).map(s => s.substring(1));
          // paramNames.forEach((name, i) => {
          //   params[name] = match[i + 1];
          // });
          break;
        }
      }
    }

    // fallback wildcard-route
    if (!renderFn) {
      renderFn = this.routes['*'];
    }
    outlet.innerHTML = '';

    // exact match
    try {
      const el = await renderFn();
      if (el instanceof HTMLElement) {
        outlet.appendChild(el);
      }
    } catch (err) {
      console.error('Error rendering route:', err);
    }
  }
}
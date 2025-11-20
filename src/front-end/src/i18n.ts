import en from './locales/en.json';
import fr from './locales/fr.json';

type Locale = 'en' | 'fr';
type Translations = typeof en;

class I18n {
  private locale: Locale;
  private translations: Record<Locale, Translations>;

  constructor() {
    const cookieLocale = this.getCookie('app_locale') as Locale;
    const localLocale = localStorage.getItem('app_locale') as Locale;
    
    // Priority: Cookie > LocalStorage > Default
    this.locale = cookieLocale || localLocale || 'en';
    
    // Sync if missing in one place
    if (cookieLocale && !localLocale) localStorage.setItem('app_locale', cookieLocale);
    if (localLocale && !cookieLocale) this.setCookie('app_locale', localLocale, 365);

    this.translations = {
      en,
      fr
    };
  }

  get currentLocale(): Locale {
    return this.locale;
  }

  setLocale(locale: Locale) {
    if (this.locale !== locale) {
      this.locale = locale;
      localStorage.setItem('app_locale', locale);
      this.setCookie('app_locale', locale, 365); // Persist for 1 year
      window.location.reload(); // Simple reload to apply changes
    }
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
      let c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
  }

  t(key: keyof Translations, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: any = this.translations[this.locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k as keyof typeof value];
      } else {
        return key; // Fallback to key if not found
      }
    }

    if (typeof value === 'string' && params) {
      return value.replace(/{{(\w+)}}/g, (_, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : `{{${paramKey}}}`;
      });
    }

    return value as string;
  }
}

export const i18n = new I18n();

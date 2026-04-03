// Cookie management system with consent enforcement
export interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export interface CookieInfo {
  name: string;
  category: 'essential' | 'analytics' | 'marketing' | 'functional';
  purpose: string;
  duration: string;
  provider: string;
}

class CookieManager {
  private consent: CookieConsent | null = null;
  private observers: ((consent: CookieConsent) => void)[] = [];

  // Predefined cookie definitions
  private knownCookies: CookieInfo[] = [
    // Essential cookies
    {
      name: 'cookieConsent',
      category: 'essential',
      purpose: 'Stores user cookie preferences',
      duration: '1 year',
      provider: 'FounderLens'
    },
    {
      name: 'sb-*',
      category: 'essential',
      purpose: 'Authentication and session management',
      duration: 'Session',
      provider: 'Supabase'
    },
    
    // Analytics cookies
    {
      name: '_ga',
      category: 'analytics',
      purpose: 'Distinguishes unique users',
      duration: '2 years',
      provider: 'Google Analytics'
    },
    {
      name: '_ga_*',
      category: 'analytics',
      purpose: 'Persists session state',
      duration: '2 years',
      provider: 'Google Analytics'
    },
    {
      name: '_gid',
      category: 'analytics',
      purpose: 'Distinguishes unique users',
      duration: '24 hours',
      provider: 'Google Analytics'
    },
    
    // Marketing cookies
    {
      name: '_fbp',
      category: 'marketing',
      purpose: 'Facebook Pixel tracking',
      duration: '3 months',
      provider: 'Facebook'
    },
    {
      name: '_fbc',
      category: 'marketing',
      purpose: 'Facebook conversion tracking',
      duration: '7 days',
      provider: 'Facebook'
    },
    
    // Functional cookies
    {
      name: 'theme',
      category: 'functional',
      purpose: 'Remembers user theme preference',
      duration: '1 year',
      provider: 'FounderLens'
    },
    {
      name: 'language',
      category: 'functional',
      purpose: 'Remembers user language preference',
      duration: '1 year',
      provider: 'FounderLens'
    }
  ];

  constructor() {
    this.loadConsent();
    this.scanExistingCookies();
  }

  private loadConsent() {
    try {
      const stored = localStorage.getItem('cookieConsent');
      this.consent = stored ? JSON.parse(stored) : null;
    } catch {
      this.consent = null;
    }
  }

  getConsent(): CookieConsent | null {
    return this.consent;
  }

  updateConsent(consent: CookieConsent) {
    this.consent = consent;
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    
    // Enforce consent by removing unauthorized cookies
    this.enforceConsent();
    
    // Notify observers
    this.observers.forEach(observer => observer(consent));
  }

  onConsentChange(callback: (consent: CookieConsent) => void) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  private enforceConsent() {
    if (!this.consent) return;

    this.getAllCookies().forEach(cookie => {
      const cookieInfo = this.getCookieInfo(cookie.name);
      if (cookieInfo && !this.isConsentGiven(cookieInfo.category)) {
        this.deleteCookie(cookie.name);
      }
    });
  }

  private isConsentGiven(category: string): boolean {
    if (!this.consent) return false;
    
    switch (category) {
      case 'essential':
        return true; // Essential cookies are always allowed
      case 'analytics':
        return this.consent.analytics;
      case 'marketing':
        return this.consent.marketing;
      case 'functional':
        return this.consent.functional;
      default:
        return false;
    }
  }

  getAllCookies() {
    return document.cookie.split(';').map(cookie => {
      const [name, value] = cookie.trim().split('=');
      return { name, value };
    }).filter(cookie => cookie.name);
  }

  getCookieInfo(cookieName: string): CookieInfo | undefined {
    return this.knownCookies.find(cookie => {
      if (cookie.name.includes('*')) {
        const pattern = cookie.name.replace('*', '.*');
        return new RegExp(pattern).test(cookieName);
      }
      return cookie.name === cookieName;
    });
  }

  getCookiesByCategory() {
    const categories = {
      essential: [] as CookieInfo[],
      analytics: [] as CookieInfo[],
      marketing: [] as CookieInfo[],
      functional: [] as CookieInfo[]
    };

    this.knownCookies.forEach(cookie => {
      categories[cookie.category].push(cookie);
    });

    return categories;
  }

  private deleteCookie(name: string) {
    // Delete cookie for current domain
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    
    // Delete cookie for parent domain (if subdomain)
    const domain = window.location.hostname;
    const parentDomain = domain.split('.').slice(-2).join('.');
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${parentDomain};`;
    
    console.log(`Deleted cookie: ${name}`);
  }

  private scanExistingCookies() {
    const existingCookies = this.getAllCookies();
    const unknownCookies = existingCookies.filter(cookie => 
      !this.getCookieInfo(cookie.name)
    );

    if (unknownCookies.length > 0) {
      console.warn('Unknown cookies detected:', unknownCookies);
      // In production, you might want to report these for analysis
    }
  }

  // Utility methods for cookie operations
  setCookie(name: string, value: string, category: 'essential' | 'analytics' | 'marketing' | 'functional', days = 365) {
    if (!this.isConsentGiven(category)) {
      console.warn(`Cannot set ${category} cookie '${name}' without consent`);
      return false;
    }

    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
    return true;
  }

  getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  // GDPR compliance methods
  exportUserData() {
    const userData = {
      consent: this.consent,
      cookies: this.getAllCookies(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      domain: window.location.hostname
    };

    return userData;
  }

  clearAllData() {
    // Clear all cookies except essential ones
    this.getAllCookies().forEach(cookie => {
      const cookieInfo = this.getCookieInfo(cookie.name);
      if (cookieInfo && cookieInfo.category !== 'essential') {
        this.deleteCookie(cookie.name);
      }
    });

    // Clear localStorage (except essential items)
    const essentialKeys = ['cookieConsent'];
    Object.keys(localStorage).forEach(key => {
      if (!essentialKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();

    console.log('User data cleared');
  }
}

export const cookieManager = new CookieManager();
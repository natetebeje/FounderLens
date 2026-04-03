
// Production-ready analytics configuration
// Set these via environment variables (e.g. in .env or your hosting provider):
//   VITE_GA4_ID=G-XXXXXXXXXX
//   VITE_FACEBOOK_PIXEL_ID=000000000000000
//   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
export const ANALYTICS_CONFIG = {
  GA4_ID: import.meta.env.VITE_GA4_ID || '',
  FACEBOOK_PIXEL_ID: import.meta.env.VITE_FACEBOOK_PIXEL_ID || '',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  ENABLED: import.meta.env.PROD
};

// Extend Window interface for gtag and fbq
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initializeGA4 = () => {
  if (!ANALYTICS_CONFIG.ENABLED || !ANALYTICS_CONFIG.GA4_ID) {
    if (import.meta.env.DEV) {
      console.log('Analytics disabled in development mode');
    }
    return;
  }

  // Load GA4 script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.GA4_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Configure GA4
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  
  gtag('js', new Date());
  gtag('config', ANALYTICS_CONFIG.GA4_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });

  // Make gtag available globally for tracking events
  window.gtag = gtag;
};

// Initialize Facebook Pixel
export const initializeFacebookPixel = () => {
  if (!ANALYTICS_CONFIG.ENABLED || !ANALYTICS_CONFIG.FACEBOOK_PIXEL_ID) {
    return;
  }

  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', ANALYTICS_CONFIG.FACEBOOK_PIXEL_ID);
  window.fbq('track', 'PageView');
};

// Track custom events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (!ANALYTICS_CONFIG.ENABLED) {
    if (import.meta.env.DEV) {
      console.log('Track Event:', eventName, parameters);
    }
    return;
  }

  // Google Analytics
  if (ANALYTICS_CONFIG.GA4_ID && window.gtag) {
    window.gtag('event', eventName, parameters);
  }

  // Facebook Pixel
  if (ANALYTICS_CONFIG.FACEBOOK_PIXEL_ID && window.fbq) {
    window.fbq('track', eventName, parameters);
  }
};

// Track page views
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (!ANALYTICS_CONFIG.ENABLED) {
    if (import.meta.env.DEV) {
      console.log('Page View:', pagePath, pageTitle);
    }
    return;
  }

  // Google Analytics
  if (ANALYTICS_CONFIG.GA4_ID && window.gtag) {
    window.gtag('config', ANALYTICS_CONFIG.GA4_ID, {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
  }

  // Facebook Pixel
  if (ANALYTICS_CONFIG.FACEBOOK_PIXEL_ID && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

// Initialize Sentry for error tracking
export const initializeSentry = async () => {
  if (!ANALYTICS_CONFIG.ENABLED || !ANALYTICS_CONFIG.SENTRY_DSN) {
    return;
  }

  try {
    const Sentry = await import('@sentry/react');
    
    Sentry.init({
      dsn: ANALYTICS_CONFIG.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
};

// Initialize all analytics
export const initializeAnalytics = () => {
  initializeGA4();
  initializeFacebookPixel();
  initializeSentry();
};

// Update consent for analytics
export const updateConsent = (consent: any) => {
  if (!ANALYTICS_CONFIG.ENABLED) {
    if (import.meta.env.DEV) {
      console.log('Update Consent:', consent);
    }
    return;
  }

  // Update GA4 consent
  if (ANALYTICS_CONFIG.GA4_ID && window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      functionality_storage: consent.functional ? 'granted' : 'denied',
    });
  }
};

// Performance tracking
export const trackPerformance = () => {
  if (!ANALYTICS_CONFIG.ENABLED) {
    if (import.meta.env.DEV) {
      console.log('Performance tracking initiated');
    }
    return;
  }

  // Track Core Web Vitals and other performance metrics
  if ('performance' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        let metricValue: number;
        
        // Handle different types of performance entries with proper type checking
        if (entry.entryType === 'navigation' || entry.entryType === 'paint') {
          metricValue = entry.startTime;
        } else if (entry.entryType === 'largest-contentful-paint') {
          metricValue = entry.startTime;
        } else if ('duration' in entry && typeof entry.duration === 'number') {
          metricValue = entry.duration;
        } else if ('value' in entry && typeof (entry as any).value === 'number') {
          metricValue = (entry as any).value;
        } else if ('startTime' in entry && typeof entry.startTime === 'number') {
          metricValue = entry.startTime;
        } else {
          // Fallback to 0 if no suitable property is found
          metricValue = 0;
        }

        trackEvent('performance_metric', {
          metric_name: entry.name,
          metric_value: metricValue,
          metric_type: entry.entryType
        });
      }
    });

    observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
  }
};

// User behavior tracking
export const trackUserBehavior = () => {
  if (!ANALYTICS_CONFIG.ENABLED) {
    if (import.meta.env.DEV) {
      console.log('User behavior tracking initiated');
    }
    return;
  }

  // Track scroll depth
  let maxScroll = 0;
  const trackScrollDepth = () => {
    const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
        trackEvent('scroll_depth', { scroll_percent: maxScroll });
      }
    }
  };

  window.addEventListener('scroll', trackScrollDepth, { passive: true });
};

// Analytics object with common tracking methods
export const analytics = {
  pageViewed: (page: string, properties?: Record<string, any>) => {
    trackEvent('page_view', { page, ...properties });
  },
  checkoutStarted: (properties?: Record<string, any>) => {
    trackEvent('begin_checkout', properties);
  },
  track: trackEvent,
  updateConsent,
  trackPerformance,
  trackUserBehavior
};

// Production-ready console logging
export const log = {
  info: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    
    // Send to Sentry in production
    if (ANALYTICS_CONFIG.ENABLED && ANALYTICS_CONFIG.SENTRY_DSN) {
      try {
        import('@sentry/react').then(Sentry => {
          Sentry.captureException(new Error(message), {
            extra: args.length > 0 ? { details: args } : undefined
          });
        });
      } catch (e) {
        // Fail silently if Sentry is not available
      }
    }
  }
};

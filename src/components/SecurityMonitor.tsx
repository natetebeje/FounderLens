import { useEffect } from 'react';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';
import { useAuth } from '@/hooks/useAuth';

export const SecurityMonitor = () => {
  const { isAuthenticated } = useAuth();
  const { logSecurityEvent } = useSessionSecurity();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Monitor for potential security threats
    const monitorConsole = () => {
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;

      // Detect if developer tools are open (basic detection)
      let devtools = false;
      const detector = () => {
        if (!devtools) {
          console.clear();
          console.log('%cDeveloper tools detected. Activity is being monitored for security purposes.', 
            'color: red; font-size: 16px; font-weight: bold;');
          devtools = true;
          logSecurityEvent('devtools_opened');
        }
      };

      const interval = setInterval(detector, 1000);

      // Monitor for suspicious console commands
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('password') || message.includes('token') || message.includes('secret')) {
          logSecurityEvent('suspicious_console_activity', { message: message.substring(0, 100) });
        }
        originalLog.apply(console, args);
      };

      return () => {
        clearInterval(interval);
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
      };
    };

    // Monitor clipboard access
    const monitorClipboard = () => {
      let clipboardAccessCount = 0;
      
      const originalWriteText = navigator.clipboard?.writeText;
      const originalReadText = navigator.clipboard?.readText;

      if (originalWriteText) {
        // @ts-ignore - We're intentionally overriding this
        navigator.clipboard.writeText = function(text: string) {
          clipboardAccessCount++;
          if (clipboardAccessCount > 10) { // Threshold for suspicious activity
            logSecurityEvent('excessive_clipboard_access', { count: clipboardAccessCount });
          }
          return originalWriteText.call(this, text);
        };
      }

      if (originalReadText) {
        // @ts-ignore - We're intentionally overriding this
        navigator.clipboard.readText = function() {
          clipboardAccessCount++;
          if (clipboardAccessCount > 10) {
            logSecurityEvent('excessive_clipboard_access', { count: clipboardAccessCount });
          }
          return originalReadText.call(this);
        };
      }

      return () => {
        if (originalWriteText) navigator.clipboard.writeText = originalWriteText;
        if (originalReadText) navigator.clipboard.readText = originalReadText;
      };
    };

    // Monitor for injection attempts
    const monitorInjection = () => {
      // Monitor for script tag injection
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-allowed')) {
                logSecurityEvent('script_injection_attempt', {
                  src: (element as HTMLScriptElement).src,
                  content: (element as HTMLScriptElement).textContent?.substring(0, 100)
                });
                element.remove();
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    };

    // Monitor for unusual navigation patterns
    const monitorNavigation = () => {
      let rapidNavigationCount = 0;
      let lastNavigationTime = Date.now();

      const handleNavigation = () => {
        const now = Date.now();
        if (now - lastNavigationTime < 100) { // Less than 100ms between navigations
          rapidNavigationCount++;
          if (rapidNavigationCount > 5) {
            logSecurityEvent('rapid_navigation_pattern', { count: rapidNavigationCount });
          }
        } else {
          rapidNavigationCount = 0;
        }
        lastNavigationTime = now;
      };

      window.addEventListener('popstate', handleNavigation);

      return () => {
        window.removeEventListener('popstate', handleNavigation);
      };
    };

    const cleanupConsole = monitorConsole();
    const cleanupClipboard = monitorClipboard();
    const cleanupInjection = monitorInjection();
    const cleanupNavigation = monitorNavigation();

    return () => {
      cleanupConsole();
      cleanupClipboard();
      cleanupInjection();
      cleanupNavigation();
    };
  }, [isAuthenticated, logSecurityEvent]);

  // This component doesn't render anything - it's just for monitoring
  return null;
};
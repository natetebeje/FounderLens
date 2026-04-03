interface FormTimingData {
  formStartTime: number;
  interactionCount: number;
  keystrokes: number;
  mouseMovements: number;
}

class BotProtection {
  private formTimings = new Map<string, FormTimingData>();
  private suspiciousAttempts = new Map<string, number>();

  // Initialize form timing tracking
  initFormTiming(formId: string): void {
    this.formTimings.set(formId, {
      formStartTime: Date.now(),
      interactionCount: 0,
      keystrokes: 0,
      mouseMovements: 0
    });
  }

  // Track user interactions
  trackInteraction(formId: string, type: 'keystroke' | 'mouse' | 'focus'): void {
    const timing = this.formTimings.get(formId);
    if (!timing) return;

    timing.interactionCount++;
    
    if (type === 'keystroke') {
      timing.keystrokes++;
    } else if (type === 'mouse') {
      timing.mouseMovements++;
    }
  }

  // Validate form submission
  validateSubmission(formId: string, honeypotValue: string): {
    isBot: boolean;
    reason?: string;
    confidence: number;
  } {
    // Check honeypot field
    if (honeypotValue && honeypotValue.trim() !== '') {
      return {
        isBot: true,
        reason: 'Honeypot field filled',
        confidence: 0.95
      };
    }

    const timing = this.formTimings.get(formId);
    if (!timing) {
      return {
        isBot: true,
        reason: 'No timing data',
        confidence: 0.8
      };
    }

    const submissionTime = Date.now();
    const fillTime = submissionTime - timing.formStartTime;
    
    let botScore = 0;
    const reasons: string[] = [];

    // Too fast (less than 2 seconds)
    if (fillTime < 2000) {
      botScore += 0.7;
      reasons.push('Form filled too quickly');
    }

    // Too slow (more than 30 minutes)
    if (fillTime > 30 * 60 * 1000) {
      botScore += 0.3;
      reasons.push('Form took too long to fill');
    }

    // No user interactions
    if (timing.interactionCount === 0) {
      botScore += 0.6;
      reasons.push('No user interactions detected');
    }

    // Very few keystrokes for text fields
    if (timing.keystrokes < 5) {
      botScore += 0.3;
      reasons.push('Insufficient typing activity');
    }

    // No mouse movements
    if (timing.mouseMovements === 0) {
      botScore += 0.2;
      reasons.push('No mouse movement detected');
    }

    // Clean up timing data
    this.formTimings.delete(formId);

    return {
      isBot: botScore >= 0.6,
      reason: reasons.join(', '),
      confidence: Math.min(botScore, 1.0)
    };
  }

  // Track suspicious attempts for IP/user
  trackSuspiciousAttempt(identifier: string): boolean {
    const attempts = this.suspiciousAttempts.get(identifier) || 0;
    const newAttempts = attempts + 1;
    
    this.suspiciousAttempts.set(identifier, newAttempts);
    
    // Block after 3 suspicious attempts
    return newAttempts >= 3;
  }

  // Generate honeypot field props
  generateHoneypotProps(): {
    name: string;
    style: React.CSSProperties;
    tabIndex: number;
    autoComplete: string;
  } {
    return {
      name: 'website_url', // Common bot target field name
      style: {
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none'
      },
      tabIndex: -1,
      autoComplete: 'off'
    };
  }

  // Add event listeners for interaction tracking
  attachListeners(formElement: HTMLFormElement, formId: string): () => void {
    const handleKeydown = () => this.trackInteraction(formId, 'keystroke');
    const handleMouseMove = () => this.trackInteraction(formId, 'mouse');
    const handleFocus = () => this.trackInteraction(formId, 'focus');

    formElement.addEventListener('keydown', handleKeydown);
    formElement.addEventListener('mousemove', handleMouseMove);
    formElement.addEventListener('focusin', handleFocus);

    // Return cleanup function
    return () => {
      formElement.removeEventListener('keydown', handleKeydown);
      formElement.removeEventListener('mousemove', handleMouseMove);
      formElement.removeEventListener('focusin', handleFocus);
    };
  }
}

export const botProtection = new BotProtection();

// React hook for bot protection
import React from 'react';

export const useBotProtection = (formId: string) => {
  const [honeypotValue, setHoneypotValue] = React.useState('');
  
  React.useEffect(() => {
    botProtection.initFormTiming(formId);
  }, [formId]);

  const honeypotProps = React.useMemo(() => ({
    ...botProtection.generateHoneypotProps(),
    value: honeypotValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setHoneypotValue(e.target.value)
  }), [honeypotValue]);

  const validateSubmission = React.useCallback(() => {
    return botProtection.validateSubmission(formId, honeypotValue);
  }, [formId, honeypotValue]);

  const attachListeners = React.useCallback((formElement: HTMLFormElement) => {
    return botProtection.attachListeners(formElement, formId);
  }, [formId]);

  return {
    honeypotProps,
    validateSubmission,
    attachListeners
  };
};
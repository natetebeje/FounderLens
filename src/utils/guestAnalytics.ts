// Guest mode analytics tracking
export const trackGuestEvent = (event: string, properties?: Record<string, any>) => {
  try {
    console.log(`[Guest Analytics] ${event}`, properties);
    
    // Store in localStorage for later reporting
    const events = JSON.parse(localStorage.getItem('guestEvents') || '[]');
    events.push({
      event,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: getGuestSessionId()
    });
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    localStorage.setItem('guestEvents', JSON.stringify(events));
  } catch (error) {
    console.error('Error tracking guest event:', error);
  }
};

const getGuestSessionId = (): string => {
  let sessionId = localStorage.getItem('guestSessionId');
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('guestSessionId', sessionId);
  }
  return sessionId;
};

export const getGuestConversionData = () => {
  try {
    const events = JSON.parse(localStorage.getItem('guestEvents') || '[]');
    return {
      sessionId: getGuestSessionId(),
      events,
      totalEvents: events.length
    };
  } catch {
    return { sessionId: getGuestSessionId(), events: [], totalEvents: 0 };
  }
};

export const clearGuestEvents = () => {
  localStorage.removeItem('guestEvents');
  localStorage.removeItem('guestSessionId');
};

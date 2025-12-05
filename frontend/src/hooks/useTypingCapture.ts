import { useState, useEffect, useCallback } from 'react';

// define the structure of a typing event
interface TypingEvent {
  type: 'keydown' | 'keyup';
  key: string;
  timestamp: number; 
}

export function useTypingCapture(isCapturing: boolean) {
  const [events, setEvents] = useState<TypingEvent[]>([]);
  const reset = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (!isCapturing) {
      return; 
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        const newEvent: TypingEvent = {
          type: 'keydown',
          key: e.key,
          timestamp: performance.now(),
        };
        setEvents(prev => [...prev, newEvent]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        const newEvent: TypingEvent = {
          type: 'keyup',
          key: e.key,
          timestamp: performance.now(),
        };
        setEvents(prev => [...prev, newEvent]);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); 
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isCapturing]);

  return { events, reset };
}


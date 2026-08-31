import React, { useEffect, useState } from 'react';
import { usePlaybackTimers } from './PlaybackContext';

export function TypewriterText({ text, speed = 25, delay = 0, onComplete }: { text: string; speed?: number; delay?: number; onComplete?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const { setTimeout, clearTimeout, setInterval, clearInterval } = usePlaybackTimers();

  useEffect(() => {
    let timeout: number | undefined;
    let interval: number | undefined;
    
    if (delay > 0) {
      timeout = setTimeout(() => {
        startTyping();
      }, delay);
    } else {
      startTyping();
    }
    
    function startTyping() {
      let i = 0;
      interval = setInterval(() => {
        setDisplayed(text.substring(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval!);
          onComplete?.();
        }
      }, 1000 / speed);
    }
    
    return () => {
      if (timeout !== undefined) clearTimeout(timeout);
      if (interval !== undefined) clearInterval(interval);
    };
  }, [text, speed, delay, onComplete]);

  return <span>{displayed}</span>;
}

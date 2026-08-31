import React, { useEffect, useState } from 'react';
import { usePlaybackTimers } from './PlaybackContext';

export function StreamingText({ text, delay = 0, onComplete }: { text: string; delay?: number; onComplete?: () => void }) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const { setTimeout, clearTimeout, setInterval, clearInterval } = usePlaybackTimers();
  
  useEffect(() => {
    const words = text.split(' ');
    let i = 0;
    let interval: number | undefined;
    
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayedWords(prev => [...prev, words[i]]);
        i++;
        if (i >= words.length) {
          clearInterval(interval!);
          onComplete?.();
        }
      }, 150);
    }, delay);
    
    return () => {
      clearTimeout(timeout);
      if (interval !== undefined) clearInterval(interval);
    };
  }, [text, delay, onComplete]);

  return <span>{displayedWords.join(' ')}</span>;
}

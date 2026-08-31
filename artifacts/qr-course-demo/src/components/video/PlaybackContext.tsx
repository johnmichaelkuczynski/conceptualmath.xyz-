import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

const PlaybackContext = createContext(true);

export function PlaybackProvider({
  playing,
  children,
}: {
  playing: boolean;
  children: ReactNode;
}) {
  return (
    <PlaybackContext.Provider value={playing}>
      {children}
    </PlaybackContext.Provider>
  );
}

type TimerRecord = {
  callback: () => void;
  delay: number;
  remaining: number;
  startedAt: number;
  nativeId?: number;
  repeating: boolean;
};

export function usePlaybackTimers() {
  const playing = useContext(PlaybackContext);
  const playingRef = useRef(playing);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, TimerRecord>());

  const schedule = useCallback((id: number, timer: TimerRecord) => {
    timer.startedAt = performance.now();
    timer.nativeId = window.setTimeout(() => {
      timer.nativeId = undefined;
      timer.callback();
      if (timer.repeating && timersRef.current.has(id)) {
        timer.remaining = timer.delay;
        if (playingRef.current) schedule(id, timer);
      } else {
        timersRef.current.delete(id);
      }
    }, timer.remaining);
  }, []);

  const setPlaybackTimer = useCallback(
    (callback: () => void, delay = 0, repeating = false) => {
      const id = nextIdRef.current++;
      const timer: TimerRecord = {
        callback,
        delay,
        remaining: delay,
        startedAt: 0,
        repeating,
      };
      timersRef.current.set(id, timer);
      if (playingRef.current) schedule(id, timer);
      return id;
    },
    [schedule],
  );

  const clearPlaybackTimer = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer?.nativeId !== undefined) window.clearTimeout(timer.nativeId);
    timersRef.current.delete(id);
  }, []);

  useEffect(() => {
    playingRef.current = playing;
    const now = performance.now();

    for (const [id, timer] of timersRef.current) {
      if (!playing && timer.nativeId !== undefined) {
        window.clearTimeout(timer.nativeId);
        timer.nativeId = undefined;
        timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
      } else if (playing && timer.nativeId === undefined) {
        schedule(id, timer);
      }
    }
  }, [playing, schedule]);

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        if (timer.nativeId !== undefined) window.clearTimeout(timer.nativeId);
      }
      timersRef.current.clear();
    },
    [],
  );

  return {
    setTimeout: (callback: () => void, delay?: number) =>
      setPlaybackTimer(callback, delay, false),
    clearTimeout: clearPlaybackTimer,
    setInterval: (callback: () => void, delay?: number) =>
      setPlaybackTimer(callback, delay, true),
    clearInterval: clearPlaybackTimer,
  };
}

export function usePlaybackPlaying() {
  return useContext(PlaybackContext);
}
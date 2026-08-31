import { AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { useState, useEffect, useRef } from 'react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { CursorPointer } from './CursorPointer';
import { PlaybackProvider } from './PlaybackContext';

export const SCENE_DURATIONS = {
  s1: 6000,
  s2: 8000,
  s3: 8000,
  s4: 7000,
  s5: 6000,
};

export const SCENE_CAPTIONS: Record<string, string> = {
  s1: 'Colleges are spending millions on remedial math, and watching most students drop or fail.',
  s2: 'This course covers whole numbers, fractions, decimals, percents, ratios, equations, graphing, and beginning algebra.',
  s3: 'Students get clear lectures, unlimited practice, and step-by-step guidance that keeps them moving in the right direction.',
  s4: 'Precise analytics identify each weakness and prescribe the training each student actually needs.',
  s5: 'Colleges have a choice: adopt this system, or keep paying for failure until they go bankrupt.',
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

type SceneProps = {
  setCursorPos: (p: { x: string; y: string }) => void;
  setIsClicking: (v: boolean) => void;
};

const SCENE_COMPONENTS: Record<string, React.ComponentType<SceneProps>> = {
  s1: Scene1,
  s2: Scene2,
  s3: Scene3,
  s4: Scene4,
  s5: Scene5,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  playing = true,
  captionsEnabled = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  playing?: boolean;
  captionsEnabled?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused: !playing });
  const [cursorPos, setCursorPos] = useState({ x: '50cqw', y: '50cqh' });
  const [isClicking, setIsClicking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1.0;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
  }, [currentSceneKey, baseSceneKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playing]);

  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <PlaybackProvider playing={playing}>
      <div className="w-full h-screen overflow-hidden bg-slate-900 relative flex items-center justify-center">
        {/* Main Content Area - Enforced 9:16 Frame */}
        <div className="w-full aspect-[9/16] max-h-screen max-w-[calc(100vh*9/16)] relative bg-slate-50 overflow-hidden" style={{ containerType: 'size' }}>
          <AnimatePresence mode="popLayout">
            {SceneComponent && (
              <SceneComponent
                key={currentSceneKey}
                setCursorPos={setCursorPos}
                setIsClicking={setIsClicking}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Global Cursor */}
        <CursorPointer x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />

        {captionsEnabled && (
          <div
            className="absolute bottom-24 left-1/2 z-30 max-w-3xl w-[90cqw] -translate-x-1/2 rounded-md bg-black/75 px-5 py-2 text-center text-[3.5cqw] md:text-[4cqw] leading-relaxed text-white shadow-lg"
            role="status"
            aria-live="polite"
            aria-label="Demo captions"
          >
            {SCENE_CAPTIONS[baseSceneKey]}
          </div>
        )}

        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/remedial_admin_narration_v3.mp3`}
          preload="auto"
          autoPlay={playing}
          muted={muted}
        />
      </div>
    </PlaybackProvider>
  );
}
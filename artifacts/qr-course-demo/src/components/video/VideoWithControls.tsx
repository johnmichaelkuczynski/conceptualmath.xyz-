import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Captions,
  ChevronDown,
  ChevronUp,
  Play,
  Repeat,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  collapsible: boolean;
  locked: boolean;
  muted: boolean;
  playing: boolean;
  captionsEnabled: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onToggleLock: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onToggleCaptions: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
}

function ProgressSegments({
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  playing,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  playing: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = 0;
    setElapsed(0);
  }, [tick]);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - elapsedRef.current;
    const id = window.setInterval(() => {
      const nextElapsed = performance.now() - start;
      elapsedRef.current = nextElapsed;
      setElapsed(nextElapsed);
    }, PROGRESS_TICK_MS);
    return () => {
      elapsedRef.current = performance.now() - start;
      window.clearInterval(id);
    };
  }, [playing, tick]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;

  return (
    <div className="flex-1 flex items-center gap-1.5">
      {sceneKeys.map((key, i) => {
        const isActive = i === activeIndex;
        const fill = isActive ? progress * 100 : 0;
        return (
          <button
            key={key}
            onClick={() => onJumpTo(i)}
            className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-4 hover:bg-white/25 transition-all relative min-h-[12px]"
            aria-label={`Jump to scene ${i + 1}`}
            aria-current={isActive ? 'true' : undefined}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/90 rounded-full transition-[width] duration-100"
              style={{ width: `${fill}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ControlBar({
  visible,
  collapsed,
  collapsible,
  locked,
  muted,
  playing,
  captionsEnabled,
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onToggleLock,
  onToggleMute,
  onTogglePlay,
  onToggleCaptions,
  onJumpTo,
  onToggleCollapsed,
}: ControlBarProps) {
  if (!visible) {
    return (
      <div className="flex justify-end bg-black/50 px-5 py-3 backdrop-blur-sm">
        <button
          onClick={onToggleCollapsed}
          className="w-14 h-14 flex items-center justify-center text-white hover:bg-white/10 transition-colors rounded-lg"
          title="Show controls"
          aria-label="Show controls"
          aria-expanded={false}
        >
          <ChevronUp className="w-10 h-10" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-4 transition-all duration-200 ease-out"
    >
      <button
        onClick={onTogglePlay}
        className="w-14 h-14 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title={playing ? 'Stop demo' : 'Play current scene from start'}
        aria-label={playing ? 'Stop demo' : 'Play current scene from start'}
        aria-pressed={playing}
      >
        {playing ? <Square className="w-8 h-8" /> : <Play className="w-8 h-8" />}
      </button>

      <button
        onClick={onToggleLock}
        className={`w-14 h-14 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          locked
            ? 'text-white bg-white/15 hover:bg-white/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
        aria-pressed={locked}
      >
        <Repeat className="w-8 h-8" />
      </button>

      <button
        onClick={onToggleMute}
        className="w-14 h-14 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={!muted}
      >
        {muted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
      </button>

      <button
        onClick={onToggleCaptions}
        className={`w-14 h-14 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          captionsEnabled
            ? 'text-white bg-white/15 hover:bg-white/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={captionsEnabled ? 'Turn captions off' : 'Turn captions on'}
        aria-label={captionsEnabled ? 'Turn captions off' : 'Turn captions on'}
        aria-pressed={captionsEnabled}
      >
        <Captions className="w-8 h-8" />
      </button>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <ProgressSegments
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        tick={tick}
        playing={playing}
        onJumpTo={onJumpTo}
      />

      <div className="text-xl text-white/60 font-mono tabular-nums shrink-0">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      {collapsible && (
        <button
          onClick={onToggleCollapsed}
          className="w-14 h-14 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
          title={collapsed ? 'Show controls' : 'Hide controls'}
          aria-label={collapsed ? 'Show controls' : 'Hide controls'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronUp className="w-10 h-10" /> : <ChevronDown className="w-10 h-10" />}
        </button>
      )}
    </div>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;

  const {
    sceneKeys,
    activeIndex,
    locked,
    mountKey,
    tick,
    durations,
    activeDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
  } = useSceneControls(SCENE_DURATIONS);

  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [stoppedSnapshot, setStoppedSnapshot] = useState<string | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') return;
      if (collapsed) setTapPinned(true);
    },
    [collapsed],
  );
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      if (!c) {
        setHovering(false);
        setTapPinned(false);
      }
      return !c;
    });
  }, []);
  const handleTogglePlay = useCallback(() => {
    if (playing) {
      const frozenVisual = visualRef.current?.cloneNode(true) as HTMLDivElement | undefined;
      frozenVisual?.querySelectorAll('audio').forEach((audio) => audio.remove());
      setStoppedSnapshot(frozenVisual?.innerHTML ?? null);
      setPlaying(false);
      return;
    }
    jumpTo(activeIndex);
    setStoppedSnapshot(null);
    setPlaying(true);
  }, [activeIndex, jumpTo, playing]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(e.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [collapsed, tapPinned]);

  const barVisible = !isIframed || !collapsed || hovering || tapPinned;

  return (
    <div className="relative w-full h-screen">
      <div ref={visualRef} className="absolute inset-0">
        <VideoTemplate
          key={mountKey}
          durations={durations}
          loop
          playing={playing}
          muted={muted}
          captionsEnabled={captionsEnabled}
          onSceneChange={onSceneChange}
        />
      </div>
      {stoppedSnapshot && (
        <div
          className="absolute inset-0 z-40 overflow-hidden pointer-events-none"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: stoppedSnapshot }}
        />
      )}
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="flex-1 w-full" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          collapsible={isIframed}
          locked={locked}
          muted={muted}
          playing={playing}
          captionsEnabled={captionsEnabled}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          tick={tick}
          onToggleLock={toggleLock}
          onToggleMute={() => setMuted((m) => !m)}
          onTogglePlay={handleTogglePlay}
          onToggleCaptions={() => setCaptionsEnabled((enabled) => !enabled)}
          onJumpTo={jumpTo}
          onToggleCollapsed={handleToggleCollapsed}
        />
      </div>
    </div>
  );
}

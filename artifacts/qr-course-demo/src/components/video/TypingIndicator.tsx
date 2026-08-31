import { motion } from 'framer-motion';
import { usePlaybackPlaying } from './PlaybackContext';

export function TypingIndicator() {
  const playing = usePlaybackPlaying();
  const bounce = playing ? { y: [0, -4, 0] } : false;

  return (
    <div className="flex space-x-1 p-2 bg-white rounded-lg shadow-sm w-fit border border-border">
      <motion.div className="w-2 h-2 rounded-full bg-muted-foreground" animate={bounce} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
      <motion.div className="w-2 h-2 rounded-full bg-muted-foreground" animate={bounce} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
      <motion.div className="w-2 h-2 rounded-full bg-muted-foreground" animate={bounce} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene5({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110vw', y: '50vh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 1, ease: [0.7, 0, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full px-8">

        <AnimatePresence mode="popLayout">
          {phase >= 1 && (
            <motion.div
              className="flex flex-col space-y-6 mb-16 text-center w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, staggerChildren: 0.2 }}
            >
              <motion.div
                className="text-[12cqw] leading-tight font-serif text-slate-50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Reduce Cost.
              </motion.div>
              <motion.div
                className="text-[12cqw] leading-tight font-serif text-teal-400"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Improve<br/>Completion.
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center bg-white/5 px-8 py-10 rounded-3xl border border-white/10 backdrop-blur-sm w-full max-w-sm mt-8"
            >
              <img
                src={`${import.meta.env.BASE_URL}images/zhi_logo.png`}
                alt="ZHI"
                className="h-20 mb-6 object-contain"
              />
              <div className="text-[5cqw] font-sans font-bold tracking-wider text-sky-400">
                zhisystems.ai
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}

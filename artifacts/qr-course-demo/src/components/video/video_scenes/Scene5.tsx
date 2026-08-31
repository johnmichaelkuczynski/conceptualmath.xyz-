import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene5({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110cqw', y: '50cqh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
              className="flex flex-col space-y-4 mb-12 text-center w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="text-[12cqw] leading-tight font-sans font-bold text-slate-50 uppercase tracking-tighter"
              >
                Colleges have
              </motion.div>
              <motion.div
                className="text-[12cqw] leading-tight font-sans font-bold text-slate-50 uppercase tracking-tighter"
              >
                a choice.
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 2 && (
            <motion.div
              className="flex flex-col space-y-4 mb-16 text-center w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: 'spring' }}
            >
              <motion.div
                className="text-[14cqw] leading-none font-serif font-black text-sky-400"
              >
                USE THIS APP
              </motion.div>
              <motion.div
                className="text-[7cqw] leading-none font-sans font-bold text-rose-500 uppercase tracking-widest mt-4"
              >
                OR GO BANKRUPT
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center mt-4"
            >
              <img
                src={`${import.meta.env.BASE_URL}images/zhi_logo.png`}
                alt="ZHI"
                className="h-16 mb-4 object-contain brightness-0 invert"
              />
              <div className="text-[5cqw] font-sans font-bold tracking-wider text-slate-300">
                zhisystems.ai
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene4({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110cqw', y: '50cqh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2500);
    const t3 = setTimeout(() => setPhase(3), 4500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%' }}
      transition={{ duration: 1, ease: [0.7, 0, 0.3, 1] }}
    >
      <motion.div
        className="absolute w-[150%] h-[150%]"
        initial={{ y: '-10%', x: '-10%' }}
        animate={{ y: 0, x: 0 }}
        transition={{ duration: 7, ease: 'easeOut' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}site-shots/analytics.jpg`}
          className="w-full h-full object-cover opacity-25 mix-blend-screen"
          alt="Analytics page"
        />
        <div className="absolute inset-0 bg-slate-900/60" />
      </motion.div>

      <div className="relative z-10 w-full h-full px-8 py-20 flex flex-col items-center justify-center space-y-10">

        <AnimatePresence mode="popLayout">
          {phase >= 1 && (
            <motion.div
              className="text-center w-full"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-[14cqw] leading-[1.1] font-serif font-bold text-white mb-4 uppercase drop-shadow-2xl shadow-black">
                PRECISE<br/>ANALYTICS.
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full flex flex-col space-y-6">
          <AnimatePresence mode="popLayout">
            {phase >= 2 && (
              <motion.div
                className="bg-slate-800/95 border border-slate-600/50 p-6 rounded-2xl shadow-2xl w-full backdrop-blur-sm"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="text-[7.5cqw] font-sans font-medium text-sky-300 leading-tight text-center">
                  Identifies each weakness.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {phase >= 3 && (
              <motion.div
                className="bg-slate-800/95 border border-slate-600/50 p-6 rounded-2xl shadow-2xl w-full backdrop-blur-sm"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <div className="text-[7.5cqw] font-sans font-medium text-teal-300 leading-tight text-center">
                  Prescribes the training each student needs.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}

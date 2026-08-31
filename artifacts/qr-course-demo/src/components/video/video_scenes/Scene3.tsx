import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene3({ setCursorPos }: { setCursorPos: (pos: {x: string, y: string}) => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setCursorPos({ x: '110vw', y: '50vh' });
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => setPhase(3), 3500);
    const t4 = setTimeout(() => setPhase(4), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [setCursorPos]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(56,189,248,0.1),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-full h-full px-8 py-20 flex flex-col items-start justify-center">

        <motion.div
          className="mb-12 w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-[5cqw] font-sans font-bold tracking-widest text-sky-500 uppercase mb-4">
            The Alternative
          </div>
          <h2 className="text-[12cqw] leading-tight font-serif text-slate-50">
            ZHI Systems
          </h2>
        </motion.div>

        <div className="space-y-8 w-full">
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                className="flex items-start space-x-4 w-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="w-8 h-8 rounded-full bg-sky-900 flex items-center justify-center shrink-0 mt-1">
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full" />
                </div>
                <div>
                  <h3 className="text-[6cqw] font-sans font-medium text-slate-100">Supplements Instructors</h3>
                  <p className="text-[4.5cqw] text-slate-400 mt-1">Without removing support.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                className="flex items-start space-x-4 w-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="w-8 h-8 rounded-full bg-sky-900 flex items-center justify-center shrink-0 mt-1">
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full" />
                </div>
                <div>
                  <h3 className="text-[6cqw] font-sans font-medium text-slate-100">Expands Capacity</h3>
                  <p className="text-[4.5cqw] text-slate-400 mt-1">Reduces staffing requirements.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase >= 4 && (
              <motion.div
                className="flex items-start space-x-4 w-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="w-8 h-8 rounded-full bg-teal-900 flex items-center justify-center shrink-0 mt-1">
                  <div className="w-2.5 h-2.5 bg-teal-400 rounded-full" />
                </div>
                <div>
                  <h3 className="text-[6cqw] font-sans font-semibold text-white">Reduces Operating Costs</h3>
                  <p className="text-[4.5cqw] text-slate-400 mt-1">Sustainable institutional scale.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}

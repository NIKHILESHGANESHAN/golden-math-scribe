import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PHI = 1.618033988749895;

const IntroAnimation = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => onComplete(), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative flex flex-col items-center">
          {/* Golden Spiral SVG */}
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            className="mb-8"
          >
            {/* Initial square */}
            <motion.rect
              x="70"
              y="70"
              width="140"
              height="140"
              fill="none"
              stroke="hsl(43, 74%, 49%)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: phase >= 0 ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            />

            {/* Golden rectangle extension */}
            <motion.rect
              x="20"
              y="70"
              width={140 * PHI}
              height="140"
              fill="none"
              stroke="hsl(43, 74%, 49%)"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: phase >= 1 ? 0.6 : 0 }}
              transition={{ duration: 0.6 }}
            />

            {/* Inner subdivisions */}
            {phase >= 2 && (
              <>
                <motion.line
                  x1="70" y1="70" x2="70" y2="210"
                  stroke="hsl(43, 74%, 49%)"
                  strokeWidth="1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 0.4 }}
                />
                <motion.line
                  x1="70" y1="156" x2="210" y2="156"
                  stroke="hsl(43, 74%, 49%)"
                  strokeWidth="1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                />
              </>
            )}

            {/* Golden Spiral */}
            {phase >= 3 && (
              <motion.path
                d="M 210 210 
                   A 140 140 0 0 1 70 70 
                   A 86 86 0 0 1 156 156 
                   A 54 54 0 0 1 103 103 
                   A 33 33 0 0 1 136 136
                   A 20 20 0 0 1 116 116"
                fill="none"
                stroke="hsl(43, 80%, 60%)"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            )}
          </svg>

          {/* Title */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold gold-text tracking-tight">
              GoldenRatio
            </h1>
            <motion.p
              className="mt-3 text-muted-foreground text-lg font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 2 ? 1 : 0 }}
              transition={{ duration: 0.6 }}
            >
              Mathematics, beautifully understood
            </motion.p>
          </motion.div>

          {/* Phi value */}
          <motion.p
            className="mt-6 text-sm tracking-[0.3em] text-muted-foreground font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 3 ? 0.6 : 0 }}
            transition={{ duration: 0.5 }}
          >
            φ = 1.618033988749...
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IntroAnimation;

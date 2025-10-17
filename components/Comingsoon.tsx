import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Construction, Sparkles, Coffee, Code, Brush, Rocket } from 'lucide-react';

const ComingSoon = () => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Update window size in the browser to make it dynamic 
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      handleResize(); // Initialize on mount
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const devStages = [
    { icon: Coffee, text: 'Brainstorming' },
    { icon: Code, text: 'Coding' },
    { icon: Brush, text: 'Designing' },
    { icon: Rocket, text: 'Testing' },
  ];

  return (
    <motion.div
      className="min-h-[70vh] flex flex-col items-center justify-center p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background sparkles */}
      {windowSize.width > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              animate={{
                x: [
                  Math.random() * windowSize.width,
                  Math.random() * windowSize.width,
                ],
                y: [
                  Math.random() * windowSize.height,
                  Math.random() * windowSize.height,
                ],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: Math.random() * 5 + 3,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              <Sparkles
                size={Math.random() * 20 + 10}
                style={{ color: 'var(--footer-link)' }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Main content */}
      <motion.div className="text-center relative z-10" variants={itemVariants}>
        <motion.div
          className="mb-8 inline-block"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Construction size={48} style={{ color: 'var(--footer-link)' }} />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl font-bold mb-6"
          style={{ color: 'var(--footer-link)' }}
          variants={itemVariants}
        >
          Under Construction
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl mb-12 max-w-2xl"
          style={{ color: 'var(--footer-muted)' }}
          variants={itemVariants}
        >
          Our development team is cooking up something special! This feature is
          currently in the works.
        </motion.p>

        {/* Development Stages */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto"
          variants={itemVariants}
        >
          {devStages.map(({ icon: Icon, text }, index) => (
            <motion.div
              key={text}
              className="p-4 rounded-lg"
              style={{ background: 'var(--card-bg)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                y: [0, -5, 0],
                transition: {
                  duration: 2,
                  delay: index * 0.2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                },
              }}
            >
              <div className="flex flex-col items-center">
                <Icon
                  size={24}
                  style={{ color: 'var(--footer-link)' }}
                  className="mb-2"
                />
                <span
                  className="text-sm"
                  style={{ color: 'var(--footer-muted)' }}
                >
                  {text}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ComingSoon;

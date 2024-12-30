import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../Context/ThemeContext';
import { Construction, Sparkles, Coffee, Code, Brush, Rocket } from 'lucide-react';

const ComingSoon = () => {
  const { theme } = useTheme();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  const devStages = [
    { icon: Coffee, text: "Brainstorming" },
    { icon: Code, text: "Coding" },
    { icon: Brush, text: "Designing" },
    { icon: Rocket, text: "Testing" }
  ];

  return (
    <motion.div
      className="min-h-[70vh] flex flex-col items-center justify-center p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight
              ],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <Sparkles
              size={Math.random() * 20 + 10}
              style={{ color: 'var(--footer-link)' }}
            />
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <motion.div 
        className="text-center relative z-10"
        variants={itemVariants}
      >
        <motion.div
          className="mb-8 inline-block"
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Construction 
            size={48}
            style={{ color: 'var(--footer-link)' }}
          />
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
          Our development team is cooking up something special! This feature is currently in the works.
        </motion.p>

        {/* Development Progress Visualization */}
        <motion.div
          className="mb-12 relative"
          variants={itemVariants}
        >
          <div 
            className="w-full max-w-md mx-auto h-3 rounded-full overflow-hidden"
            style={{ background: 'var(--card-bg)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--footer-link)' }}
              animate={{
                x: ["-100%", "100%"],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>

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
                  repeatType: "reverse"
                }
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

        {/* Features Preview */}
        <motion.div
          className="text-left max-w-md mx-auto bg-opacity-50 rounded-lg p-6"
          style={{ background: 'var(--card-bg)' }}
          variants={itemVariants}
        >
          <h3 
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--footer-link)' }}
          >
            What to Expect
          </h3>
          <div className="space-y-3">
            {[
              "Enhanced user experience with new features",
              "Improved performance and reliability",
              "Modern design and intuitive interface",
              "Advanced functionality coming your way"
            ].map((feature, index) => (
              <motion.div
                key={feature}
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ x: 10 }}
              >
                <Sparkles 
                  className="mr-3 flex-shrink-0"
                  size={16}
                  style={{ color: 'var(--footer-link)' }}
                />
                <span style={{ color: 'var(--footer-muted)' }}>{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ComingSoon;
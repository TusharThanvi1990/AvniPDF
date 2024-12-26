// components/ThemeToggle.tsx
"use client";
import React, { useState, useEffect } from 'react';

const ThemeToggle: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <div
      onClick={toggleTheme}
      className="flex items-center cursor-pointer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ marginRight: '8px' }}>{isDarkMode ? '🌙' : '☀️'}</span>
      <div
        style={{
          position: 'relative',
          width: '50px',
          height: '25px',
          borderRadius: '15px',
          backgroundColor: isDarkMode ? '#4A5568' : '#E2E8F0',
          transition: 'background-color 0.3s',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: isDarkMode ? '26px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'left 0.3s',
          }}
        />
      </div>
    </div>
  );
};

export default ThemeToggle;

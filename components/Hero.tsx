'use client';

import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';
import Card from './Card';

// Register the plugin
gsap.registerPlugin(TextPlugin);

const Hero = () => {

  const cards = [
    { title: 'PDF Editor', link: '/pdf-editor',},
    { title: 'Image to PDF/Word', link: '/image-to-pdf',   },
    { title: 'PDF to Word', link: '/pdf-to-word',  },
    { title: 'PDF to Excel', link: '/pdf-to-excel' },
    { title: 'Word to PDF', link: '/word-to-pdf'},
    { title: 'Merge PDF', link: '/merge-pdf' },
    { title: 'Split PDF', link: '/split-pdf' },
    { title: 'Compress PDF', link: '/compress-pdf' },
  ];

  useEffect(() => {
    // Hero text animation logic remains the same
    const heroTextElement = document.querySelector('.hero-text');
    if (heroTextElement) {
      heroTextElement.innerHTML = '';
    }

    const characters = "Made by Me with LOVE ❤️".split('');

    gsap.set('.hero-text', { opacity: 1 });

    characters.forEach((char, index) => {
      const charElement = document.createElement('span');
      charElement.innerText = char;

      heroTextElement?.appendChild(charElement);

      gsap.fromTo(
        charElement,
        {
          opacity: 0,
          y: Math.random() * 20 - 10,
          x: Math.random() * 20 - 10,
        },
        {
          opacity: 1,
          y: Math.random() * 30 - 15,
          x: Math.random() * 30 - 15,
          repeat: -1,
          yoyo: true,
          duration: 2 + Math.random() * 2,
          ease: 'power2.inOut',
          delay: index * 0.05,
        }
      );
    });

    gsap.set('.hero-card-container .card', { opacity: 0, y: 50 });

    gsap.to('.hero-card-container .card', {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.2,
      delay: 5,
      ease: 'power3.out',
    });
  }, []);

  return (
    <section className="hero-section">
      <h1 className="hero-text text-4xl font-bold text-center">
        {/* Animated text */}
      </h1>

      <div className="hero-card-container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-6 justify-center mt-8">
        {cards.map((card, index) => (
          <Card 
            key={index} 
            title={card.title} 
            link={card.link}  
            
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;

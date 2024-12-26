'use client';

import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin'; // Import the TextPlugin
import { useTheme } from '../Context/ThemeContext';
import Card from './Card';

// Register the plugin
gsap.registerPlugin(TextPlugin);

const Hero = () => {
  const { theme } = useTheme(); // Get the current theme from the context

  // Define the cards array
  const cards = [
    { title: 'PDF Editor', link: '/pdf-editor' },
    { title: 'Image to PDF/Word', link: '/image-to-pdf' },
    { title: 'PDF to Word', link: '/pdf-to-word' },
    { title: 'PDF to Excel', link: '/pdf-to-excel' },
    { title: 'Word to PDF', link: '/word-to-pdf' },
    { title: 'Merge PDF', link: '/merge-pdf' },
    { title: 'Split PDF', link: '/split-pdf' },
    { title: 'Compress PDF', link: '/compress-pdf' },
  ];

  useEffect(() => {
    // Remove the original text from the .hero-text element
    const heroTextElement = document.querySelector('.hero-text');
    if (heroTextElement) {
      heroTextElement.innerHTML = ''; // Clear the text
    }

    // Hero text float animation (make the characters float)
    const characters = "Made by Students for Students".split('');

    // Make each character float randomly
    gsap.set('.hero-text', { opacity: 1 }); // Make sure the text is visible

    characters.forEach((char, index) => {
      const charElement = document.createElement('span');
      charElement.innerText = char;

      // Add the charElement to the .hero-text container
      heroTextElement?.appendChild(charElement);

      // Animate the character floating
      gsap.fromTo(
        charElement,
        {
          opacity: 0,
          y: Math.random() * 20 - 10, // Random starting position
          x: Math.random() * 20 - 10, // Random horizontal position
        },
        {
          opacity: 1,
          y: Math.random() * 30 - 15, // Random movement
          x: Math.random() * 30 - 15, // Random horizontal movement
          repeat: -1, // Make the animation repeat infinitely
          yoyo: true, // Make it go back and forth
          duration: 2 + Math.random() * 2, // Random duration for each character
          ease: 'power2.inOut',
          delay: index * 0.05, // Staggered delay for each character
        }
      );
    });

    // Hide the cards initially
    gsap.set('.hero-card-container .card', { opacity: 0, y: 50 });

    // Delay the card animation until after the text animation
    gsap.to('.hero-card-container .card', {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.2,
      delay: 5, // Start the card animations 5 seconds after the text animation starts
      ease: 'power3.out'
    });
  }, []);

  return (
    <section className="hero-section">
      <h1 className="hero-text text-4xl font-bold text-center">
        {/* The characters will be dynamically split and animated here */}
      </h1>

      <div className="hero-card-container grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-6 justify-center mt-8">
        {cards.map((card, index) => (
          <Card key={index} title={card.title} link={card.link} />
        ))}
      </div>
    </section>
  );
};

export default Hero;

// AboutUs.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Code, Heart,  Brain, Rocket, Coffee } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { 
    SiNextdotjs, 
    SiTensorflow,
    SiMongodb,
    SiTypescript,
    SiAmazon,
    SiDocker
  } from 'react-icons/si';

// Define types for section refs
interface SectionRefs {
    hero: React.RefObject<HTMLElement | null>;
    story: React.RefObject<HTMLElement | null>;
    passion: React.RefObject<HTMLElement | null>;
    skills: React.RefObject<HTMLElement | null>;
  }

// Define type for skill items
interface SkillItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const AboutUs: React.FC = () => {
  // Initialize refs with proper types
  const sectionRefs: SectionRefs = {
    hero: useRef<HTMLElement>(null),
    story: useRef<HTMLElement>(null),
    passion: useRef<HTMLElement>(null),
    skills: useRef<HTMLElement>(null)
  };

  useEffect(() => {
    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);
  
    // // Hero Animation
    // if (sectionRefs.hero.current) {
    //   gsap.from(sectionRefs.hero.current, {
    //     opacity: 0,
    //     y: 100,
    //     duration: 1,
    //     ease: "power4.out"
    //   });
    // }
  
    // // Story Section Animation
    // if (sectionRefs.story.current) {
    //   gsap.from(sectionRefs.story.current.children, {
    //     scrollTrigger: {
    //       trigger: sectionRefs.story.current,
    //       start: "top center",
    //       end: "bottom center",
    //     },
    //     y: 50,
    //     opacity: 0,
    //     duration: 0.8,
    //     stagger: 0.2,
    //     ease: "power3.out"
    //   });
    // }
  
    // // Passion Section Animation
    // if (sectionRefs.passion.current) {
    //   gsap.from(sectionRefs.passion.current.children, {
    //     scrollTrigger: {
    //       trigger: sectionRefs.passion.current,
    //       start: "top center",
    //     },
    //     scale: 0.8,
    //     opacity: 0,
    //     duration: 0.6,
    //     stagger: 0.15,
    //     ease: "back.out(1.7)"
    //   });
    // }
  
    // Skills Animation (already working fine)
    if (sectionRefs.skills.current) {
      const skillCards = sectionRefs.skills.current.querySelectorAll('.skill-card');
  
      gsap.fromTo(skillCards, 
        {
          opacity: 0,
          x: -50,  // Start slightly to the left
          scale: 0.9
        },
        {
          scrollTrigger: {
            trigger: sectionRefs.skills.current,
            start: "top center+=200",
            end: "bottom center",
            toggleActions: "play none none none"
          },
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 1,
          stagger: {
            amount: 0.6,  // Total amount of time between first and last
            from: "start"
          },
          ease: "power3.out"
        }
      );
    }
  
    // Ensure animations work when returning to the page (on page change)
    ScrollTrigger.refresh();
  
    // Cleanup ScrollTrigger on unmount
    return () => {
    //     const scrollTrigger = ScrollTrigger as typeof gsap.ScrollTrigger;
    //   ScrollTrigger.kill(); // Kill any existing ScrollTriggers when the component unmounts to prevent memory leaks
    };
  
  }, []); // Empty dependency array ensures this runs once on initial render

  // Define skills array with proper typing
  const skills: SkillItem[] = [
    { 
      icon: <SiNextdotjs className="w-8 h-8" />, 
      title: "Next.js & React", 
      desc: "Building modern web applications with Server Side Rendering and the latest React features" 
    },
    { 
      icon: <SiTensorflow className="w-8 h-8" />, 
      title: "AI/ML Integration", 
      desc: "Implementing machine learning models and AI features for intelligent document processing" 
    },
    { 
      icon: <SiMongodb className="w-8 h-8" />, 
      title: "MERN Stack", 
      desc: "Full-stack development with MongoDB, Express, React, and Node.js" 
    },
    { 
      icon: <SiTypescript className="w-8 h-8" />, 
      title: "TypeScript & Redux", 
      desc: "Building type-safe, scalable applications with state management" 
    },
    { 
      icon: <SiAmazon className="w-8 h-8" />, 
      title: "Cloud & DevOps", 
      desc: "Deploying and managing applications on AWS/Azure with CI/CD pipelines" 
    },
    { 
      icon: <SiDocker className="w-8 h-8" />, 
      title: "System Design", 
      desc: "Designing scalable architectures and optimizing application performance" 
    }
];

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section 
        ref={sectionRefs.hero as React.RefObject<HTMLElement>} 
        className="hero-section relative overflow-hidden"
        style={{ minHeight: '70vh' }}
      >
        <div className="absolute inset-0" style={{ 
          background: 'var(--hero-bg)',
          opacity: 0.9 
        }}/>
        <div className="relative z-10 max-w-4xl mx-auto pt-20 pb-16 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              We Transform Ideas Into Reality
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-8">
              Engineering students by day, code wizards by night.
            </p>
            <div className="flex justify-center gap-4">
              <Coffee className="w-8 h-8 animate-bounce" />
              <Code className="w-8 h-8 animate-pulse" />
              <Heart className="w-8 h-8 animate-bounce" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section 
        ref={sectionRefs.story as React.RefObject<HTMLElement>} 
        className="py-20 px-4"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Our Story</h2>
          <div className="space-y-8">
            <div className="backdrop-blur-sm bg-opacity-10 bg-white p-6 rounded-xl shadow-lg">
              <p className="text-lg leading-relaxed">
                <span className="font-semibold">Meet the two Tushars</span> - engineering students who share not just a name, but a burning passion for technology. In a delightful coincidence that feels like it was written in code, we (Tushar Thanvi and Tushar Dontulwar) found ourselves on the same wavelength, dreaming of creating tools that make a difference.
              </p>
            </div>
            <div className="backdrop-blur-sm bg-opacity-10 bg-white p-6 rounded-xl shadow-lg">
              <p className="text-lg leading-relaxed">
                What started as a college project evolved into <span className="font-semibold">Avni PDF</span> - our answer to the complex world of document management. We're not just building a tool; we're crafting an experience that makes document handling a breeze for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Passion Section */}
      <section 
        ref={sectionRefs.passion as React.RefObject<HTMLElement>}
        className="py-20 px-4"
        style={{ background: 'var(--card-bg)' }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-16 text-center">What Drives Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="backdrop-blur-md bg-opacity-20 bg-white p-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <Brain className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-4">Innovation</h3>
              <p>We thrive on turning complex problems into elegant solutions. Every line of code is an opportunity to innovate.</p>
            </div>
            <div className="backdrop-blur-md bg-opacity-20 bg-white p-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <Heart className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-4">Passion</h3>
              <p>With a perfect blend of engineering precision and creative flair, we're building tools that people actually enjoy using.</p>
            </div>
            <div className="backdrop-blur-md bg-opacity-20 bg-white p-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300">
              <Rocket className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-4">Growth</h3>
              <p>Every challenge is a learning opportunity. We're constantly evolving, improving, and pushing our limits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section 
  ref={sectionRefs.skills as React.RefObject<HTMLElement>} 
  className="py-20 px-4"
  style={{ background: 'var(--content-bg)' }}
>
  <div className="max-w-6xl mx-auto">
    <h2 className="text-4xl font-bold mb-16 text-center" style={{ color: 'var(--content-text)' }}>
      Our Tech Stack
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skills.map((skill, index) => (
        <div 
          key={index}
          className="skill-card p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
          style={{ 
            background: 'var(--card-bg)',
            color: 'var(--card-text)',
            boxShadow: 'var(--card-shadow)'
          }}
        >
          <div className="mb-4 text-[var(--footer-link)]">
            {skill.icon}
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--card-text)' }}>
            {skill.title}
          </h3>
          <p style={{ color: 'var(--footer-muted)' }}>
            {skill.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>

      {/* Call to Action */}
<section className="py-20 px-4 text-center" style={{ background: 'var(--hero-bg)' }}>
  <div className="max-w-3xl mx-auto">
    <h2 className="text-4xl font-bold mb-6 text-white">Let's Create Something Amazing</h2>
    <p className="text-xl text-gray-200 mb-8">
      Whether you're looking to collaborate or just want to chat about tech, we'd love to connect!
    </p>
    <a href="mailto:tushar.thanvi2005@gmail.com">
      <button className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold transform hover:scale-105 transition-all duration-300">
        Get In Touch
      </button>
    </a>
  </div>
</section>

    </main>
  );
};

export default AboutUs;
"use client";

import TextCard from "./TextCard";
import convertor from "@/app/api/upload";
import React, { useRef, useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { BsImageFill } from "react-icons/bs";
import { Sparkles } from 'lucide-react';
import gsap from "gsap";
import { TextPlugin } from 'gsap/TextPlugin';

// Register the plugin
gsap.registerPlugin(TextPlugin);

const ImageToText: React.FC = () => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [texts, setTexts] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const openBrowseImage = async () => {
    imageInputRef.current?.click();
  };

  const convert = async (url: string) => {
    if (url.length) {
      setProcessing(true);
      const txt = await convertor(url);
      setTexts((prevTexts) => [...prevTexts, txt]);
      setProcessing(false);
    }
  };

  useEffect(() => {
    const heroTextElement = document.querySelector('.hero-text');
    if (heroTextElement) {
      heroTextElement.innerHTML = '';
    }

    const characters = "Convert Images To Text with Ease".split('');

    gsap.set('.hero-text', { opacity: 1 });

    characters.forEach((char, index) => {
      const charElement = document.createElement('span');
      charElement.innerText = char === ' ' ? '\u00A0' : char;
      charElement.style.display = 'inline-block';
      charElement.style.opacity = '0';
      heroTextElement?.appendChild(charElement);

      gsap.to(charElement, {
        opacity: 1,
        delay: index * 0.05,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    });

    gsap.to('.hero-text', {
      opacity: 0.5,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut',
      duration: 1
    });
  }, []);

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
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="min-h-[90vh] flex flex-col items-center justify-center p-5 md:p-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
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

      <h1 className="hero-text text-4xl md:text-6xl font-bold mb-6 text-center" style={{ color: 'var(--footer-link)' }}></h1>

      <input
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          e.preventDefault();
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            convert(url);
          }
        }}
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        required
      />
      <motion.div
        className="flex flex-col md:flex-row gap-10 w-full items-start justify-center relative z-10"
        variants={itemVariants}
      >
        <motion.div
          onClick={openBrowseImage}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              convert(url);
            }
          }}
          className="w-full md:w-1/2 min-h-[30vh] md:min-h-[50vh] p-5 bg-[var(--card-bg)] cursor-pointer rounded-xl flex items-center justify-center border-2 border-dashed transition-all duration-300 group hover:border-solid"
          style={{ borderColor: 'var(--footer-link)' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-full flex items-center justify-center flex-col gap-3">
            <p className="text-2xl md:text-3xl text-center font-[800]" style={{ color: 'var(--footer-link)' }}>
              {processing ? "Processing Image..." : "Browse Or Drop Your Image Here"}
            </p>
            <span className="text-8xl md:text-[150px] block" style={{ color: 'var(--footer-muted)' }}>
              <BsImageFill className={processing ? "animate-pulse" : ""} />
            </span>
          </div>
        </motion.div>
        <motion.div className="w-full md:w-1/2 flex flex-col gap-4" variants={itemVariants}>
          {texts.length === 0 ? (
            <div className="w-full outline-none rounded-xl min-h-[25vh] md:min-h-[50vh] bg-[var(--card-bg)] p-5 tracking-wider font-[300] text-sm border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: 'var(--footer-link)' }}
            >
              <p className="text-2xl md:text-3xl text-center font-[800]" style={{ color: 'var(--footer-link)' }}>
                Your text will be extracted here
              </p>
            </div>
          ) : (
            texts.map((t, i) => <TextCard key={i} i={i} t={t} />)
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ImageToText;

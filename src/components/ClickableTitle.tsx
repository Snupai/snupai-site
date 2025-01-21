'use client';

import { useState, useEffect, useCallback } from 'react';

interface ClickableTitleProps {
  text: string;
  url: string;
}

const Sparkle = ({ className, style }: { 
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg 
    viewBox="0 0 160 160" 
    className={`w-2.5 h-2.5 ${className}`}
    style={style}
    fill="none"
    aria-hidden="true"
  >
    <path 
      d="M80 0C80 0 84.2846 41.2925 101.496 58.504C118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496C41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504C75.7154 41.2925 80 0 80 0Z" 
      fill="currentColor"
    />
  </svg>
);

interface SparkleInstance {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: string;
  delay: number;
  duration: number;
}

const colors = ['text-mocha-pink', 'text-mocha-mauve', 'text-mocha-sky', 'text-mocha-sapphire', 'text-mocha-lavender'];

export default function ClickableTitle({ text, url }: ClickableTitleProps) {
  const [isSparkling, setIsSparkling] = useState(false);
  const [sparkles, setSparkles] = useState<SparkleInstance[]>([]);
  const [wordWidth, setWordWidth] = useState(0);
  
  const sparkleCount = Math.min(30, Math.max(10, Math.floor(text.length * 2.5)));

  const createSparkle = useCallback((index: number, width: number) => {
    const progress = index / sparkleCount;
    const baseX = progress * width;
    
    const randomX = baseX + (Math.random() * 40 - 20);
    const verticalSpread = Math.random() * 80-20;
    const randomY = verticalSpread + 22;
    
    const scale = Math.random() * 0.4 + 0.8;
    const color = colors[Math.floor(Math.random() * colors.length)] ?? 'text-mocha-pink';
    const delay = index * 35;
    const duration = 600 + Math.random() * 300;

    return {
      id: Math.random(),
      x: randomX,
      y: randomY,
      scale,
      color,
      delay,
      duration
    };
  }, [sparkleCount]);

  useEffect(() => {
    if (!isSparkling) return;

    const newSparkles = Array.from(
      { length: sparkleCount }, 
      (_, i) => createSparkle(i, wordWidth)
    );
    setSparkles(newSparkles);

    const timeout = setTimeout(() => {
      setIsSparkling(false);
      setSparkles([]);
    }, 2000); // Shorter overall animation duration

    return () => clearTimeout(timeout);
  }, [isSparkling, createSparkle, sparkleCount, wordWidth]);

  useEffect(() => {
    const updateWidth = () => {
      const element = document.getElementById('sparkle-text');
      if (element) {
        setWordWidth(element.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [text]);

  const handleClick = async () => {
    if (isSparkling) return;
    
    try {
      await navigator.clipboard.writeText(url);
      setIsSparkling(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      await handleClick();
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        id="sparkle-text"
        onClick={handleClick}
        className="title-highlight cursor-pointer select-none inline-block"
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`Copy ${url} to clipboard`}
      >
        {text}
      </div>
      {isSparkling && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            width: `${wordWidth}px`,
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)'
          }}
        >
          {sparkles.map((sparkle) => (
            <Sparkle
              key={sparkle.id}
              className={`absolute ${sparkle.color} opacity-0`}
              style={{
                left: `${sparkle.x}px`,
                top: `${sparkle.y}px`,
                animation: `sparkle-twinkle ${sparkle.duration}ms ease-in-out forwards`,
                animationDelay: `${sparkle.delay}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
} 
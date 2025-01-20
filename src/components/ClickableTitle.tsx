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
  
  // Calculate number of sparkles based on text length (min 10, max 30)
  const sparkleCount = Math.min(30, Math.max(10, Math.floor(text.length * 2.5)));

  const createSparkle = useCallback((index: number, width: number) => {
    const progress = index / sparkleCount;
    const baseX = progress * width;
    
    const randomX = baseX + (Math.random() * 40 - 20);
    const verticalSpread = Math.random() * 60 - 30;
    const minDistance = 16;
    const randomY = (verticalSpread > 0 ? minDistance : -minDistance) + verticalSpread;
    
    const scale = Math.random() * 0.4 + 0.8;
    const color = colors[Math.floor(Math.random() * colors.length)] ?? 'text-mocha-pink';
    const delay = index * 20;
    const duration = 2000 + Math.random() * 1000;

    return {
      id: index,
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
    }, 4000);

    return () => clearTimeout(timeout);
  }, [isSparkling, createSparkle, sparkleCount, wordWidth]);

  // Measure word width on mount and resize
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
    try {
      await navigator.clipboard.writeText(url);
      setIsSparkling(true);
      setSparkles([]);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative inline-block">
      <span 
        id="sparkle-text"
        className="title-highlight cursor-pointer active:scale-95 transition-transform duration-100 relative"
        onClick={handleClick}
      >
        {text}
        <div 
          className="absolute inset-0 pointer-events-none flex items-center"
          style={{ 
            width: `${wordWidth}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            height: '100%'
          }}
        >
          {sparkles.map((sparkle) => (
            <Sparkle
              key={sparkle.id}
              className={`absolute animate-sparkle-twinkle ${sparkle.color}`}
              style={{
                left: `${sparkle.x}px`,
                top: `calc(50% + ${sparkle.y}px)`,
                transform: `translate(-50%, -50%) scale(${sparkle.scale})`,
                animationDelay: `${sparkle.delay}ms`,
                animationDuration: `${sparkle.duration}ms`
              }}
            />
          ))}
        </div>
      </span>
    </div>
  );
} 
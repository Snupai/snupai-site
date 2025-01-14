'use client';

import Link from "next/link";

type NavProps = {
  currentPage: 'home' | 'about' | 'projects' | 'contact';
};

export default function Navigation({ currentPage }: NavProps) {
  const getLinkClassName = (page: string) => {
    const isActive = currentPage === page;
    const baseClass = "px-3 sm:px-6 py-2 rounded-full text-lg font-medium transition-all duration-300";
    
    return `${baseClass} ${
      isActive 
        ? "text-mocha-flamingo bg-mocha-surface/80" 
        : "hover:bg-mocha-surface/50 highlight-text"
    }`;
  };

  return (
    <div className="relative">
      <nav className="fixed top-0 left-0 right-0 h-16 z-50">
        <div className="absolute inset-0 bg-mocha-mantle/95" />
        <div className="absolute inset-0 backdrop-blur-sm [mask-image:linear-gradient(to_top,transparent,rgba(0,0,0,0.2)_1%,rgba(0,0,0,0.3)_10%,rgba(0,0,0,0.5)_30%,rgba(0,0,0,0.8)_60%,black_85%,black)]" />
        <div className="container mx-auto px-2 sm:px-4 h-full relative">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 h-full">
            <Link href="/" className={getLinkClassName('home')}>Home</Link>
            <Link href="/about" className={getLinkClassName('about')}>About</Link>
            <Link href="/projects" className={getLinkClassName('projects')}>Projects</Link>
            <Link href="/contact" className={getLinkClassName('contact')}>Contact</Link>
          </div>
        </div>
      </nav>
      <div className="h-16" />
    </div>
  );
} 
'use client';

import Link from "next/link";

type NavProps = {
  currentPage: 'home' | 'about' | 'projects' | 'contact';
};

export default function Navigation({ currentPage }: NavProps) {
  const getLinkClassName = (page: string) => {
    const isActive = currentPage === page;
    const baseClass = "px-3 sm:px-6 py-2 rounded-full text-lg font-medium transition-all duration-300 shadow-lg";
    
    return `${baseClass} ${
      isActive 
        ? "text-mocha-base bg-mocha-flamingo shadow-mocha-flamingo/20" 
        : "text-mocha-text bg-mocha-base/40 hover:bg-mocha-pink hover:text-mocha-base shadow-mocha-base/20"
    }`;
  };

  return (
    <div className="relative">
      <nav className="fixed top-0 left-0 right-0 h-32 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-mocha-mantle/95 via-mocha-mantle/90 to-mocha-mantle/80" />
        <div className="absolute inset-0 backdrop-blur-[12px] mask-gradient" />
        
        <div className="container mx-auto px-2 sm:px-4 h-full relative">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 h-16">
            <div className="bg-mocha-mantle/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl shadow-mocha-base/10 border border-mocha-surface/20">
              <div className="flex space-x-3 sm:space-x-4">
                <Link href="/" className={getLinkClassName('home')}>Home</Link>
                <Link href="/about" className={getLinkClassName('about')}>About</Link>
                <Link href="/projects" className={getLinkClassName('projects')}>Projects</Link>
                <Link href="/contact" className={getLinkClassName('contact')}>Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="h-16" />
    </div>
  );
} 
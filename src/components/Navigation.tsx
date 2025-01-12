'use client';

import Link from "next/link";

type NavProps = {
  currentPage: 'home' | 'about' | 'projects' | 'contact';
};

export default function Navigation({ currentPage }: NavProps) {
  const getLinkClassName = (page: string) => {
    const isActive = currentPage === page;
    const baseClass = "px-6 py-2 rounded-full text-lg font-medium transition-all duration-300";
    
    return `${baseClass} ${
      isActive 
        ? "text-mocha-flamingo bg-mocha-surface/80" 
        : "hover:bg-mocha-surface/50 hover:text-mocha-rosewater"
    }`;
  };

  return (
    <div className="relative">
      <nav className="fixed top-0 left-0 right-0 h-16 bg-mocha-mantle/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-center space-x-2 h-full">
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
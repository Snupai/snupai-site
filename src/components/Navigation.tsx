'use client';

import Link from "next/link";
import { usePathname } from 'next/navigation';

type PageType = 'home' | 'about' | 'projects' | 'contact';

export default function Navigation() {
  const pathname = usePathname();
  
  const getCurrentPage = (): PageType => {
    switch (pathname) {
      case '/':
        return 'home';
      case '/about':
        return 'about';
      case '/projects':
        return 'projects';
      case '/contact':
        return 'contact';
      default:
        return 'home';
    }
  };

  const getLinkClassName = (page: string) => {
    const isActive = getCurrentPage() === page;
    const baseClass = "px-2 sm:px-6 py-2 rounded-full text-lg font-medium transition-all duration-300";
    
    return `${baseClass} ${
      isActive 
        ? "text-mocha-flamingo bg-mocha-surface/80" 
        : "hover:bg-mocha-surface/50 highlight-text"
    }`;
  };

  return (
    <div className="relative">
      <nav className="fixed top-0 left-0 right-0 h-24 z-50">
        <div className="absolute inset-0 bg-mocha-mantle/95" />
        <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,transparent,rgba(0,0,0,0.05)_1%,rgba(0,0,0,0.4)_10%,rgba(0,0,0,0.7)_30%,rgba(0,0,0,0.8)_60%,black_85%,black)]" />
        <div className="container mx-auto px-2 sm:px-4 h-full relative">
          <div className="flex items-center justify-center space-x-1 sm:space-x-4 h-16">
            <Link href="/" className={getLinkClassName('home')}>Home</Link>
            <Link href="/about" className={getLinkClassName('about')}>About</Link>
            <Link href="/projects" className={getLinkClassName('projects')}>Projects</Link>
            <Link href="/contact" className={getLinkClassName('contact')}>Contact</Link>
          </div>
        </div>
      </nav>
      <div className="h-8" />
    </div>
  );
} 
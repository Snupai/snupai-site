export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-12 z-50">
      <div className="absolute inset-0 bg-mocha-mantle/95" />
      <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,rgba(0,0,0,0.05)_1%,rgba(0,0,0,0.4)_10%,rgba(0,0,0,0.7)_30%,rgba(0,0,0,0.8)_60%,black_85%,black)]" />
      <div className="container mx-auto px-4 h-full relative">
        <div className="flex items-center justify-center h-full flex-col">
          <p className="text-sm">
            Made with{' '}
            <span className="text-mocha-red animate-pulse inline-block">❤</span>
            {' '}by Snupai
          </p>
          <a href="/imprint" className="underline hover:text-mocha-pink transition-colors mt-1 text-xs">Imprint</a>
        </div>
      </div>
    </footer>
  );
} 
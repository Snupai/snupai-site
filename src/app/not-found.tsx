import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="flex flex-col min-h-[80vh]">
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
          <span className="title-highlight">404</span>
          <span className="block mt-4">Page Not Found</span>
        </h1>
        
        <div className="text-center space-y-4">
          <p className="text-xl text-mocha-subtext0">
            Oopsie! Looks like this page got lost in the void~
          </p>
          <div className="relative w-64 h-64 mx-auto">
            <Image
              src="/not-found/sad.gif"
              alt="Sad anime gif"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-mocha-pink animate-bounce">
            ⊂(･ω･*⊂)
          </p>
        </div>

        <Link 
          href="/"
          className="mt-8 px-6 py-3 rounded-xl bg-mocha-surface hover:bg-mocha-surface-1 transition-colors text-lg"
        >
          Take me home →
        </Link>
      </div>
    </main>
  );
} 
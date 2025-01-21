import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="mb-8">Sorry, the page you are looking for does not exist.</p>
        <Link 
          href="/"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
} 
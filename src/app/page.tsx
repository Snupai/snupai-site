import Link from "next/link";
import Navigation from "~/components/Navigation";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-mocha">
      <Navigation currentPage="home" />
      <div className="container mx-auto flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Welcome to <span className="text-mocha-rosewater">snupai-site</span>
        </h1>
        <p className="text-center text-xl">
          This is my personal website. For fun :3
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-mocha-surface p-4 hover:bg-mocha-surface-1 transition-colors"
            href="/projects"
          >
            <h3 className="text-2xl font-bold">My Projects →</h3>
            <div className="text-lg">
              Explore my bad code.
            </div>
          </Link>
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-mocha-surface p-4 hover:bg-mocha-surface-1 transition-colors"
            href="/contact"
          >
            <h3 className="text-2xl font-bold">Contact Me →</h3>
            <div className="text-lg">
              Do you want to contact me? I am not sure why you would want to but here you go.
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}

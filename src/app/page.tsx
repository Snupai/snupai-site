import Link from "next/link";
import Navigation from "~/components/Navigation";
import ClickableTitle from "~/components/ClickableTitle";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Snupai's Website",
  description: "Welcome to my personal website. For fun :3",
  openGraph: {
    title: "Snupai's Website",
    description: "Welcome to my personal website. For fun :3",
    url: "https://snupai.me",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Snupai's Website",
    description: "Welcome to my personal website. For fun :3",
    creator: "@Snupai",
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-mocha">
      <Navigation currentPage="home" />
      <div className="container mx-auto flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl md:text-[5rem]">
          <span className="block">Welcome to</span>
          <ClickableTitle text="snupai.me" url="https://snupai.me" />
        </h1>
        <p className="max-w-3xl text-center text-lg space-y-6">
          Oh, you found my website.
          <br />
          I&apos;m not sure if there&apos;s anything worth looking at here. But feel free to look around.
          <br />
          <span className="opacity-0 hover:opacity-100 transition-opacity duration-300">You&apos;re amazing and deserve all the headpats!<br/>Have a wonderful day filled with joy and happiness! ❤️</span>
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

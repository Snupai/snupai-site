import Link from "next/link";
import Navigation from "~/components/Navigation";

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col bg-mocha">
      <Navigation currentPage="contact" />
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          Contact <span className="text-mocha-rosewater">Snupai</span>
        </h1>

        <div className="max-w-2xl w-full space-y-8">
          <div className="rounded-xl bg-mocha-surface p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-mocha-rosewater">Get in Touch</h2>
              <p className="text-lg">
                Do you want to contact me? I am not sure why you would want to but here you go.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg bg-mocha-mantle p-4">
                <h3 className="font-bold">Email</h3>
                <a 
                  href="mailto:nya@snupai.me" 
                  className="text-mocha-rosewater hover:text-mocha-pink"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  nya@snupai.me
                </a>
              </div>

              <div className="rounded-lg bg-mocha-mantle p-4">
                <h3 className="font-bold">Location</h3>
                <p className="text-mocha-rosewater">Heaven</p>
              </div>

              <div className="rounded-lg bg-mocha-mantle p-4">
                <h3 className="font-bold">Social Media</h3>
                <div className="flex gap-4 mt-2">
                  <div>
                    Discord: <a 
                      href="https://discord.com/users/239809113125552129/"
                      className="text-mocha-rosewater hover:text-mocha-pink"
                      target="_blank"
                      rel="noopener noreferrer"
                    >@snupai</a>
                  </div>
                  <div>
                    GitHub: <a
                      href="https://github.com/Snupai"
                      className="text-mocha-rosewater hover:text-mocha-pink" 
                      target="_blank"
                      rel="noopener noreferrer"
                    >Snupai</a>
                  </div>
                  <div>
                    Bluesky: <a
                      href="https://bsky.app/profile/snupai.moe"
                      className="text-mocha-rosewater hover:text-mocha-pink"
                      target="_blank"
                      rel="noopener noreferrer"
                    >@snupai.moe</a>
                  </div>
                  <div>
                    X: <a
                      href="https://x.com/Snupai"
                      className="text-mocha-rosewater hover:text-mocha-pink"
                      target="_blank"
                      rel="noopener noreferrer"
                    >@Snupai</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 
import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Denied",
  description: "You do not have permission to access this page.",
};

const errorMessages: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Access Denied",
    description:
      "Your GitHub account is not authorized to access the admin panel. Only allowlisted accounts can sign in.",
  },
  Configuration: {
    title: "Configuration Error",
    description:
      "There is a problem with the server configuration. Please contact the site administrator.",
  },
  Verification: {
    title: "Verification Failed",
    description:
      "The sign-in link is no longer valid. It may have already been used or expired.",
  },
};

const defaultError = {
  title: "Something went wrong",
  description:
    "An unexpected error occurred during authentication. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorInfo = errorMessages[params.error ?? ""] ?? defaultError;

  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
          <span className="title-highlight">Auth</span> Error
        </h1>

        <div className="w-full max-w-md space-y-6">
          <div className="bg-mocha-surface space-y-6 rounded-xl p-8 text-center">
            <div className="space-y-3">
              <div className="bg-[var(--red)]/10 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[var(--red)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--red)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <h2 className="text-mocha-red text-2xl font-bold">
                {errorInfo.title}
              </h2>
              <p className="text-mocha-subtext0 text-sm leading-relaxed">
                {errorInfo.description}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/auth/signin"
                className="bg-mocha-surface-1 text-mocha-text hover:bg-mocha-surface-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200"
              >
                Try again
              </Link>
              <Link href="/" className="highlight-text text-sm font-medium">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

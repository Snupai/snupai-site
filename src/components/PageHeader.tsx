import { type ReactNode } from "react";

interface PageHeaderProps {
  /** Small mono label shown above the title, e.g. "about". */
  kicker: string;
  /** The page title. Wrap emphasis words in <span className="title-highlight">. */
  children: ReactNode;
  /** Optional one-line subtitle under the title. */
  subtitle?: string;
}

/**
 * Consistent page header used across inner pages. Mirrors the home page's
 * mono kicker + large title pattern so every route feels part of one site.
 */
export default function PageHeader({ kicker, children, subtitle }: PageHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.35em] text-mocha-overlay-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mocha-lavender opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mocha-lavender" />
        </span>
        {kicker}
      </div>
      <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
        {children}
      </h1>
      {subtitle && (
        <p className="max-w-md text-balance text-base leading-relaxed text-mocha-subtext">
          {subtitle}
        </p>
      )}
    </header>
  );
}

'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';

type Repo = {
  id: number;
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  last_commit: string;
  html_url: string;
  homepage?: string;
  archived?: boolean;
  owner: {
    login: string;
    html_url: string;
  };
};

export default function ProjectList({ initialRepos }: { initialRepos: Repo[] }) {
  const [sortBy, setSortBy] = useState('lastCommit');
  const [mounted, setMounted] = useState(false);
  const [roasts, setRoasts] = useState<Record<number, string>>({});
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());
  const prevRectsRef = useRef<Map<number, DOMRect> | null>(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate reordering using FLIP technique
  useLayoutEffect(() => {
    if (reduceMotion) return;
    const currentRects = new Map<number, DOMRect>();
    itemRefs.current.forEach((el, id) => {
      currentRects.set(id, el.getBoundingClientRect());
    });
    const prevRects = prevRectsRef.current;
    if (prevRects) {
      currentRects.forEach((newRect, id) => {
        const prevRect = prevRects.get(id);
        if (!prevRect) return;
        const dx = prevRect.left - newRect.left;
        const dy = prevRect.top - newRect.top;
        if (dx !== 0 || dy !== 0) {
          const el = itemRefs.current.get(id);
          if (!el) return;
          el.style.transition = 'transform 0s';
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => {
            el.style.transition = 'transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)';
            el.style.transform = '';
          });
        }
      });
    }
    prevRectsRef.current = currentRects;
  });

  const sortedRepos = [...initialRepos].sort((a, b) => {
    if (sortBy === 'stars') {
      return b.stargazers_count - a.stargazers_count;
    }
    return new Date(b.last_commit).getTime() - new Date(a.last_commit).getTime();
  });

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return mounted 
      ? date.toISOString().split('T')[0]
      : date.toISOString().split('T')[0];
  }

  async function fetchRoast(repo: Repo): Promise<string> {
    const existing = roasts[repo.id];
    if (typeof existing === 'string' && existing.length > 0) return existing;
    try {
      const params = new URLSearchParams({ name: repo.name });
      const res = await fetch(`/api/ai-roast?${params.toString()}`);
      const data = (await res.json()) as { roast?: string };
      const text = (data.roast ?? '').trim();
      if (text) {
        setRoasts(prev => ({ ...prev, [repo.id]: text }));
        return text;
      }
    } catch {
      /* noop */
    }
    return '';
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl">
      <div className="flex justify-end gap-4">
        <div className="relative">
          <select 
            className="bg-mocha-surface px-4 py-2 pr-10 rounded-lg text-mocha-text appearance-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="lastCommit">Sort by Last Commit</option>
            <option value="stars">Sort by Stars</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-mocha-subtext0">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedRepos.map(repo => (
          <div
            key={repo.id}
            ref={(el) => {
              if (el) itemRefs.current.set(repo.id, el);
              else itemRefs.current.delete(repo.id);
            }}
            className="rounded-xl bg-mocha-surface p-6 space-y-4 min-w-[320px] will-change-transform"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 min-w-0">
                <h3 className="text-2xl font-bold text-mocha-flamingo truncate">{repo.name}</h3>
                <p className="text-sm text-mocha-subtext0 truncate">
                  by{' '}
                  <a 
                    href={repo.owner.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="highlight-text"
                  >
                    @{repo.owner.login}
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-mocha-yellow">★</span>
                <span className="text-sm">{repo.stargazers_count}</span>
              </div>
            </div>
            
            <p className="text-mocha-text">{repo.description}</p>
            
            <div className="flex flex-wrap gap-3">
              {repo.archived && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[var(--maroon)] text-[var(--crust)]">
                  Archived
                </span>
              )}
              {repo.language && (
                <span className="px-3 py-1 rounded-full bg-mocha-surface-1 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 inline-block rounded-full bg-[#3572A5] mr-2"></span>
                  {repo.language}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-mocha-surface-1 text-sm text-mocha-subtext0">
                Last commit: {formatDate(repo.last_commit)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-4">
              <a 
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer" 
                className="text-mocha-blue hover:underline"
              >
                View on GitHub →
              </a>
              {repo.homepage && /^https?:\/\//i.test(repo.homepage) && (
                <a 
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-mocha-green hover:underline"
                >
                  Visit website →
                </a>
              )}
            </div>
            <div className="mt-2">
              <button
                className="text-xs px-2 py-1 bg-mocha-surface-1 rounded-full border border-mocha text-mocha-subtext0 hover:text-mocha-lavender"
                onMouseEnter={() => { void fetchRoast(repo); }}
                onFocus={() => { void fetchRoast(repo); }}
                title={roasts[repo.id] ?? 'AI Roast'}
              >
                🤖 AI Roast
              </button>
              {roasts[repo.id] && (
                <div className="mt-2 text-sm text-mocha-subtext0 bg-mocha-surface-1 border border-mocha rounded-lg p-2">
                  {roasts[repo.id]}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
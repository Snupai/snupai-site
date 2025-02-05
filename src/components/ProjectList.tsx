'use client';

import { useState, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Repo = {
  id: number;
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  last_commit: string;
  html_url: string;
  owner: {
    login: string;
    html_url: string;
  };
};

export default function ProjectList({ initialRepos }: { initialRepos: Repo[] }) {
  const [sortBy, setSortBy] = useState('lastCommit');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [listRef] = useAutoAnimate();

  const sortedRepos = [...initialRepos].sort((a, b) => {
    if (sortBy === 'stars') {
      return b.stargazers_count - a.stargazers_count;
    }
    return new Date(b.last_commit).getTime() - new Date(a.last_commit).getTime();
  });

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return mounted 
      ? date.toLocaleDateString() 
      : date.toISOString().split('T')[0];
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-5xl">
      <div className="flex justify-end gap-4">
        <div className="flex items-center gap-2">
          <label id="sort-label" className="text-mocha-subtext0">Sort by</label>
          <div className="w-[150px]">
            <Select 
              value={sortBy} 
              onValueChange={setSortBy}
              aria-labelledby="sort-label"
            >
              <SelectTrigger 
                className="bg-mocha-surface text-mocha-text"
                aria-label={`Currently sorted by ${sortBy === 'lastCommit' ? 'last commit' : 'stars'}`}
              >
                <SelectValue>
                  {sortBy === 'lastCommit' ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      Last Commit
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                        />
                      </svg>
                      Stars
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="lastCommit">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      Last Commit
                    </div>
                  </SelectItem>
                  <SelectItem value="stars">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                        />
                      </svg>
                      Stars
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedRepos.map(repo => (
          <div key={repo.id} className="rounded-xl bg-mocha-surface p-6 space-y-4 min-w-[320px]">
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
              {repo.language && (
                <span className="px-3 py-1 rounded-full bg-mocha-surface-1 text-sm">
                  <span className="w-2 h-2 inline-block rounded-full bg-[#3572A5] mr-2"></span>
                  {repo.language}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-mocha-surface-1 text-sm text-mocha-text">
                Last commit: {formatDate(repo.last_commit)}
              </span>
            </div>

            <a 
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer" 
              className="inline-block mt-2 text-mocha-blue hover:underline"
            >
              View on GitHub →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
} 
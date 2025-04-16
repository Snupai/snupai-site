'use client';

import { useState, useEffect } from 'react';

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
              <span className="px-3 py-1 rounded-full bg-mocha-surface-1 text-sm text-mocha-subtext0">
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
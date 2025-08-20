"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GuideViewer({
  deGreeting,
  enGreeting,
  deHtml,
  enHtml,
  initialLang,
}: {
  deGreeting: string;
  enGreeting: string;
  deHtml: string;
  enHtml: string;
  initialLang: 'de' | 'en';
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<'de' | 'en'>(initialLang);

  // Ensure local state reflects prop if it changes (should be stable per render)
  useEffect(() => {
    setLang(initialLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLang]);

  const updateUrl = useCallback(
    (newLang: 'de' | 'en') => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('lang', newLang);
      const qs = params.toString();
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      router.replace(`?${qs}${hash}`);
    },
    [router, searchParams]
  );

  const handleSetLang = (newLang: 'de' | 'en') => {
    setLang(newLang);
    updateUrl(newLang);
  };
  const heading = lang === 'de' ? deGreeting : enGreeting;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{heading}</h1>
        <div className="inline-flex rounded border border-gray-300 p-0.5">
          <button
            type="button"
            onClick={() => handleSetLang('de')}
            className={`px-3 py-1 text-sm ${
              lang === 'de' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            } rounded`}
            aria-pressed={lang === 'de'}
          >
            DE
          </button>
          <button
            type="button"
            onClick={() => handleSetLang('en')}
            className={`px-3 py-1 text-sm ${
              lang === 'en' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
            } rounded`}
            aria-pressed={lang === 'en'}
          >
            EN
          </button>
        </div>
      </div>

      <article
        className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-h1:text-3xl prose-h2:text-2xl
        prose-headings:text-[var(--text)] prose-p:text-[var(--text)] prose-li:text-[var(--text)]
        prose-ul:marker:text-[var(--subtext1)] prose-ol:marker:text-[var(--subtext1)]
        prose-strong:text-[var(--text)] prose-code:text-[var(--text)] prose-code:bg-[var(--surface0)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        prose-a:text-mocha-blue hover:prose-a:text-mocha-sky
        prose-hr:border-mocha prose-blockquote:text-[var(--subtext1)] prose-blockquote:border-mocha"
        dangerouslySetInnerHTML={{ __html: lang === 'de' ? deHtml : enHtml }}
      />
    </div>
  );
}


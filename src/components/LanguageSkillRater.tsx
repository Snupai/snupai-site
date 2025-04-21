import React, { useEffect, useState, useRef } from 'react';

interface LanguageSkillRaterProps {
  language: string;
}

const skillCombinedPrompt = (lang: string) => `Respond ONLY in JSON: {"summary": "...", "detail": "..."}.\n- summary: exactly two witty words rating an AI's skill in ${lang} (e.g., "Solid Pro").\n- detail: max two short, self-deprecating, funny sentences about AI's skill in ${lang}, not repeating summary.\nExample: {"summary": "Send Help", "detail": "I write code like a caffeinated squirrel. But hey, at least I don't segfault (often)."}`;

const cache: Record<string, { summary: string; detail: string }> = {};
const pendingRequests: Record<string, Promise<{ summary: string; detail: string }>> = {};

function getLocalStorageRating(language: string): { summary: string; detail: string } | null {
  try {
    const raw = localStorage.getItem(`aiSkillRating:${language}`);
    if (!raw) return null;
    return JSON.parse(raw) as { summary: string; detail: string };
  } catch {
    return null;
  }
}

function setLocalStorageRating(language: string, data: { summary: string; detail: string }): void {
  try {
    localStorage.setItem(`aiSkillRating:${language}` , JSON.stringify(data));
  } catch {}
}

async function fetchRating(language: string): Promise<{ summary: string; detail: string }> {
  if (pendingRequests[language]) return pendingRequests[language];
  const p = (async () => {
    const res = await fetch('/api/ai-skill-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: language, prompt: skillCombinedPrompt(language), maxTokens: 56 }),
    });
    const result = (await res.json()) as { text?: string };
    let summaryText = 'AI unsure';
    let detailText = 'AI unsure.';
    if (result.text) {
      try {
        const match = /\{[\s\S]*\}/.exec(result.text);
        if (match) {
          const parsed = JSON.parse(match[0]) as { summary?: string; detail?: string };
          if (parsed.summary && parsed.summary.trim().length > 0) {
            summaryText = parsed.summary.trim();
            detailText = parsed.detail?.trim() ?? detailText;
          } else {
            throw new Error('No summary');
          }
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        const lines = result.text?.trim().split(/\n|\r/).filter(Boolean) ?? [];
        const firstLine = lines[0];
        if (lines.length >= 2 && typeof firstLine === 'string' && firstLine.trim().length > 0) {
          summaryText = firstLine.trim();
          detailText = lines.slice(1).join(' ').trim();
        }
      }
    }
    cache[language] = { summary: summaryText, detail: detailText };
    setLocalStorageRating(language, { summary: summaryText, detail: detailText });
    return { summary: summaryText, detail: detailText };
  })();
  pendingRequests[language] = p;
  try {
    return await p;
  } finally {
    delete pendingRequests[language];
  }
}

export const LanguageSkillRater: React.FC<LanguageSkillRaterProps> = ({ language }) => {
  const [summary, setSummary] = useState<string>('...');
  const [detail, setDetail] = useState<string>('Loading...');
  const [hovered, setHovered] = useState(false);
  const tagRef = useRef<HTMLSpanElement>(null);
  const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let isMounted = true;
    const cached = getLocalStorageRating(language);
    if (cached?.summary && cached?.detail) {
      setSummary(cached.summary);
      setDetail(cached.detail);
      cache[language] = cached;
      return;
    }
    fetchRating(language)
      .then(({ summary, detail }) => {
        if (isMounted) {
          setSummary(summary);
          setDetail(detail);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setSummary('AI unsure');
          setDetail('AI Confidence: ???/10 (error fetching)');
        }
        console.error('LanguageSkillRater error:', err);
      });
    return () => { isMounted = false; };
  }, [language]);

  useEffect(() => {
    if (tagRef.current && tooltipRef.current) {
      const rect = tagRef.current.getBoundingClientRect();
      setBoxStyle({
        position: 'fixed',
        left: rect ? rect.left + rect.width / 2 : 0,
        top: rect ? rect.bottom + 8 : 0,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: 200,
        maxWidth: 320,
        background: 'rgba(30,30,40,0.97)',
        color: 'var(--mocha-text, #fff)',
        borderRadius: 12,
        boxShadow: '0 6px 32px 8px rgba(0,0,0,0.25)',
        padding: '0.75rem 1rem',
        border: '1px solid var(--mocha-surface-1, #444)',
        pointerEvents: 'none',
        whiteSpace: 'pre-line',
        fontSize: '0.875rem',
        fontWeight: 500,
        backdropFilter: 'blur(8px)',
        visibility: hovered ? 'visible' : 'hidden',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.15s',
      });
    }
  }, [hovered, detail]);

  return (
    <span
      className="relative group cursor-pointer px-2 py-1 rounded bg-mocha-surface-2 text-mocha-blue text-xs font-semibold ml-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      tabIndex={0}
      aria-label={`AI Skill for ${language}`}
      ref={tagRef}
    >
      {cache[language]?.summary ?? summary}
      <span ref={tooltipRef} style={boxStyle}>
        {cache[language]?.detail ?? detail}
      </span>
    </span>
  );
};

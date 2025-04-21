import React, { useEffect, useState, useRef } from 'react';

interface Skill {
  name: string;
  prompt?: string;
}

interface AiSkillRaterProps {
  skills: Skill[];
}

const defaultPrompts: Record<string, string> = {
  Python: 'Give a direct, short, self-deprecating and funny confidence rating for your skill in Python. Respond with at most 2 short sentences. Do not use introductions or filler, just the rating itself.',
  Automation: 'Give a direct, short, self-deprecating and funny confidence rating for your skill in Automation. Respond with at most 2 short sentences. Do not use introductions or filler, just the rating itself.',
  CSS: 'Give a direct, short, self-deprecating and funny confidence rating for your skill in CSS. Respond with at most 2 short sentences. Do not use introductions or filler, just the rating itself.',
};

const summaryPrompt = (name: string): string => `In 2 words, rate your skill in ${name} as an AI. Be witty, self-deprecating, or funny. Example: "Solid Pro", "Send Help".`;

const cache: Record<string, { summary: string; detail: string }> = {};

function getLocalStorageRating(skill: string): { summary: string; detail: string } | null {
  try {
    const raw = localStorage.getItem(`aiSkillRating:${skill}`);
    if (!raw) return null;
    return JSON.parse(raw) as { summary: string; detail: string };
  } catch {
    return null;
  }
}

function setLocalStorageRating(skill: string, data: { summary: string; detail: string }): void {
  try {
    localStorage.setItem(`aiSkillRating:${skill}`, JSON.stringify(data));
  } catch {}
}

async function fetchConfidence(skill: Skill): Promise<{ summary: string; detail: string }> {
  const cachedValue = cache[skill.name];
  if (cachedValue !== undefined) {
    return cachedValue;
  }
  const cached = getLocalStorageRating(skill.name);
  if (cached) {
    cache[skill.name] = cached;
    return cached;
  }
  const detailPrompt = skill.prompt ?? defaultPrompts[skill.name] ?? `Give a direct, short, self-deprecating and funny confidence rating for your skill in ${skill.name}. Respond with at most 2 short sentences. Do not use introductions or filler, just the rating itself.`;
  try {
    const summaryRes = await fetch('/api/ai-skill-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: skill.name, prompt: summaryPrompt(skill.name), maxTokens: 8 }),
    }).then(res => res.json()) as { text?: string };
    const detailRes = await fetch('/api/ai-skill-rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: skill.name, prompt: detailPrompt, maxTokens: 40 }),
    }).then(res => res.json()) as { text?: string };
    const summary = summaryRes.text?.trim() ?? 'AI unsure';
    const detail = detailRes.text?.trim() ?? 'AI unsure.';
    const rating = { summary, detail };
    cache[skill.name] = rating;
    setLocalStorageRating(skill.name, rating);
    return rating;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('AI Skill Rater error:', err);
    return { summary: 'AI unsure', detail: 'AI Confidence: ???/10 (error fetching)' };
  }
}

export const AiSkillRater: React.FC<AiSkillRaterProps> = ({ skills }) => {
  const [ratings, setRatings] = useState<Record<string, { summary: string; detail: string }>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const tagRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (hovered && tagRefs.current[hovered] && tooltipRef.current) {
      const rect = tagRefs.current[hovered]?.getBoundingClientRect();
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
  }, [hovered, ratings, tagRefs, tooltipRef]);

  useEffect(() => {
    skills.forEach((skill) => {
      void fetchConfidence(skill).then((rating) => {
        if (rating) {
          setRatings((prev) => ({ ...prev, [skill.name]: rating }));
        }
      });
    });
  }, [skills]);

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const rating = ratings[skill.name] ?? { summary: '...', detail: 'Loading...' };
        return (
          <span key={skill.name} className="relative group">
            <span
              ref={(el) => { tagRefs.current[skill.name] = el; return void 0; }}
              className="inline-block px-3 py-1 rounded-full bg-mocha-surface-3 text-xs font-semibold cursor-pointer text-mocha-pink border border-mocha-surface-2 shadow"
              onMouseEnter={() => setHovered(skill.name)}
              onMouseLeave={() => setHovered(null)}
              tabIndex={0}
              aria-label={`AI Skill for ${skill.name}`}
              style={{ zIndex: 10, position: 'relative' }}
            >
              🤖 AI Skill: {rating.summary}
            </span>
            <span
              ref={hovered === skill.name ? tooltipRef : undefined}
              style={hovered === skill.name ? boxStyle : { visibility: 'hidden', opacity: 0, pointerEvents: 'none', position: 'fixed' }}
            >
              {rating.detail}
            </span>
          </span>
        );
      })}
    </div>
  );
};

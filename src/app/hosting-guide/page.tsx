import GuideViewer from './GuideViewer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

async function fetchMarkdown(publicPath: string) {
  try {
    const base = await getBaseUrl();
    const url = new URL(publicPath, base);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function mdToHtml(md: string) {
  try {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .process(md);
    return String(file);
  } catch {
    return '';
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawNameParam = params?.name;
  const name =
    typeof rawNameParam === 'string'
      ? rawNameParam.trim()
      : Array.isArray(rawNameParam)
      ? (rawNameParam[0] ?? '').trim()
      : '';

  // Optional language selection via ?lang=en or ?lang=de (default: 'de')
  const rawLangParam = params?.lang;
  const langParam =
    typeof rawLangParam === 'string'
      ? rawLangParam.trim().toLowerCase()
      : Array.isArray(rawLangParam)
      ? (rawLangParam[0] ?? '').trim().toLowerCase()
      : '';
  const initialLang: 'de' | 'en' = langParam === 'en' ? 'en' : 'de';

  // Read from .md files only (German: prefer .de.md, fallback to default .md)
  const [deFromFile, enFromFile] = await Promise.all([
    fetchMarkdown('/hosting-guide/nextjs-hostin-guide.de.md'),
    fetchMarkdown('/hosting-guide/nextjs-hostin-guide.en.md'),
  ]);

  const deRaw = (deFromFile ?? '').trim();
  const enRaw = (enFromFile ?? '').trim();

  const [deHtmlRaw, enHtmlRaw] = await Promise.all([
    mdToHtml(deRaw),
    mdToHtml(enRaw),
  ]);

  // SEO: ensure single H1 (the greeting). Demote any H1 from content to H2.
  const demoteH1 = (html: string) =>
    (html || '')
      .replace(/<h1(\s+[^>]*)?>/gi, '<h2$1>')
      .replace(/<\/h1>/gi, '</h2>');

  const deHtml = demoteH1(deHtmlRaw || '');
  const enHtml = demoteH1(enHtmlRaw || '');

  const deGreeting = name ? `Hallo ${name}!` : 'Hallo!';
  const enGreeting = name ? `Hello ${name}!` : 'Hello!';

  // Debug in dev
  if (process.env.NODE_ENV !== 'production') {
    console.log('[hosting-guide] de: md', deRaw.length, 'html', deHtml.length);
    console.log('[hosting-guide] en: md', enRaw.length, 'html', enHtml.length);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <GuideViewer
        deGreeting={deGreeting}
        enGreeting={enGreeting}
        deHtml={deHtml}
        enHtml={enHtml}
        initialLang={initialLang}
      />
    </div>
  );
}


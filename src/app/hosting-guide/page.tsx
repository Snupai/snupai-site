import GuideViewer from './GuideViewer';
import fs from 'fs';
import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

async function readMarkdown(fileName: string) {
  try {
    const fullPath = path.join(process.cwd(), fileName);
    const content = await fs.promises.readFile(fullPath, 'utf8');
    return content;
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

export default async function Page({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name: nameParam = '' } = await searchParams;
  const name = nameParam.trim();

  // Read from .md files only (German: prefer .de.md, fallback to default .md)
  const [deFromFile, enFromFile] = await Promise.all([
    readMarkdown('nextjs-hostin-guide.de.md'),
    readMarkdown('nextjs-hostin-guide.en.md'),
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
      <GuideViewer deGreeting={deGreeting} enGreeting={enGreeting} deHtml={deHtml} enHtml={enHtml} />
    </div>
  );
}


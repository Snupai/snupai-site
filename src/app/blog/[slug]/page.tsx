import { getBlogPost, getBlogPosts } from "@/lib/blog";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://snupai.me/blog/${post.slug}`,
      siteName: "Snupai's Website",
      locale: "en_US",
      type: "article",
      images: [
        {
          url: `/api/og?path=/blog/${post.slug}`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      creator: "@Snupai",
      images: [`/api/og?path=/blog/${post.slug}`],
    },
  };
}

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export const revalidate = 3600;
export const runtime = "nodejs";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {post.coverImage && (
          <div className="relative w-full h-64 mb-8">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover rounded-lg"
            />
          </div>
        )}
        <article className="prose prose-invert prose-headings:text-mocha-text prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-pre:bg-mocha-mantle prose-pre:text-mocha-text max-w-none">
          <h1>{post.title}</h1>
          <p className="text-lg">{post.description}</p>
          <p className="text-sm text-gray-400">
            <a
              href={`https://github.com/${post.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              {post.repo}
            </a>
          </p>
          {post.content ? (
            <div
              className="mt-8 markdown-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <div className="mt-8">
              <a
                href={`https://github.com/${post.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                View on GitHub →
              </a>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

import { type Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Snupai's Blog",
  description: "Read my thoughts and experiences on various topics.",
  openGraph: {
    title: "Snupai's Blog", 
    description: "Read my thoughts and experiences on various topics.",
    url: "https://snupai.me/blog",
    siteName: "Snupai's Website",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: '/api/og?path=/blog',
        width: 1200,
        height: 630,
        alt: 'Snupai Blog',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Snupai's Blog",
    description: "Read my thoughts and experiences on various topics.",
    creator: "@Snupai",
    images: ['/api/og?path=/blog'],
  },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-12">Blog Posts</h1>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <li 
              key={post.slug}
              className="bg-gray-800/50 border border-gray-700 rounded-lg 
                shadow-lg shadow-gray-900/50 hover:shadow-gray-900/75 
                hover:bg-gray-800/75 hover:-translate-y-0.5 
                transition-all duration-200"
            >
              <Link 
                href={`/blog/${post.slug}`}
                className="block px-4 py-3 text-center h-full"
              >
                <h2 className="text-lg font-semibold text-gray-100">{post.title}</h2>
                <p className="text-gray-400 text-xs mt-1">{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export const revalidate = 0; // revalidate on every request

import fs from 'fs/promises';
import path from 'path';

export type BlogPost = {
  title: string;
  description: string;
  repo: string;
  slug: string;
  content?: string;
  coverImage?: string;
  date?: string;
};

export type Project = {
  title: string;
  description: string;
  repo: string;
};

export type Recommendation = {
  title: string;
  description: string;
  link: string;
  image?: string;
};

export async function getBlogPosts(): Promise<BlogPost[]> {
  const blogsPath = path.join(process.cwd(), 'content', 'blogs.json');
  const blogsJson = await fs.readFile(blogsPath, 'utf-8');
  return JSON.parse(blogsJson) as BlogPost[];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find(post => post.slug === slug) ?? null;
}

export async function getRepoLists(): Promise<{
  projects: Project[];
  shoutoutRepos: Project[];
}> {
  const projectsPath = path.join(process.cwd(), 'content', 'projects.json');
  const shoutoutPath = path.join(process.cwd(), 'content', 'shoutouts.json');
  
  const [projectsJson, shoutoutJson] = await Promise.all([
    fs.readFile(projectsPath, 'utf-8'),
    fs.readFile(shoutoutPath, 'utf-8')
  ]);

  return {
    projects: JSON.parse(projectsJson) as Project[],
    shoutoutRepos: JSON.parse(shoutoutJson) as Project[]
  };
} 
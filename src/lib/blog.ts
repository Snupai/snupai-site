import { Octokit } from '@octokit/rest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import remarkGfm from 'remark-gfm';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { env } from "@/env";
import { getBlogPost as getPost } from "@/lib/content";
import type { BlogPost } from "@/lib/content";

// Initialize Octokit with auth token
const octokit = new Octokit({
  auth: env.GITHUB_TOKEN,
  userAgent: 'snupai-blog-v1.0',
});

// Add type for Octokit error
type OctokitError = Error & {
  status?: number;
};

async function processGitHubImages(content: string, owner: string, repo: string, branch = 'main'): Promise<string> {
  console.log('Processing GitHub images for:', { owner, repo, branch });
  
  // Handle both markdown and HTML image patterns
  const imageRegex = /(?:!\[([^\]]*)\]\((?:\.\/|\/)?([^:\)]+)\)|<img[^>]*src=["'](?:\.\/|\/)?([^"']+)["'][^>]*>)/g;
  let processedContent = content;

  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const alt = match[1] ?? '';
    const mdPath = match[2];
    const htmlPath = match[3];
    const imagePath = mdPath ?? htmlPath;
    
    if (!imagePath) continue;

    // Clean up the path and remove leading ./ or /
    const cleanPath = decodeURIComponent(imagePath.replace(/^\.?\//, ''));
    
    // Convert to raw GitHub URL
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;

    if (fullMatch.includes('<img')) {
      // Handle HTML img tags
      const updatedHtml = fullMatch.replace(
        /src=["'](?:\.\/|\/)?[^"']+["']/,
        `src="${rawUrl}"`
      );
      processedContent = processedContent.replace(fullMatch, updatedHtml);
    } else {
      // Handle markdown images
      const newImageTag = `![${alt}](${rawUrl})`;
      processedContent = processedContent.replace(fullMatch, newImageTag);
    }
  }

  return processedContent;
}

// Add type for matter data
type MatterData = {
  coverImage?: string;
  date?: string;
};

async function findCoverImage(owner: string, repo: string, defaultBranch: string): Promise<string | undefined> {
  const possiblePaths = ['', 'assets', 'assets/images', 'images'];
  
  for (const basePath of possiblePaths) {
    try {
      const { data: dirContent } = await octokit.repos.getContent({
        owner,
        repo,
        path: basePath,
      }).catch((error: OctokitError) => {
        // Silently handle 404 errors by returning empty data
        if (error.status === 404) {
          return { data: [] };
        }
        throw error;
      });

      if (Array.isArray(dirContent)) {
        const coverImage = dirContent.find(file => 
          file.type === 'file' && 
          /^(?:cover|Cover|COVER)\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
        );

        if (coverImage) {
          return `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${basePath}${basePath ? '/' : ''}${coverImage.name}`;
        }
      }
    } catch (error) {
      // Only log critical errors, not 404s
      if (!(error as OctokitError).status || (error as OctokitError).status !== 404) {
        console.error('Critical error in findCoverImage:', error);
      }
      continue; // Continue checking other paths even if one fails
    }
  }
  return undefined;
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const predefinedPost = await getPost(slug);
    if (!predefinedPost) return null;

    try {
      const filePath = path.join(process.cwd(), 'content/blog', `${slug}.md`);
      const fileContents = await fs.readFile(filePath, 'utf8');
      const { data, content } = matter(fileContents) as { data: MatterData; content: string };
      
      let coverImage = data.coverImage ?? undefined;
      if (coverImage?.startsWith) {
        coverImage = coverImage.startsWith('http') ? coverImage : `/images/${coverImage}`;
      }

      const processedContent = content.replace(
        /!\[([^\]]*)\]\((?!http)([^)]+)\)/g,
        (match, alt, src) => `![${alt}](/images/${src})`
      );

      const htmlContent = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkHtml, { 
          sanitize: false,
          allowDangerousHtml: true 
        })
        .process(processedContent);

      return {
        ...predefinedPost,
        content: htmlContent.toString(),
        coverImage,
        date: data.date ?? undefined,
      };
    } catch {
      const [owner, repo] = predefinedPost.repo.split('/');
      
      if (!owner || !repo) {
        throw new Error('Invalid repository format');
      }

      // Wrap the GitHub API calls in a try-catch to handle errors silently
      try {
        const { data: repoInfo } = await octokit.repos.get({
          owner,
          repo,
        }).catch((error: OctokitError) => {
          if (error.status === 404) {
            return { data: { default_branch: 'main' } };
          }
          throw error;
        });

        const defaultBranch = repoInfo.default_branch;
        const coverImage = await findCoverImage(owner, repo, defaultBranch);

        const { data: readme } = await octokit.repos.getReadme({
          owner,
          repo,
          mediaType: { format: 'raw' },
        }).catch(() => ({ data: '' }));

        const processedContent = await processGitHubImages(
          typeof readme === 'string' ? readme : readme.content ?? '',
          owner,
          repo,
          defaultBranch
        );

        const content = await unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkHtml, { 
            sanitize: false,
            allowDangerousHtml: true 
          })
          .process(processedContent);

        // If no dedicated cover image found, fall back to first image in README
        let finalCoverImage = coverImage;
        if (!finalCoverImage) {
          const imageRegex = /!\[([^\]]*)\]\((https:\/\/raw\.githubusercontent\.com[^)]+)\)/;
          const firstImageMatch = imageRegex.exec(processedContent);
          if (firstImageMatch) {
            finalCoverImage = firstImageMatch[2];
          }

          // If still no image, try the assets/images directory as before
          if (!finalCoverImage) {
            try {
              const { data: imageDir } = await octokit.repos.getContent({
                owner,
                repo,
                path: 'assets/images',
              });

              if (Array.isArray(imageDir)) {
                const firstImage = imageDir.find(file => 
                  file.type === 'file' && 
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
                );

                if (firstImage) {
                  finalCoverImage = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/assets/images/${firstImage.name}`;
                }
              }
            } catch (error) {
              console.warn('Could not fetch images directory:', error);
            }
          }
        }

        return {
          ...predefinedPost,
          content: content.toString(),
          coverImage: finalCoverImage,
        };
      } catch (error) {
        // Only log non-404 errors
        if (!(error as OctokitError).status || (error as OctokitError).status !== 404) {
          console.error('Error fetching GitHub content:', error);
        }
        return {
          ...predefinedPost,
          content: '',
          coverImage: undefined,
        };
      }
    }
  } catch (error) {
    console.error(`Error getting blog post ${slug}:`, error);
    return null;
  }
}

export { getBlogPosts } from "@/lib/content";
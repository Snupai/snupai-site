import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function countMatches(content: string, query: string): number {
  if (!query) return 0
  const regex = new RegExp(query, 'gi')
  return (content.match(regex) ?? []).length
}

function extractSearchableContent(content: string): string {
  // Extract all text content that might be searchable
  const allMatches = content.match(/['"`]([^'"`]+)['"`]/g) ?? []
  return allMatches
    .map(str => str.slice(1, -1))
    .filter(str => 
      !str.includes('className') &&
      !str.includes('import') &&
      !str.includes('src/') &&
      !str.includes('function')
    )
    .join(' ')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  const pages = [
    { 
      path: '/', 
      filename: 'page.tsx',
      description: 'Homepage'
    },
    { 
      path: '/about', 
      filename: 'about/page.tsx',
      description: 'About myself :3'
    },
    { 
      path: '/projects', 
      filename: 'projects/page.tsx',
      description: 'Portfolio of my projects and small recommendations'
    },
    { 
      path: '/contact', 
      filename: 'contact/page.tsx',
      description: 'Ways to connect and get in touch'
    }
  ]

  try {
    const pagesContent = await Promise.all(pages.map(async page => {
      const filePath = path.join(process.cwd(), 'src/app', page.filename)
      let content = ''
      try {
        const rawContent = fs.readFileSync(filePath, 'utf8')
        content = extractSearchableContent(rawContent)
      } catch (error) {
        console.warn(`Could not read file: ${filePath}`)
      }

      // Also try to read MDX files if they exist
      try {
        const mdxPath = path.join(process.cwd(), 'src/app', page.path.slice(1), 'page.mdx')
        if (fs.existsSync(mdxPath)) {
          const mdxContent = fs.readFileSync(mdxPath, 'utf8')
          content += ' ' + mdxContent
            .replace(/---[\s\S]*?---/, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/#/g, '')
            .trim()
        }
      } catch (error) {
        // MDX file doesn't exist or couldn't be read
      }

      const matches = countMatches(content, query ?? '')

      return {
        path: page.path,
        name: page.path === '/' ? 'Home' : page.path.slice(1).charAt(0).toUpperCase() + page.path.slice(2),
        description: page.description,
        matches: matches,
        content
      }
    }))

    // Only return pages with matches if there's a query
    const filteredPages = query 
      ? pagesContent.filter(page => page.matches > 0)
      : pagesContent

    return NextResponse.json({ pages: filteredPages })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to search pages' }, { status: 500 })
  }
}
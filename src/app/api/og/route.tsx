import type { NextRequest } from 'next/server'
import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') ?? '/'
    
    // Get page title based on path
    let title = "Snupai's Website"
    let description = "Welcome to my personal website. For fun :3"
    
    switch (path) {
      case '/about':
        title = "About Snupai"
        description = "Learn more about me - a student, programmer, and automation engineer."
        break
      case '/projects':
        title = "Snupai's Projects"
        description = "Check out my projects and other cool projects I recommend."
        break
      case '/blog':
        title = "Snupai's Blog"
        description = "Read my thoughts and experiences on various topics."
        break
      case '/contact':
        title = "Contact Snupai"
        description = "Get in touch with me through various social platforms."
        break
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            // Catppuccin Mocha theme colors
            background: '#1e1e2e', // mocha base
            color: '#cdd6f4', // mocha text
            padding: '40px',
            fontFamily: 'Geist',
          }}
        >
          {/* Background pattern */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 25px 25px, #313244 2%, transparent 0%), radial-gradient(circle at 75px 75px, #313244 2%, transparent 0%)',
              backgroundSize: '100px 100px',
              opacity: 0.3,
            }}
          />
          
          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              zIndex: 1,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                textAlign: 'center',
                background: 'linear-gradient(90deg, #89b4fa, #f5c2e7)', // mocha blue to pink
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: '20px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 32,
                textAlign: 'center',
                color: '#a6adc8', // mocha subtext0
                maxWidth: '800px',
              }}
            >
              {description}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error: unknown) {
    console.error(error)
    return new Response(
      `Failed to generate the image: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      {
        status: 500,
      }
    )
  }
}
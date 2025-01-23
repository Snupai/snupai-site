import type { NextRequest } from 'next/server'
import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const title = searchParams.get('title')

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
            backgroundColor: 'white',
            padding: '40px',
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              textAlign: 'center',
              color: 'black',
            }}
          >
            {title ?? 'Default Title'}
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
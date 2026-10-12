# Snupai's Website

This is my personal website built with Next.js and styled with Tailwind CSS using the Catppuccin Mocha theme. The project structure is based on the [T3 Stack](https://create.t3.gg).

## Features

- Clean, modern design with the beautiful Catppuccin Mocha color scheme
- Responsive navigation with smooth transitions
- Project showcase pulling from GitHub API
- Contact information and social links

## Tech Stack

- [Next.js](https://nextjs.org) - React framework for production
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [GitHub API](https://docs.github.com/en/rest) - For fetching project data
- [Catppuccin](https://github.com/catppuccin/catppuccin) - Soothing pastel theme
- [T3 Stack](https://create.t3.gg) - Full-stack application structure

## Development

1. Clone the repository
2. Install dependencies with `bun install`
3. Start the development server with `bun run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

This site is deployed on Vercel. Any push to the master branch will trigger an automatic deployment.

## Analytics

Plausible tracks production visits to `snupai.me` and `www.snupai.me` through
`https://visits.snupai.dev/api/event`. The dashboard is
[visits.snupai.dev/snupai.me](https://visits.snupai.dev/snupai.me), with reporting
timezone Europe/Berlin. No API key or environment variable is required.

`src/components/PlausibleAnalytics.tsx` initializes the official NPM tracker
after hydration and automatically captures pageviews, including client-side
navigation. Development, preview hostnames, and `/admin` routes are excluded.
Form contents and custom properties are not collected by this integration.
To exclude your own visits, set `localStorage.plausible_ignore = "true"` in your
browser console on the production site.

After deploying, visit the production site and use **Verify NPM installation**
in Plausible to confirm live event receipt.

## License

This project is open source and available under the MIT License.

## Link previews

Public pages expose a [Discord component embed](https://docs.discord.com/developers/link-previews/component-embeds)
with a page title, description, site thumbnail, lavender accent, and navigation buttons.
The server-rendered head links to a static `/embeds/<page>` JSON payload. Open Graph
and Twitter metadata provide a fallback with a page-specific 1200 × 630 PNG.

Edit `src/lib/site-metadata.ts` for page copy and metadata,
`src/lib/discord-embed.ts` for the component layout, and
`src/app/share/[image]/route.tsx` for the fallback image design. Payloads and images
are generated during `next build`, without external API or font requests.
Keep component payloads under Discord's 3,000-byte limit and buttons in link style.

After deployment, check a public URL in the
[Discord Embed Debugger](https://discord.com/developers/embeds).
Discord caches previews for about 30 minutes; use a fresh query string (such as
`?embed=2`) when testing an updated preview. Local HTML checks cannot confirm the
final rendering in Discord.

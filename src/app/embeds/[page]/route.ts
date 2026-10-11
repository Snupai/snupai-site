import { notFound } from "next/navigation";
import { discordEmbed } from "~/lib/discord-embed";
import { sitePages, type SitePage } from "~/lib/site-metadata";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(sitePages).map((page) => ({ page }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  if (!Object.hasOwn(sitePages, page)) notFound();
  return Response.json(discordEmbed(page as SitePage));
}

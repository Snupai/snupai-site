import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { previewSize, sitePages, type SitePage } from "~/lib/site-metadata";

// Render at build time: crawlers don't need Redis, GitHub, or a font service.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(sitePages).map((page) => ({ image: `${page}.png` }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ image: string }> },
) {
  const { image } = await params;
  const page = image.replace(/\.png$/, "");
  if (image !== `${page}.png` || !Object.hasOwn(sitePages, page)) notFound();
  const { heading, path } = sitePages[page as SitePage];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
          backgroundColor: "#1e1e2e",
          backgroundImage:
            "radial-gradient(ellipse at top right, #313244 0%, #1e1e2e 65%)",
          color: "#cdd6f4",
          fontFamily: "sans-serif",
          borderLeft: "12px solid #b4befe",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#b4befe",
              letterSpacing: 4,
            }}
          >
            snupai.me
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#a6adc8" }}>
            {path === "/" ? "welcome" : path}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              whiteSpace: "pre-wrap",
              fontSize: 66,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.15,
              maxWidth: 880,
            }}
          >
            {heading}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              color: "#f5c2e7",
              marginLeft: 24,
            }}
          >
            :3
          </div>
        </div>
        <div
          style={{
            display: "flex",
            borderTop: "1px solid #45475a",
            paddingTop: 26,
            fontSize: 24,
            color: "#a6adc8",
          }}
        >
          code · AI experiments · automation · meow
        </div>
      </div>
    ),
    previewSize,
  );
}

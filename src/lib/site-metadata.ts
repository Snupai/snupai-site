import type { Metadata } from "next";

export const siteUrl = "https://snupai.me";
export const embedColor = "#b4befe";
export const siteIcons = {
  icon: [{ url: "/snupai.ico" }],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
  other: [
    {
      rel: "apple-touch-icon-precomposed",
      url: "/touch-icon-310x310.png",
      sizes: "310x310",
      type: "image/png",
    },
  ],
};
export const previewSize = { width: 1200, height: 630 };

export const sitePages = {
  home: {
    path: "/",
    title: "snupai.me - probably coding, definitely meowing",
    heading: "probably coding,\ndefinitely meowing",
    description:
      "Snupai's personal site with code projects, AI experiments, automation ideas, social links, yuri vibes, and suspicious amounts of meow.",
  },
  about: {
    path: "/about",
    title: "About Snupai",
    heading: "hi, I'm Snupai.",
    description:
      "About Snupai: a German applied computer science student who codes for fun, experiments with AI, and builds small automation projects.",
  },
  projects: {
    path: "/projects",
    title: "Snupai's Projects",
    heading: "things I've built\n& things I love",
    description:
      "Projects by Snupai, including C# tools, bots, web experiments, automation ideas, and a few open-source projects worth recommending.",
  },
  contact: {
    path: "/contact",
    title: "Contact Snupai",
    heading: "you've got\nmeow mail.",
    description:
      "Contact Snupai by email, social links, or the contact form for project questions, small web ideas, automation experiments, and meow mail.",
  },
  "hosting-guide": {
    path: "/hosting-guide",
    title: "Next.js Hosting Guide",
    heading: "let's get your\nsite online.",
    description:
      "A practical Next.js hosting guide by Snupai, available in German and English.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    heading: "a little clarity\nabout your data.",
    description:
      "Privacy details for snupai.me, including how contact form submissions, metadata, moderation records, and email delivery are handled.",
  },
  imprint: {
    path: "/imprint",
    title: "Imprint",
    heading: "the legal bits.",
    description:
      "Legal notice and provider information for snupai.me, including contact details, responsible party, liability notes, and copyright information.",
  },
} as const;

export type SitePage = keyof typeof sitePages;

export function pageMetadata(page: SitePage): Metadata {
  const { title, description, path } = sitePages[page];
  const image = {
    url: `${siteUrl}/share/${page}.png`,
    ...previewSize,
    type: "image/png",
    alt: `${title} — snupai.me`,
  };

  return {
    // Keep the home title from inheriting the page title suffix.
    title: page === "home" ? { absolute: title } : title,
    description,
    // Next's custom link descriptors emit the discovery link in the server head.
    // Preserve the favicons because page-level icons replace the inherited set.
    icons: {
      ...siteIcons,
      other: [
        ...siteIcons.other,
        {
          rel: "discord:component-embed",
          type: "application/json",
          url: `${siteUrl}/embeds/${page}`,
        },
      ],
    },
    alternates: { canonical: `${siteUrl}${path}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      siteName: "snupai.me",
      locale: "en_US",
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@Snupai",
      images: [image],
    },
  };
}

import {
  embedColor,
  sitePages,
  siteUrl,
  type SitePage,
} from "~/lib/site-metadata";

const navigation = [
  { page: "about", label: "About me" },
  { page: "projects", label: "Projects" },
  { page: "contact", label: "Get in touch" },
] as const;

export function discordEmbed(page: SitePage) {
  const { title, description, path } = sitePages[page];
  const links = [
    {
      label: page === "home" ? "Visit website" : "Open page",
      url: `${siteUrl}${path}`,
    },
    ...navigation
      .filter((item) => item.page !== page)
      .map((item) => ({
        label: item.label,
        url: `${siteUrl}${sitePages[item.page].path}`,
      })),
  ];

  return {
    component: {
      type: 17,
      accent_color: Number.parseInt(embedColor.slice(1), 16),
      components: [
        { type: 10, content: "-# snupai.me · code, experiments & meow" },
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `## [${title}](${siteUrl}${path})\n${description}`,
            },
          ],
          accessory: {
            type: 11,
            media: { url: `${siteUrl}/touch-icon-310x310.png` },
            description: "Blue and pink clouds — snupai.me's site icon",
          },
        },
        { type: 14, spacing: 1 },
        {
          type: 1,
          components: links.map(({ label, url }) => ({
            type: 2,
            style: 5,
            label,
            url,
          })),
        },
      ],
    },
  };
}

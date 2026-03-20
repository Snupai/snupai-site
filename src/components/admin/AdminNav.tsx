"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/contact-submissions", label: "Contact Moderation" },
  { href: "/admin/projects", label: "Projects" },
];

export default function AdminNav() {
  const pathname = usePathname();

  const getLinkClassName = (href: string) => {
    const isActive = pathname === href;
    const baseClass =
      "px-4 sm:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300";

    return `${baseClass} ${
      isActive
        ? "text-mocha-flamingo bg-mocha-surface/80"
        : "hover:bg-mocha-surface/50 highlight-text"
    }`;
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={getLinkClassName(link.href)}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

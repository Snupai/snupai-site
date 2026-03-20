import type { ReactNode } from "react";
import AdminNav from "~/components/admin/AdminNav";
import AdminSignOutButton from "~/components/admin/AdminSignOutButton";
import { requireAdminSession } from "~/server/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession("/admin");
  const username = session.user.username ?? session.user.name ?? "admin";

  return (
    <main className="flex flex-col">
      <div className="container mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[4rem]">
              <span className="title-highlight">Admin</span> Panel
            </h1>
            <p className="text-mocha-subtext0 mt-2 text-sm">
              Signed in as{" "}
              <span className="text-mocha-rosewater">{username}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminNav />
            <div className="bg-mocha-overlay h-6 w-px" />
            <AdminSignOutButton />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

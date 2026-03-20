import { redirect } from "next/navigation";
import { auth } from "~/auth";

export async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return null;
  }

  return session;
}

export async function requireAdminSession(callbackPath = "/admin") {
  const session = await getAdminSession();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return session;
}

export async function requireAdminApiSession() {
  const session = await getAdminSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
}

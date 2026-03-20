import { env } from "~/env";

function parseAdminUsernames() {
  return env.ADMIN_GITHUB_USERNAMES.split(",")
    .map((username) => username.trim().toLowerCase())
    .filter((username) => username.length > 0);
}

export function getAdminUsernameAllowlist() {
  return new Set(parseAdminUsernames());
}

export function isAllowedAdminUsername(username: string | null | undefined) {
  if (!username) {
    return false;
  }

  return getAdminUsernameAllowlist().has(username.trim().toLowerCase());
}

export function extractGitHubUsername(value: unknown) {
  if (!value || typeof value !== "object" || !("login" in value)) {
    return undefined;
  }

  const username = value.login;
  return typeof username === "string" ? username : undefined;
}

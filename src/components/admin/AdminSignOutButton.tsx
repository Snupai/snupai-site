import { signOut } from "~/auth";

export default function AdminSignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="text-mocha-maroon hover:bg-mocha-surface/50 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300"
      >
        Sign out
      </button>
    </form>
  );
}

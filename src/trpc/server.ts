import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { type AppRouter } from "@/server/api/root";
import { transformer } from "./shared";

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/trpc`
        : 'http://localhost:3000/api/trpc',
      headers() {
        return {
          "x-trpc-source": "rsc",
        };
      },
      transformer
    }),
  ],
}); 
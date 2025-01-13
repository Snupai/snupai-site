import { createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  // We'll add routes here later
});

export type AppRouter = typeof appRouter; 
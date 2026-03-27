import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { notificationsRouter } from "./routes/notifications";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;

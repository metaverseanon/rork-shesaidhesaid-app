import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const pushTokens = new Set<string>();

export const notificationsRouter = createTRPCRouter({
  registerToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(({ input }) => {
      pushTokens.add(input.token);
      console.log("Registered push token:", input.token);
      console.log("Total registered tokens:", pushTokens.size);
      return { success: true };
    }),

  sendToAll: publicProcedure
    .input(
      z.object({
        title: z.string(),
        body: z.string(),
        data: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tokens = Array.from(pushTokens);
      if (tokens.length === 0) {
        return { sent: 0, message: "No registered tokens" };
      }

      const messages = tokens.map((token) => ({
        to: token,
        sound: "default" as const,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      }));

      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messages),
        });

        const result = await response.json();
        console.log("Push notification send result:", result);
        return { sent: tokens.length, result };
      } catch (error) {
        console.error("Failed to send push notifications:", error);
        throw new Error("Failed to send push notifications");
      }
    }),

  getTokenCount: publicProcedure.query(() => {
    return { count: pushTokens.size };
  }),
});

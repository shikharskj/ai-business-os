import { z } from "zod";

export const markNotificationsSchema = z
  .object({
    notificationId: z.string().uuid().optional(),
    markAll: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.notificationId) || value.markAll === true, {
    message: "Provide notificationId or markAll.",
  });

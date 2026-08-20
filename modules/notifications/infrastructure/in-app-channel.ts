import type { NotificationChannel } from "@/modules/notifications/domain/channel";
import type { NotificationRepository } from "@/modules/notifications/domain/notification-repository";
import type {
  CreateNotificationInput,
  NotificationRecord,
} from "@/modules/notifications/domain/types";

export function createInAppChannel(
  notifications: NotificationRepository
): NotificationChannel {
  return {
    name: "IN_APP",
    async deliver(
      input: CreateNotificationInput
    ): Promise<NotificationRecord | null> {
      if (input.channel !== "IN_APP") {
        throw new Error(`In-app channel cannot deliver ${input.channel}`);
      }
      const result = await notifications.createIdempotent(input);
      return result.created ? result.record : null;
    },
  };
}

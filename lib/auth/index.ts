export type { ApplicationUser, ApplicationUserStore } from "@/lib/auth/application-user-store";
export { getCurrentUser, requireCurrentUser } from "@/lib/auth/current-user";
export { AuthenticationError } from "@/lib/auth/errors";
export { isPublicPath } from "@/lib/auth/public-routes";
export {
  applyUserLifecycleEvent,
  parseUserLifecycleEvent,
  type UserLifecycleEvent,
} from "@/lib/auth/user-lifecycle";

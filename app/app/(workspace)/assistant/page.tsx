import { permanentRedirect } from "next/navigation";

/** Former full-page assistant; the top-bar sheet is the only entry point. */
export default function AssistantPageRedirect() {
  permanentRedirect("/app");
}

import { AuthenticationError, requireCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    return Response.json({
      id: user.id,
      clerkUserId: user.clerkUserId,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    throw error;
  }
}

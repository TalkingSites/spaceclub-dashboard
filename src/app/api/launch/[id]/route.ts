import { auth } from "@/auth";
import { getLaunch } from "@/lib/launch";

// Launch progress for the progress page to poll; only the site's members can see it
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "unauthorised" }, { status: 401 });
  const launch = await getLaunch((await params).id, session.user.id);
  if (!launch) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(launch, { headers: { "Cache-Control": "no-store" } });
}

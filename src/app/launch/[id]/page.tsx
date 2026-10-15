import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLaunch } from "@/lib/launch";
import { Progress } from "./Progress";

export default async function LaunchProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const launch = await getLaunch(id, session.user.id);
  if (!launch) notFound();

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <header className="aero bar">
        <div className="logo">
          <img className="logo-img" src="/logo-orb.svg" alt="" />
          <div>
            <div className="brandname gloss-text">Launch</div>
            <div className="sub muted">{launch.name}</div>
          </div>
        </div>
        <Link className="pill glass" href="/">← <span>Mission Control</span></Link>
      </header>
      <Progress id={id} initial={launch} />
    </main>
  );
}

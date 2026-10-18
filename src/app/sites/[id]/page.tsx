import { auth } from "@/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canManage } from "@/lib/launch";
import { DangerZone, RetryButton } from "../SiteButtons";

// One site's settings, for its owner (and SpaceClub admins): retry a failed launch, or delete it
export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  if (!(await canManage(id, session.user.id))) notFound();
  const site = await db.site.findUniqueOrThrow({ where: { id } });

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <header className="aero bar">
        <div className="logo">
          <img className="logo-img" src="/logo-orb.svg" alt="" />
          <div>
            <div className="brandname gloss-text">{site.name}</div>
            <div className="sub muted">{site.url ? new URL(site.url).host : site.id}</div>
          </div>
        </div>
        <Link className="pill glass" href="/">← <span>Mission Control</span></Link>
      </header>

      <section className="aero settings-card">
        <h2>🔗 Links</h2>
        <div className="actions">
          {site.url && site.status === "LIVE" && <a className="pill glass" href={site.url} target="_blank" rel="noreferrer">🌐 <span>Visit site</span></a>}
          {site.url && site.status === "LIVE" && <a className="pill glass" href={new URL(site.editPath, site.url).toString()} target="_blank" rel="noreferrer">✏️ <span>Edit site</span></a>}
          {site.repo && <a className="pill glass" href={`https://github.com/${site.repo}`} target="_blank" rel="noreferrer">🧑‍💻 <span>Code on GitHub</span></a>}
        </div>
      </section>

      {site.status === "FAILED" && (
        <section className="aero settings-card">
          <h2>🚀 Launch</h2>
          <p className="muted">
            The launch hit a snag. Retrying picks it up from the step that failed. <Link href={`/launch/${site.id}`}>See what happened</Link>
          </p>
          <RetryButton slug={site.id} />
        </section>
      )}

      <section className="aero settings-card">
        <h2>⚠️ Danger zone</h2>
        <DangerZone slug={site.id} name={site.name} launching={site.status === "LAUNCHING"} />
      </section>
    </main>
  );
}

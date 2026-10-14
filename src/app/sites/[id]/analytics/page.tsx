import { auth } from "@/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VisitsChart } from "@/components/VisitsChart";
import { getAnalytics } from "@/lib/matomo";
import { findSite } from "@/lib/sites";

function duration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

function Ranked({ title, rows, empty }: { title: string; rows: { label: string; visits: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.visits));
  return (
    <div className="aero ranked">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ol>
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${r.visits} visits`}>
              <span className="ranked-label">{r.label}</span>
              <span className="ranked-bar"><b style={{ width: `${(r.visits / max) * 100}%` }} /></span>
              <span className="ranked-value">{r.visits}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const site = findSite(id, session.user.id);
  if (!site) notFound();
  const data = site.matomo ? await getAnalytics(site.matomo) : null;

  return (
    <main className="wrap">
      <header className="aero bar">
        <div className="logo">
          <img className="logo-img" src="/logo-orb.svg" alt="" />
          <div>
            <div className="brandname gloss-text">{site.name}</div>
            <div className="sub muted">Analytics, last 30 days</div>
          </div>
        </div>
        <Link className="pill glass" href="/">← <span>Mission Control</span></Link>
      </header>

      {!data ? (
        <section className="aero hello">
          <div>
            <h1>No analytics yet</h1>
            <p className="muted">This site isn&apos;t connected to Matomo, or Matomo couldn&apos;t be reached.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="stats">
            {[
              ["Visits", data.totals.visits.toLocaleString("en-AU")],
              ["Visitors", data.totals.visitors.toLocaleString("en-AU")],
              ["Page views", data.totals.pageviews.toLocaleString("en-AU")],
              ["Avg. time", duration(data.totals.avgSeconds)],
            ].map(([label, value]) => (
              <div key={label} className="aero stat">
                <span className="stat-value">{value}</span>
                <span className="muted">{label}</span>
              </div>
            ))}
          </section>

          <section className="aero chart-card">
            <VisitsChart data={data.daily} />
          </section>

          <section className="ranked-grid">
            <Ranked title="Top pages" rows={data.pages} empty="No page views yet." />
            <Ranked title="Where visitors come from" rows={data.referrers} empty="No referrers yet." />
          </section>
        </>
      )}
    </main>
  );
}

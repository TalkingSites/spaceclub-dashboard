import Link from "next/link";
import type { Site } from "@/lib/sites";
import { RetryButton } from "@/app/sites/SiteButtons";

function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"], [60, "minute"], [24, "hour"], [30, "day"], [12, "month"], [Infinity, "year"],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return "";
}

const STATE_COLOURS: Record<string, string> = { running: "#33d17a", exited: "#ef4444", restarting: "#f5a524" };
const STATE_LABELS: Record<string, string> = { running: "Live", exited: "Offline", restarting: "Restarting", launching: "Launching", failed: "Launch failed" };

// One site: a preview you can click, its name and status, two numbers, one main button
// (Edit, or Retry when the launch failed) and labelled buttons for everything else.
export function SiteCard({ site }: { site: Site }) {
  const host = site.url ? new URL(site.url).host : null;
  const failed = site.status === "FAILED";
  const launching = site.status === "LAUNCHING";
  const state = failed ? "failed" : launching ? "launching" : site.state;

  return (
    <article className="aero site">
      {failed || launching ? (
        <Link className="shot shot-empty" href={`/launch/${site.id}`}>
          <span aria-hidden>{failed ? "🛰️" : "🚀"}</span>
          <span>{failed ? "This launch didn't finish" : "Launching now..."}</span>
          <span className="shot-link">{failed ? "See what happened" : "Watch the launch"} →</span>
        </Link>
      ) : (
        <a className="shot" href={site.url ?? undefined} target="_blank" rel="noreferrer" aria-label={`Visit ${site.name}`}>
          {/* a live, shrunk-down view of the site */}
          {site.url && <iframe src={site.url} title="" loading="lazy" sandbox="" tabIndex={-1} />}
          {host && <span className="shot-host">{host} ↗</span>}
        </a>
      )}
      <div className="body">
        <div className="site-head">
          <h3>{site.name}</h3>
          {site.error ? (
            <span className="chip warn" title={site.error}>Status unknown</span>
          ) : (
            <span className={`chip state-${state}`}>
              <span className="dot" style={{ color: failed ? "#ef4444" : launching ? "#2fb8ff" : (STATE_COLOURS[site.state] ?? "#94a3b8") }} />
              {STATE_LABELS[state] ?? state}
            </span>
          )}
        </div>

        {!failed && !launching && (
          <dl className="site-stats">
            <div>
              <dt>Visits</dt>
              <dd>{site.visits30d !== null ? site.visits30d.toLocaleString("en-AU") : "–"}<small> last 30 days</small></dd>
            </div>
            <div>
              <dt>Last update</dt>
              <dd>{site.lastDeploy ? timeAgo(site.lastDeploy.at) : "–"}</dd>
            </div>
          </dl>
        )}

        {failed && site.canManage && <RetryButton slug={site.id} wide />}
        {!failed && site.editUrl && (
          <a className="pill wide" href={site.editUrl} target="_blank" rel="noreferrer">
            ✏️ <span>Edit site</span>
          </a>
        )}

        <div className="site-links">
          {!failed && site.url && (
            <a className="pill glass small" href={site.url} target="_blank" rel="noreferrer">🔗 <span>Visit</span></a>
          )}
          {!failed && site.hasAnalytics && (
            <Link className="pill glass small" href={`/sites/${site.id}/analytics`}>📊 <span>Analytics</span></Link>
          )}
          {site.canManage && (
            <Link className="pill glass small" href={`/sites/${site.id}`}>⚙️ <span>Settings</span></Link>
          )}
        </div>
      </div>
    </article>
  );
}

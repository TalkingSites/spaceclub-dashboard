import type { Site } from "@/lib/sites";

function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
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

export function SiteCard({ site }: { site: Site }) {
  const host = site.url ? new URL(site.url).host : null;

  return (
    <article className="aero site">
      <div className="shot">
        {/* a live, shrunk-down view of the site */}
        {site.url && <iframe src={site.url} title="" loading="lazy" sandbox="" tabIndex={-1} />}
      </div>
      <div className="body">
        <h3>{site.name}</h3>
        <div className="meta">
          {site.error ? (
            <span className="error">Couldn&apos;t load this site&apos;s status</span>
          ) : (
            <span className="chip">
              <span className="dot" style={{ color: STATE_COLOURS[site.state] ?? "#94a3b8" }} />
              {site.state === "running" ? "live" : site.state}
            </span>
          )}
          {host && <span className="muted">{host}</span>}
          {site.lastDeploy && <span className="muted">updated {timeAgo(site.lastDeploy.at)}</span>}
          {site.visits30d !== null && <span className="muted">{site.visits30d.toLocaleString("en-AU")} visits</span>}
        </div>
        <div className="actions">
          {site.editUrl && (
            <a className="pill" href={site.editUrl} target="_blank" rel="noreferrer">
              ✏️ <span>Edit site</span>
            </a>
          )}
          {site.repo && (
            <a className="pill glass icon" href={`https://github.com/${site.repo}`} target="_blank" rel="noreferrer" title="GitHub" aria-label="GitHub">
              🐙
            </a>
          )}
          {site.url && (
            <a className="pill glass icon" href={site.url} target="_blank" rel="noreferrer" title="Visit site" aria-label="Visit site">
              🔗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

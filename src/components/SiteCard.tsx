import Link from "next/link";
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

// The GitHub mark (octicon), so it inherits the button's text colour
function GitHubLogo() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
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
          {site.hasAnalytics && (
            <Link className="pill purple" href={`/sites/${site.id}/analytics`}>
              📊 <span>Analytics</span>
            </Link>
          )}
          {site.repo && (
            <a className="pill glass icon" href={`https://github.com/${site.repo}`} target="_blank" rel="noreferrer" title="GitHub" aria-label="GitHub">
              <GitHubLogo />
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

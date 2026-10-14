import { ExternalLink, GitBranch, PencilLine } from "lucide-react";
import type { Site } from "@/lib/sites";

const GRADIENTS = [
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
];

const STATE_STYLES: Record<string, string> = {
  running: "bg-emerald-500/20 text-emerald-400",
  exited: "bg-rose-500/20 text-rose-400",
  restarting: "bg-amber-500/20 text-amber-400",
};

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

function ActionLink({ href, label, className, children }: { href: string | null; label: string; className: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className={`flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium transition-transform hover:scale-105 ${className}`}
    >
      {children}
    </a>
  );
}

export function SiteCard({ site, index }: { site: Site; index: number }) {
  const host = site.url ? new URL(site.url).host : null;

  return (
    <article className="overflow-hidden rounded-xl bg-inset transition-transform hover:scale-[1.01]">
      <div className="relative h-44 overflow-hidden" style={{ background: GRADIENTS[index % GRADIENTS.length] }}>
        {site.url && (
          // A live, shrunk-down view of the site; the gradient shows if it can't load
          <iframe
            src={site.url}
            title=""
            loading="lazy"
            sandbox=""
            tabIndex={-1}
            className="pointer-events-none absolute top-0 left-0 h-[400%] w-[400%] origin-top-left scale-25 border-0"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
        <div className="absolute right-4 bottom-4 left-4">
          <h3 className="font-display text-xl font-bold text-white">{site.name}</h3>
          {host && <p className="text-sm text-white/80">{host}</p>}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATE_STYLES[site.state] ?? "bg-slate-500/20 text-slate-400"}`}>
            {site.state === "running" ? "live" : site.state}
          </span>
          {site.visits30d !== null && <span>{site.visits30d.toLocaleString("en-AU")} visits (30 days)</span>}
          {site.lastDeploy && <span>updated {timeAgo(site.lastDeploy.at)}</span>}
          {site.error && <span className="text-rose-400">couldn&apos;t reach Coolify</span>}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <ActionLink href={site.editUrl} label="Edit site" className="col-span-2 bg-gradient-to-br from-purple-600 to-cyan-500 text-white">
            <PencilLine className="h-4 w-4" /> Edit site
          </ActionLink>
          <ActionLink href={site.repo ? `https://github.com/${site.repo}` : null} label="GitHub" className="bg-inset">
            <GitBranch className="h-4 w-4" />
          </ActionLink>
          <ActionLink href={site.url} label="Visit site" className="bg-inset">
            <ExternalLink className="h-4 w-4" />
          </ActionLink>
        </div>
      </div>
    </article>
  );
}


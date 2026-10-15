// Visitor data from Matomo. Each instance has its own URL and token:
// MATOMO_<INSTANCE>_URL and MATOMO_<INSTANCE>_TOKEN, e.g. MATOMO_TALKINGSITES_URL.

export type MatomoRef = { instance: string; siteId: number };

async function matomo<T>(ref: MatomoRef, method: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = ref.instance.toUpperCase();
  const url = process.env[`MATOMO_${key}_URL`];
  const token = process.env[`MATOMO_${key}_TOKEN`];
  if (!url || !token) return null;

  const body = new URLSearchParams({ module: "API", method, idSite: String(ref.siteId), format: "JSON", token_auth: token, ...params });
  try {
    const res = await fetch(`${url}/index.php`, { method: "POST", body, signal: AbortSignal.timeout(8000), next: { revalidate: 900 } });
    const data = await res.json();
    if (data?.result === "error") {
      console.error(`[matomo] ${method}: ${data.message}`);
      return null;
    }
    return data as T;
  } catch (err) {
    console.error(`[matomo] ${method}: ${(err as Error).message}`);
    return null;
  }
}

export async function getVisits30d(ref: MatomoRef): Promise<number | null> {
  const data = await matomo<{ value: number }>(ref, "VisitsSummary.getVisits", { period: "range", date: "last30" });
  return typeof data?.value === "number" ? data.value : null;
}

type Summary = { nb_visits?: number; nb_uniq_visitors?: number; nb_actions?: number; avg_time_on_site?: number; bounce_rate?: string };
type Row = { label: string; nb_visits: number; url?: string };

export type Analytics = {
  totals: { visits: number; visitors: number; pageviews: number; avgSeconds: number };
  daily: { date: string; visits: number }[];
  pages: { label: string; visits: number }[];
  referrers: { label: string; visits: number }[];
};

export async function getAnalytics(ref: MatomoRef): Promise<Analytics | null> {
  const range = { period: "range", date: "last30" };
  const [totals, daily, pages, referrers] = await Promise.all([
    matomo<Summary>(ref, "VisitsSummary.get", range),
    matomo<Record<string, Summary | []>>(ref, "VisitsSummary.get", { period: "day", date: "last30" }),
    matomo<Row[]>(ref, "Actions.getPageUrls", { ...range, flat: "1", filter_limit: "8" }),
    matomo<Row[]>(ref, "Referrers.getAll", { ...range, filter_limit: "8" }),
  ]);
  if (!totals || !daily) return null;

  return {
    totals: {
      visits: totals.nb_visits ?? 0,
      visitors: totals.nb_uniq_visitors ?? 0,
      pageviews: totals.nb_actions ?? 0,
      avgSeconds: totals.avg_time_on_site ?? 0,
    },
    // days with no visits come back as an empty array
    daily: Object.entries(daily).map(([date, d]) => ({ date, visits: Array.isArray(d) ? 0 : (d.nb_visits ?? 0) })),
    pages: (pages ?? []).map((r) => ({ label: r.label, visits: r.nb_visits })),
    referrers: (referrers ?? []).map((r) => ({ label: r.label, visits: r.nb_visits })),
  };
}

// Adds a site to a Matomo instance and returns its id (the token needs admin or super user)
export async function addMatomoSite(instance: string, name: string, url: string): Promise<{ url: string; siteId: number }> {
  const key = instance.toUpperCase();
  const base = process.env[`MATOMO_${key}_URL`];
  const token = process.env[`MATOMO_${key}_TOKEN`];
  if (!base || !token) throw new Error(`Matomo ${instance} isn't configured`);
  const body = new URLSearchParams({
    module: "API", method: "SitesManager.addSite", format: "JSON", token_auth: token,
    siteName: name, "urls[0]": url, timezone: "Australia/Melbourne", currency: "AUD",
  });
  const res = await fetch(`${base}/index.php`, { method: "POST", body, signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (typeof data?.value !== "number") throw new Error(`Matomo: ${data?.message ?? res.status}`);
  return { url: `${base.replace(/\/$/, "")}/`, siteId: data.value };
}

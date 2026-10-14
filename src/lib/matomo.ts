// Visitor numbers from Matomo. Each instance has its own URL and token:
// MATOMO_<INSTANCE>_URL and MATOMO_<INSTANCE>_TOKEN, e.g. MATOMO_ELECTRONWORKSHOP_URL.

export async function getVisits30d(instance: string, siteId: number): Promise<number | null> {
  const key = instance.toUpperCase();
  const url = process.env[`MATOMO_${key}_URL`];
  const token = process.env[`MATOMO_${key}_TOKEN`];
  if (!url || !token) return null;

  const body = new URLSearchParams({
    module: "API",
    method: "VisitsSummary.getVisits",
    idSite: String(siteId),
    period: "range",
    date: "last30",
    format: "JSON",
    token_auth: token,
  });
  try {
    const res = await fetch(`${url}/index.php`, { method: "POST", body, next: { revalidate: 900 } });
    const data = await res.json();
    return typeof data?.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}

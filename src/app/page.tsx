import { auth, signOut } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteCard } from "@/components/SiteCard";
import { SupportPanel } from "@/components/SupportPanel";
import { HOURS } from "@/lib/support";
import { UserMenu } from "@/components/UserMenu";
import { getSites } from "@/lib/sites";
import { version } from "../../package.json";

const TILES = [
  { title: "Add a domain", text: "Connect your own address to a site.", icon: "🌐", a: "#7fe9ff", b: "#1a7fe0" },
  { title: "Analytics", text: "Who's visiting, from where, and what they read.", icon: "📈", a: "#c9abff", b: "#6a2fd6" },
  { title: "More services", text: "Email, forms, bookings and more.", icon: "🛰️", a: "#b4f79a", b: "#1fa63d" },
];

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-AU", { hour: "numeric", hourCycle: "h23", timeZone: "Australia/Melbourne" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sites = await getSites(session.user.id);
  const name = session.user.name?.split(" ")[0] ?? "there";
  const left = HOURS.total - HOURS.used - HOURS.inProgress;

  return (
    <main className="wrap">
      <header className="aero bar">
        <div className="logo">
          <img className="logo-img" src="/logo-orb.svg" alt="" />
          <div>
            <div className="brandname gloss-text">SpaceClub</div>
            <div className="sub muted">Mission Control</div>
          </div>
        </div>
        <div className="header-actions">
          <UserMenu name={session.user.name ?? "there"} email={session.user.email} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="pill glass">Log out</button>
          </form>
        </div>
      </header>

      <section className="aero hello">
        <div>
          <h1>{greeting()}, {name}</h1>
          <p className="muted">
            {sites.length === 1 ? "1 site" : `${sites.length} sites`} in orbit and {left} hours of support fuel left this cycle.
          </p>
        </div>
        <div className="fuel">
          <div className="gauge" style={{ ["--p" as string]: Math.round((left / HOURS.total) * 100) }}><span>{left}h</span></div>
          <span className="muted" style={{ fontSize: ".85rem" }}>fuel left</span>
        </div>
      </section>

      <h2 className="section">🪐 Your sites in orbit</h2>
      <section className="sites">
        {sites.map((site) => (
          <SiteCard key={site.name} site={site} />
        ))}
        <Link href="/launch" className="aero add-site">
          <div className="planet-btn">+</div>
          <h3>Launch a new site</h3>
          <p className="muted">Start from the SpaceClub template and put it in orbit.</p>
        </Link>
      </section>

      <section className="tiles">
        {TILES.map((t) => (
          <div key={t.title} className="aero tile">
            <div className="icon-orb" style={{ ["--a" as string]: t.a, ["--b" as string]: t.b }}>{t.icon}</div>
            <h3>{t.title}</h3>
            <p className="muted">{t.text}</p>
            <span className="soon">soon</span>
          </div>
        ))}
      </section>

      <SupportPanel />

      <footer className="muted" style={{ textAlign: "center", fontFamily: "ui-monospace, monospace", fontSize: ".75rem", color: "#fff", textShadow: "0 1px 3px rgba(0,20,90,.6)" }}>
        SpaceClub Mission Control v{version}
      </footer>
    </main>
  );
}

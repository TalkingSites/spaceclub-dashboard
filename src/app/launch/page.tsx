import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SITES_DOMAIN } from "@/lib/launch";
import { LaunchForm } from "./LaunchForm";

export default async function LaunchPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <header className="aero bar">
        <div className="logo">
          <img className="logo-img" src="/logo-orb.svg" alt="" />
          <div>
            <div className="brandname gloss-text">Launch</div>
            <div className="sub muted">Put a new site in orbit</div>
          </div>
        </div>
        <Link className="pill glass" href="/">← <span>Mission Control</span></Link>
      </header>
      <section className="aero settings-card">
        <h2>🚀 New site</h2>
        <p className="muted">Built from the SpaceClub template, with editing, previews and analytics ready to go. You can connect your own domain later.</p>
        <LaunchForm domain={SITES_DOMAIN} />
      </section>
    </main>
  );
}

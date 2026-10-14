import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getMe } from "@/lib/authentik";
import { ProfileForm } from "./ProfileForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const me = await getMe(session.user.id, session.user.username).catch((err) => {
    console.error(`[settings] ${(err as Error).message}`);
    return null;
  });

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <header className="aero bar">
        <div className="logo">
          <img className="logo-img" src="/logo-orb.svg" alt="" />
          <div>
            <div className="brandname gloss-text">Settings</div>
            <div className="sub muted">Your SpaceClub account</div>
          </div>
        </div>
        <Link className="pill glass" href="/">← <span>Mission Control</span></Link>
      </header>

      <section className="aero settings-card">
        <h2>👤 Profile</h2>
        {me ? (
          <ProfileForm name={me.name} username={me.username} email={me.email} />
        ) : (
          <p className="muted">Couldn&apos;t load your profile right now. Try logging out and in again.</p>
        )}
      </section>

      <section className="aero settings-card">
        <h2>🎨 Theme</h2>
        <p className="muted">System follows your computer&apos;s light or dark setting.</p>
        <ThemeToggle />
      </section>
    </main>
  );
}

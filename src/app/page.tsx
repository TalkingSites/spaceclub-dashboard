import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Globe, Link2, Plus, Rocket } from "lucide-react";
import { SiteCard } from "@/components/SiteCard";
import { SupportPanel } from "@/components/SupportPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getSites } from "@/lib/sites";
import { version } from "../../package.json";

const LAUNCH = [
  { title: "Launch new site", text: "Deploy with the SpaceClub template", icon: Rocket, gradient: "from-[#111e6c] to-purple-600" },
  { title: "Add domain", text: "Connect a new domain to your orbit", icon: Link2, gradient: "from-purple-600 to-cyan-400" },
  { title: "More services", text: "Expand your capabilities", icon: Plus, gradient: "from-cyan-400 to-emerald-400" },
];

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sites = await getSites(session.user.id);

  return (
    <>
      <header className="border-b border-card-border backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-9" />
            <div>
              <h1 className="gradient-text font-display text-2xl font-bold">SpaceClub</h1>
              <p className="text-xs text-muted">Mission Control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="card rounded-lg px-4 py-2 text-sm font-medium transition-transform hover:scale-105" title={session?.user?.email ?? undefined}>
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <section className="card rounded-2xl p-6 shadow-xl sm:p-8">
          <h2 className="mb-6 flex items-center gap-2 font-display text-2xl font-bold">
            <Globe className="h-6 w-6 text-cyan-400" />
            Your sites in orbit
          </h2>
          {sites.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {sites.map((site, i) => (
                <SiteCard key={site.name} site={site} index={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-inset px-6 py-12 text-center">
              <Rocket className="mx-auto mb-3 h-10 w-10 text-purple-400" />
              <p className="font-display text-lg font-bold">No sites in orbit yet</p>
              <p className="mt-1 text-sm text-muted">Once a site is launched for you, it shows up here.</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {LAUNCH.map(({ title, text, icon: Icon, gradient }) => (
            <div key={title} className="card relative rounded-2xl p-6 shadow-xl">
              <span className="absolute top-4 right-4 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-xs text-amber-400">soon</span>
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br p-3 text-white ${gradient}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1 font-display text-xl font-bold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </div>
          ))}
        </section>

        <SupportPanel />
      </main>

      <footer className="py-6 text-center font-mono text-xs text-muted">SpaceClub Mission Control v{version}</footer>
    </>
  );
}

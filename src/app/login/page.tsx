import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="login">
      <div className="aero">
        <img className="logo-img" src="/logo-orb.svg" alt="" style={{ height: 84 }} />
        <div>
          <h1 className="brandname gloss-text" style={{ fontSize: "2.4rem" }}>SpaceClub</h1>
          <p className="muted">Mission Control</p>
        </div>
        <form
          style={{ width: "100%" }}
          action={async () => {
            "use server";
            await signIn("authentik", { redirectTo: "/" });
          }}
        >
          <button className="pill" style={{ width: "100%", padding: ".85rem 1.2rem", fontSize: "1.05rem" }}>
            <span>🚀 Log in</span>
          </button>
        </form>
      </div>
    </main>
  );
}

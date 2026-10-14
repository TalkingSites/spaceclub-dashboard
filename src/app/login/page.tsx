import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="card flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl p-10 text-center shadow-xl">
        <img src="/logo.svg" alt="" className="h-14" />
        <div>
          <h1 className="gradient-text font-display text-3xl font-bold">SpaceClub</h1>
          <p className="mt-1 text-sm text-muted">Mission Control</p>
        </div>
        <form
          className="w-full"
          action={async () => {
            "use server";
            await signIn("authentik", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-lg bg-gradient-to-r from-[#111e6c] to-purple-600 px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.02]">
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}

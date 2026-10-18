@AGENTS.md

# SpaceClub Mission Control

The front door for SpaceClub sites: people log in with Authentik, see their sites, and jump into Spacedash (the Decap-based editor at each site's `/admin/`) to edit them. Later: launch new sites, add domains, analytics and pro bono support requests.

## Commands

```bash
pm2 start ecosystem.config.cjs   # dev server on http://localhost:3000
npm run build                    # production build
npx tsc --noEmit && npm run lint
```

Secrets live in `.env.local` (gitignored); `.env.example` lists every key.

## How it fits together

- **Sign-in:** Auth.js with the Authentik provider (`src/auth.ts`). Issuer is `auth.talkingsites.org` (a brand on the EW Authentik). `src/proxy.ts` and each page check for `session.user`, never just a session object, because a misconfigured provider returns an error object that must not count as logged in.
- **Sites:** Postgres via Prisma (`prisma/schema.prisma`): `Site`, `SiteMember` (who can see it; `uid` is the Authentik user uid, which equals the OIDC `sub` because the providers use hashed user ids) and `Launch` (launch progress). Local dev uses the `spaceclub-pg` podman container on port 5433; `npm run db:migrate`, `npm run db:seed`.
- **Launch:** `src/lib/launch.ts` runs the pipeline: repo from `TalkingSites/spaceclub` (the template, formerly spaceclub-template) (Spacedash GitHub App) → Matomo site → `site.json` settings → Authentik "Spacedash: <site>" app bound to the owner → Coolify app with env → wait for it to go live at `<slug>.sites.talkingsites.org`. Self-serve, 1 free site per person; `SPACECLUB_ADMIN_UIDS` are unlimited.
- **Data:** `src/lib/coolify.ts` (status, URL, last deploy) and `src/lib/matomo.ts` (visits, per instance via `MATOMO_<NAME>_URL/_TOKEN`). Tokens stay on the server.
- **Mock sections:** Domain / Analytics / More services tiles and the support panel are still sample data, marked "soon" and "sample data".

## Authentik theme

`brand/authentik/` holds the auth.talkingsites.org sign-in theme: `talkingsites.css` (core), `variants/` (light, glass, gradient) and `logo/` treatments. Open `preview.html` to compare them; push one with `scripts/authentik-brand-css.sh <variant> <logo>` (live: glass band). `base.css` only stands in for authentik's own CSS in the preview.

## Gotchas

- Authentik's `rbac/permissions/assigned_by_roles/<role>/assign/` **replaces** the role's global permissions, it doesn't add to them. Always send the full list. The "Mission Control" role holds: view/change user, add/view OAuth2 provider, add/view application, add policy binding, view flow, view scope mapping.

## Conventions

- Version in `package.json` shows in the footer; bump it with each user-facing change.
- No em dashes anywhere. No eyebrow labels above headings.

# Transport Inquiry Platform — Web

Next.js (App Router) frontend for the Transport Inquiry Platform. Talks to the
NestJS API in `../backend`. See `../PRD.md` for the product spec.

## Setup

```bash
pnpm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL, defaults to localhost:4000/api
pnpm dev                       # http://localhost:3000
```

The API must be running for anything past the login screen to work.

## Screens

| Route | Purpose |
|---|---|
| `/login` | Sign in |
| `/accept-invitation?token=…` | Set a password; optionally complete a company profile |
| `/inquiries` | Filterable list with saved views and CSV export |
| `/inquiries/new` | Structured intake form |
| `/inquiries/[id]` | Detail: lifecycle actions, vehicle history, conversation, CC/BCC, timeline, email trace |
| `/connections` | Invite counterparties, accept/suspend connections |
| `/users` | Team management (company admin) |
| `/company` | Company profile (company admin) |
| `/quarantine` | Inbound replies held for review |
| `/admin/companies` | Platform administration (super admin) |

## Notes

**Auth is cookie-based.** The API sets `httpOnly` access and refresh cookies, so
no token is reachable from JavaScript. Every request goes out with
`credentials: 'include'`, and `lib/api.ts` transparently retries once through
`/auth/refresh` on a 401 — collapsing concurrent 401s into a single refresh so a
page with several queries doesn't rotate the refresh token repeatedly.

**BCC is rendered honestly.** The API only returns BCC recipients to the person
who added them and to their own company admin, so the UI shows what the viewer is
actually entitled to see rather than relying on client-side filtering.

**No component library.** The handful of primitives in `components/ui.tsx` keeps
the dependency surface small and the styling consistent.

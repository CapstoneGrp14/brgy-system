# Changes — uncommitted work

Everything below sits in the working tree on top of `a114083`. Nothing here is
committed yet.

```
38 files changed, 813 insertions(+), 163 deletions(-)   plus 11 new files
```

---

## 1. Household head of family, and requests for minors

A barangay household now names its **head of family**, and that head can request
documents for the **minors living there** — children cannot hold portal accounts
(registration requires 16+), so without this a parent had to visit the hall for
every certificate.

**Staff** — Masterlist Registry gains a `Set Head` / `Unset Head` action and a
**Head of Family** badge on the row. Disabled until the record has a household
code. Every change is audited.

**Resident** — the Documents page shows a **"Who is this for?"** picker listing
the minors in that household. It is absent for everyone who is not a head,
because their dependant list comes back empty.

**The authority check is server-side and re-derived.** A submitted
`beneficiaryCensusRecordId` is never trusted: the server rebuilds the caller's
permitted list and rejects anything outside it. Dependants are household members
**under 18 with no account of their own**, so a registered 17-year-old files for
themselves rather than having the head act for them.

Requests filed this way read `Barangay Clearance — for Miguel Potolin`, and the
event note records `On behalf of …`, so staff see who the certificate names.

| | |
|---|---|
| Migration | `1753760000000-household-head-and-beneficiary` |
| Columns | `households.head_census_record_id`, `service_requests.beneficiary_census_record_id` |
| API | `GET /requests/dependants`, `POST /masterlist/:id/head` |

---

## 2. Per-staff module permissions

An administrator can withhold individual sections from an individual employee —
a Lupon member needs no SOS map, an SK chairperson no resident registry.

**Staff Accounts** gains an `Access (n/11)` panel per employee with a checkbox
for each module.

Enforcement is in **three** places, and only the first actually protects data:

1. **API guard** (`ModuleAccessGuard`) — reads the *current* grant from the
   database on each guarded request, not a token claim, so revocation applies
   immediately rather than when the access token next refreshes.
2. **Route guard** (`RequireModule`) — a withheld page redirects to the
   dashboard. Without it a typed URL or bookmark would still mount the screen,
   which then fills with 403s and reads as broken rather than withheld.
3. **Sidebar** — `navFor()` hides what the account may not use.

`NULL` means unrestricted and `[]` means dashboard-only; they are deliberately
different. Every existing account is `NULL`, so **nothing changed for anyone**
until an administrator makes a choice. Re-ticking everything writes `null` back
rather than a complete list, so the account reads as unrestricted.

Admins are never restricted, and the API rejects an attempt to restrict one.

| | |
|---|---|
| Migration | `1753770000000-staff-module-permissions` |
| Column | `users.allowed_modules` (JSON, nullable) |
| API | `POST /staff/:id/modules` |
| Modules | complaints · verification · masterlist · calendar · health · inventory · student · announcements · templates · charter · sos |

---

## 3. Push notifications for urgent announcements

An evacuation notice has to reach a resident whose phone is in their pocket. The
in-app bell and the email only reach someone already looking.

Residents opt in from the Announcements page. Posting an announcement marked
**Urgent** now also pushes to every subscribed device.

- **Push never blocks the broadcast** — the send is fired, not awaited. Posting
  must not fail or stall because a push service is slow, and the announcement is
  already saved and the bell already rung by that point.
- **Missing VAPID keys disable push cleanly** — sends become no-ops and the
  opt-in card does not render. Banner, bell and email are untouched, so a
  deployment without keys degrades rather than breaks.
- **Dead endpoints are pruned** — browsers discard subscriptions when data is
  cleared; a 404/410 removes the row instead of retrying forever.
- **The service worker does push only, no offline caching.** Deliberate: this
  portal is data-heavy and a stale cached queue screen would be worse than a
  slow load for staff acting on it.
- `requireInteraction` so an evacuation notice does not auto-dismiss, and one
  tag per announcement so a re-send replaces rather than stacks.

| | |
|---|---|
| Migration | `1753780000000-push-subscriptions` |
| API | `GET /push/key`, `POST /push/subscribe`, `DELETE /push/subscribe` |
| Files | `modules/push/*`, `apps/web/public/sw.js`, `apps/web/src/api/push.ts` |

**Production still needs its own VAPID keys.** A dev pair was generated into the
gitignored `.env`; generate separate ones for the server and pass
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` through
`docker-compose.prod.yml` — only the dev compose is wired.

```sh
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

**iOS needs install-to-home-screen.** Safari only delivers web push to an
installed PWA, and there is no manifest yet. Android and desktop work as-is.

---

## 4. Interface

- **Login page** rebuilt to the approved mockup: a single centred column on a
  white-to-blue vertical gradient, replacing the two-panel split. The gradient
  stops bunch toward the bottom so the upper half stays light enough for the
  navy heading to sit on it without a panel.
- **Sidebar** — icons removed, background is now a vertical gradient. The
  collapsed rail previously rendered *only* the icon, so it now shows two-letter
  initials (`CB`, `MR`) to stay usable.

The mockup's **"← Back to Homepage"** link was left out: `/` redirects straight
to `/login`, so it would loop on itself. A comment marks where it goes if a
landing page is ever built.

---

## Known caveats

**Permission changes are stale in the UI until `/users/me` refetches.** The API
enforces immediately, so no data is exposed — but a signed-in employee may still
*see* a nav item for a few moments after an administrator removes it. Clicking
it redirects correctly.

**Antonette's verification was set directly in the database** during testing, so
her account shows VERIFIED without having gone through staff approval. Reset it
before demonstrating the verification flow.

**The worker and api share `apps/api/dist`.** Both run `nest start --watch`, so
restarting them together can race and crash the worker with `MODULE_NOT_FOUND`.
Restart `api` first, wait for its build, then `worker`. Pre-existing; worth
giving the worker its own output directory.

---

## Verification

Typecheck clean across `@brgy/shared`, `@brgy/api`, `@brgy/web`.
Regression suite **40 / 40** after each change.

Checks run against the live system rather than assumed:

```
head of family  → sees "Miguel Potolin (13)"
non-head        → sees nobody
cross-household → BLOCKED
module revoked  → /masterlist 403, /complaints/queue 200, same token
urgent push     → "0 delivered, 1 dead endpoint(s) pruned"   (synthetic endpoint)
login + 2FA     → password → challenge → emailed code → token
```

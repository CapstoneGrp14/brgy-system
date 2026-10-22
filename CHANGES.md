# Changes — uncommitted work

Everything below sits in the working tree on top of `a114083`. Nothing here is
committed yet.

```
39 files changed, 989 insertions(+), 137 deletions(-)   plus 6 new files
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
installed PWA. A manifest now exists, so this is possible — but see §8: every
platform, Android included, needs an `https://` origin first.

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

## 5. Marriage certificate is now supporting evidence, not its own document

It was offered as an entry in the verification dropdown, which read as "this
document alone verifies you" — and it does not. A marriage certificate often
carries **no address at all**, and is issued by the municipality where the
wedding took place rather than where the couple lives, so on its own it
evidences neither residency nor current identity.

What it genuinely proves is the one thing a birth certificate cannot: that the
maiden surname printed there and the married surname in the census belong to
the same person.

So it now attaches **to** a primary document, behind an explicit declaration:

> ☐ **My surname changed when I married**
> Tick this if the name on the document above is your maiden name.

Ticking it reveals a second upload. Then:

- **Both images are OCR'd into one text pool.** The married surname usually
  appears only on the certificate, so reading the two documents separately
  would fail the very case this exists for.
- **The surname tolerance is narrow and evidenced.** `allowSurnameChange` lets
  *one* name part differ — all the others must still match. A different person
  with a marriage certificate attached still scores NO_MATCH.
- **The declaration does not stand on the resident's word.** Without the
  certificate the submission is rejected with a 400; the file is checked by
  magic bytes like the primary document, because staff open it during review.
- **Staff see why a mismatch was tolerated** — the row shows *Surname changed
  by marriage* with a link to the certificate, and the OCR checklist spells out
  "2 of 3 name parts matched — surname change evidenced by marriage certificate".

The type row is **deactivated, not deleted**: submissions already filed against
it keep their label, and admin Verification Settings shows it switched off
rather than silently losing a row.

Measured on the matcher directly:

```
maiden surname, no declaration   -> PARTIAL    55%   NAME missing (required)
maiden surname, with certificate -> MATCH     100%   NAME satisfied
different person, with cert      -> NO_MATCH   20%   NAME missing (required)
```

| | |
|---|---|
| Migration | `1753800000000-marriage-cert-supporting` |
| Columns | `verification_submissions.surname_changed_by_marriage`, `.supporting_upload_id` |

---

## 6. Search, filters and pagination on every queue

Ten screens were named; they are **seven components** — the admin portal reuses
Health & Medicine, Inventory and Student Support rather than duplicating them.

Two shared pieces do the work, so the controls behave identically everywhere:
`useTableView()` (search + filter + paging over a list the client already holds)
and `TableToolbar` / `Pagination`.

Filtering is **client-side on purpose**: these queues are bounded by the size of
one barangay, and their hooks already fetch the whole set to compute the header
counts. A round-trip per keystroke would make the filters feel slower than
scrolling.

| Screen | Search by | Filters |
|---|---|---|
| Health & Medicine *(resident)* | request, status | medicine / equipment |
| Complaints & Blotter | case, party, Lupon member | status · timeline · filing type |
| Resident Verification | resident, document | review stage · OCR result |
| Booking Calendar | resident, facility, purpose | conflicts · outcome |
| Health & Medicine *(staff)* | resident, request | type · stage |
| Inventory & Supplies | item name | category · stock level |
| Student Support | student, file | needs-action · upload vs drop-off |

Details that matter more than the controls themselves:

- **"Nothing matched" and "nothing exists" are different news.** Every table
  distinguishes them; a stray search used to read as an empty register.
- **Recent Decisions on the Booking Calendar was hard-capped at ten rows** by a
  `.slice(0, 10)`, silently hiding the rest. Paging shows the same ten at a
  time and admits there are more.
- **The Verification queue defaults to "Awaiting review"** — it keeps the last
  30 decisions alongside pending work, and yesterday's approvals were crowding
  out today's queue.
- **A filter that shrinks the list cannot strand you past the last page**,
  which would render as an empty table rather than as "no results".
- Counts read `3 of 48` while narrowed, so a filtered table never looks like
  lost records.

New strings are translated into Filipino, including the shared toolbar.

---

## 7. Bookings and Student Support can be filed for a minor

The **"Who is this for?"** picker from Documents now also appears on Bookings
and Student Support — a parent reserving the covered court for a child's party,
or printing a child's schoolwork, is the ordinary case for both.

Authority is re-derived server-side exactly as it is for documents: a submitted
`beneficiaryCensusRecordId` is never trusted, the server rebuilds the caller's
permitted list, and anything outside it is a 403.

Verified against the live system:

```
GET /requests/dependants        -> Miguel Potolin (13)
booking for Miguel              -> "For Miguel Potolin — Birthday Party"
booking, cross-household id     -> 403
booking for myself              -> "Zumba"            (no prefix)
printing for Miguel             -> "… — for Miguel Potolin"
printing, cross-household id    -> 403
```

| | |
|---|---|
| Migration | `1753790000000-booking-beneficiary` |
| Column | `bookings.beneficiary_census_record_id` |
| Extracted | `HouseholdAuthorityService` — shared by requests and bookings |

---

## 8. Why Android push never fired

The server was fine. `GET /push/key` returned a key with `enabled: true`, the
service worker and payload contract matched — and `push_subscriptions` held
**zero rows**. The phone never subscribed, so an urgent broadcast had nobody to
send to. Android's own notification setting being switched on was a red herring:
the site had never asked.

The cause is the **secure-context rule**. Browsers expose
`navigator.serviceWorker` only on `https://` or `localhost`. A phone opening the
dev server at `http://192.168.x.x:5173` has no service worker at all, so the
opt-in card — which rendered only when push was usable — rendered *nothing*.
There was no control to subscribe with and no explanation of why.

**What changed:** the unavailable states now render a card that says which wall
you hit — insecure origin, unsupported browser, or a server without keys — and
confirms that the banner, bell and email still work. The silence was
indistinguishable from the feature being broken.

**To actually receive push on a phone, the origin must be secure.** Pick one:

| Route | How |
|---|---|
| Deploy with TLS *(real fix)* | serve the portal over `https://` and set `VAPID_*` on the server |
| Tunnel, for a demo | `cloudflared tunnel --url http://localhost:5173` → use the https URL |
| Chrome Android flag, for dev | `chrome://flags/#unsafely-treat-insecure-origin-as-secure` → add `http://192.168.x.x:5173` → Relaunch |

The manifest also stopped declaring the logo as a **maskable** icon. It has no
safe-area padding, and Android crops a maskable icon into an adaptive shape,
which clipped the seal. Without the claim it is letterboxed on a background
instead. Add a padded 512×512 variant to reinstate it.


---

## 9. Fix: revoking a staff module stripped the same person's resident access

Reported against a **dual-role** account — a barangay employee who is also a
resident of the barangay (one login, `role = EMPLOYEE` plus a `resident_profile`
row). Withholding a module from their staff side also withheld it from their
resident side.

**Cause.** `@RequiresModule` sits at **class level** on six controllers that
serve *both* portals. `/bookings` carries the staff approval queue *and* the
resident's own bookings; `/verification` carries the approval queue *and* the
resident's own submission. The guard only skipped non-employees, so for a
dual-role employee it gated every route on those classes — resident ones
included.

**It was wider than the module revoked.** Setting a Lupon member to
`["complaints"]` and replaying their own resident calls:

```
GET /bookings/mine                   403   <- own bookings
GET /bookings/facilities             403
GET /complaints/mine                 200   (only because complaints was granted)
GET /verification/mine               403   <- own verification status
GET /verification/doc-types          403   <- could not even start getting verified
GET /inventory/available             403   <- could not request medicine
GET /announcements                   403   <- could not read an evacuation notice
GET /charter                         403   <- could not read the citizen's charter
GET /templates/document-types        403   <- could not request a document
```

**Fix.** `ModuleAccessGuard` now derives whether a route serves residents from
the route's own `@Roles` metadata, and a staff module grant never gates such a
route. A grant governs what someone may do *as staff*; it is not a statement
about their entitlements as a resident of the barangay.

The signal is server-derived, never client-supplied, so it cannot be used to
slip past the gate — a staff-only route still resolves to staff-only roles.
Routes with no `@Roles` at all (`/bookings/facilities`, `/bookings/slots`,
`/verification/doc-types`) are already reachable by every resident, so
withholding them from one employee protected nothing.

After the fix, same account, same token, same `["complaints"]` grant:

```
resident side   bookings/mine · verification/mine · doc-types · announcements
                charter · inventory/available · requests/mine · dependants    200
                POST /bookings (his own)                                      201
staff side      bookings/queue · verification/queue · inventory · masterlist
                templates · health-queue · printing-queue                     403
                POST /bookings/:id/decide                                     403
                complaints/queue · complaints/actions  (granted module)       200
```

**No escalation for staff who are not residents.** Verified with a temporary
staff-only employee on the same grant: every `@Roles(Role.RESIDENT)` route still
returns 403, because `RolesGuard` admits staff there only when `isResident` is
true. The only routes a module-restricted employee newly reaches are the
announcements, charter, document-type and facility lists — reference data every
resident already reads.

The web side needed no change: `navFor(portal, …)` keys off the **portal** being
rendered rather than the account's role, so the resident sidebar was never
filtered; and resident routes use `RequireVerified`, not `RequireModule`.

Covered by 10 new regression checks (`50 / 50`), which flip the grant through
the admin API and restore it afterwards.


---

## 10. Push: a real fan-out bug, and what "not working" actually was

Two separate things were wrong. Only one of them was code.

### 10a. The fan-out skipped anyone who was not `role = RESIDENT`

```ts
const residents = await this.users.find({ where: { role: In([Role.RESIDENT]) … } });
void this.push.sendToUsers(residents.map((r) => r.id), …)
```

For a barangay-wide emergency the audience is not a role — it is everyone who
asked to be told. That filter silently skipped two groups who **had opted in**:
a staff member who is also a resident of the barangay (dual role), and any
employee who turned alerts on. Same root cause as §9, a different symptom.

Demonstrated by registering two devices and firing one urgent broadcast:

```
subscriptions in DB: 2   (antonette RESIDENT, w.castro EMPLOYEE+resident)
delivery attempts  : 1   <- the dual-role device was never contacted
```

**Fixed** with `PushService.sendToAll()`, used by the urgent broadcast. Same
run after the fix: **2 attempts**.

Failures also now name the endpoint host. `Push failed (unknown)` gave no way
to tell one dead endpoint from a misconfigured deployment; it now reads
`Push failed for fcm.googleapis.com (410)`.

*Nuance left alone deliberately:* the notification **bell** still sends
residents `🚨 <title>` and staff `🚨 Urgent broadcast sent: <title>`, so a
dual-role user gets the staff-phrased line. They are informed either way, and
widening the resident query would ring their bell twice.

### 10b. Nothing was reaching any phone because nothing had ever subscribed

`push_subscriptions` held **zero rows**. The server was never the problem:

```
VAPID_PUBLIC_KEY   87 chars        GET /push/key -> enabled: true
VAPID_PRIVATE_KEY  43 chars        no "VAPID keys not set" warning at boot
VAPID_SUBJECT      mailto:brgy591dist6@gmail.com
```

The server→device path is verified end to end. `web-push` was asked to build
the exact request it would put on the wire, and the body was then decrypted
with the subscriber's private key the way a service worker does:

```
POST https://fcm.googleapis.com/fcm/send/…
TTL: 3600   Urgency: high   Content-Encoding: aes128gcm
Authorization: vapid t=eyJ0eXAiOiJKV1QiLCJh…  (345 chars, signed with our keys)
body: 250 bytes
decrypted: {"title":"🚨 …","body":"…","url":"/resident/announcements","tag":"announcement-…"}
```

Those four fields are exactly what `sw.js` reads, so a subscribed browser would
render the notification.

**So the gap is the subscribe step, and it is the secure-context rule** (§8).
Browsers expose `navigator.serviceWorker` only on `https://` or `localhost`. A
phone on `http://192.168.x.x:5173` cannot subscribe at all.

| Where you test | Can subscribe? |
|---|---|
| `http://localhost:5173` on this Mac | **yes** — secure context, works today |
| `http://192.168.x.x:5173` on a phone | no — needs one of the §8 routes |
| deployed over `https://` | yes |

### 10c. Verified on a real browser, notification and all

Driven with Playwright against the installed **Google Chrome** on
`http://localhost:5173` — a secure origin, so the service worker registers:

```
page isSecureContext         : true
browser subscribed to        : fcm.googleapis.com
POST /push/subscribe         : HTTP 201
urgent announcement posted   : HTTP 201
NOTIFICATION RENDERED BY SW  : {"title":"🚨 _e2e Evacuation Drill",
                                "body":"This is the end-to-end push proof.",
                                "tag":"announcement-eab0a9e5-…"}
api log                      : Urgent push: 1 delivered, 0 dead endpoint(s) pruned
```

That is the complete chain: browser subscribes → server stores the endpoint →
urgent broadcast → VAPID-signed and encrypted → Google FCM → service worker →
notification on screen. **Push works.**

Two things the attempt taught, both worth knowing before testing by hand:

- **Chrome disables the Push API in incognito**, with no feature detection by
  design. A private window will fail `subscribe()` with a bare
  "permission denied" no matter how the notification permission is set.
- **`http://localhost` is a secure origin**, so push works there with no TLS.
  Only other hosts — a LAN IP, a domain — need `https://`.

All three channels are intended to fire together for an urgent post: the email,
the app-level push, and the in-app bell plus banner. They are different
audiences in practice (inbox, locked phone, someone already on the portal), so
none of them is redundant.

Covered by 4 new regression checks (`54 / 54`), which register a resident and a
dual-role device, fire an urgent broadcast, assert **both** were attempted, and
unsubscribe afterwards.


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
Regression suite **54 / 54** after each change. Web bundle builds clean.

Checks run against the live system rather than assumed:

```
head of family  → sees "Miguel Potolin (13)"
non-head        → sees nobody
cross-household → BLOCKED
module revoked  → /masterlist 403, /complaints/queue 200, same token
dual role       → staff module revoked; resident side still 200, staff side 403
urgent push     → 2 devices registered (1 resident, 1 dual-role), both attempted
push payload    → VAPID-signed, aes128gcm, decrypts to the fields sw.js reads
urgent push     → "0 delivered, 1 dead endpoint(s) pruned"   (synthetic endpoint)
login + 2FA     → password → challenge → emailed code → token
```

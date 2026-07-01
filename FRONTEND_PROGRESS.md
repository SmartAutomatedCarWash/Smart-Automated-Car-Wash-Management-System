# Frontend Progress

## 2026-06-30

- Applied `autowash-frontend-ui` workflow for the customer experience priority tasks.
- Review popup: completion dialog now shows 1-5 star rating and feedback textarea in the same popup when a customer wash session reaches `COMPLETED`.
- Live booking session: shared customer live-session card now supports progress state, countdown timer, and estimated or actual milestone times.
- Customer home: active booking card displays live progress with estimated milestones from booking date/time.
- Customer wash tracking: active wash session now displays the same live progress card using backend timestamps (`createdAt`, `queuedAt`, `checkedInAt`, `startedAt`, `completedAt`) when available.
- Active wash tracking query now polls every 15 seconds until the session is completed.
- Verification: `npm run build` in `autowash-frontend` passed.

## 2026-06-30 Local Demo Fix

- Fixed local H2 backend schema drift that broke `/customer/bookings/new`.
- Added missing `user_oauth_accounts` table and `services.image_url` column to `autowash-backend/src/main/resources/db/local/schema-h2.sql`.
- Restarted backend local profile so H2 recreated demo data from `schema-h2.sql` and `data-h2.sql`.
- Verified checkout dependencies with customer token: `/api/v1/packages`, `/api/v1/services`, `/api/v1/combos/available`, `/api/v1/customers/vehicles`, and `/api/v1/users/profile` all return `200`.

## 2026-07-01 Loyalty Tier Polish

- Added tier-aware metallic styling for the customer loyalty progress card. `MEMBER`/`BRONZE` now renders as a copper/bronze metal finish, with shimmer, sparkle, animated border glow, and matching progress fill.
- Updated the customer header profile button to use the same tier-aware metallic surface, avatar ring, text color, moving gloss, and animated border.
- Verification: `npm run build` in `autowash-frontend` passed; `/customer/loyalty` returned `200` locally.
- Refined the loyalty tier card after feedback: removed rotating/busy motion, softened the metallic surface, made the progress bar clearer, and changed the border to a single elegant running-light effect.
- Verification: `npm run build` in `autowash-frontend` passed again; `/customer/loyalty` returned `200` locally.
- Applied the provided minimal premium progress-bar direction: cream track, bronze/gold-toned fill for `MEMBER`/`BRONZE`, slow shimmer, glowing fill endpoint, and matching lightweight profile button treatment.
- After production build invalidated dev chunks, cleaned `.next`, restarted `npm run dev -- -p 3000`, and verified `/customer/loyalty` returns `200`.
- Darkened the `MEMBER`/`BRONZE` metallic palette, added subtle premium sparkle to the loyalty tier card, and adjusted the profile button to stay visually static with only sparkle plus a gold running border glow.
- Verification: `npm run build` passed; cleaned `.next`, restarted local frontend, and verified `/customer/loyalty` returns `200`.
- Synchronized the customer profile button with the loyalty tier card: same bronze metallic surface, same subtle sparkle layer, same 135-degree highlight overlay, stronger avatar bronze ring, and matching running border glow.
- Verification: `npm run build` passed; cleaned `.next`, restarted local frontend, and verified `/customer/loyalty` returns `200`.
- Strengthened the profile button background to better match the loyalty card: deeper bronze base, darker right-side panel, matching diagonal gloss, sparkle, and gold running-border glow.
- Verification: `npm run build` passed; cleaned `.next`, restarted local frontend, and verified `/customer/loyalty` returns `200`.
- Restored the profile button to a compact original-like size while keeping it visually synced to the loyalty card background rather than the progress bar: bronze surface, card-style 135-degree overlay, subtle sparkle, and running border glow.
- Verification: `npm run build` passed; cleaned `.next`, restarted local frontend, and verified `/customer/loyalty` returns `200`.
- Made the customer profile button more compact again (`13rem` desktop width, smaller avatar) and removed the running border/gloss animation. It now uses the loyalty card bronze background with a static soft highlight and subtle premium shadow.
- Verification: `npm run build` passed; cleaned `.next`, restarted local frontend, and verified `/customer/home` returns `200`.
- Further compacted the customer profile button (`11.75rem` desktop width, 28px avatar) and replaced moving effects with subtle static sparkles plus a soft premium glow.
- Verification: `npm run build` passed; cleaned `.next`, restarted local frontend, and verified `/customer/home` returns `200`.

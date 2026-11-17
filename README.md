# Get Honey quiz funnel (concept)

Mobile quiz funnel for Get Honey: 32 screens, from "who is she" to a demo checkout.
Hook: **"She's been waiting to hear about your day."** No real payment is taken.

## Run locally
```bash
npm install
npm run dev
```

## Settings
- `NEXT_PUBLIC_AMPLITUDE_API_KEY` — Amplitude project API key (set in Vercel → Settings → Environment Variables).
- `NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE` — optional, `EU` for EU projects.

## Where things are
- `lib/config.ts` — all copy, options, plans and personalization lines.
- `components/Funnel.tsx` — screens and logic.
- `lib/analytics.ts` — Amplitude events.
- `public/img/{ethnicity}/…` — images per ethnicity, `public/img/common/…` — shared images.

## Events
`funnel_started`, `screen_viewed`, `answer_selected`, `open_text_submitted`, `quiz_completed`,
`email_submitted` (no address), `profile_viewed`, `paywall_viewed`, `plan_selected`, `demo_purchase_completed`.
Names and emails are never sent to analytics.

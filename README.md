# Amphora Boat website

The guest website (English, German, Croatian) plus an owner page at `/owner/`
where you mark booked days and change prices. One small Node app, no dependencies.

## Deploy on Coolify
1. New resource → this repository (or upload the folder) → build pack **Dockerfile**.
2. Environment variables:
   - `OWNER_PASSWORD`: your owner page password. Use at least 10 characters.
   - `SESSION_SECRET`: any long random string (keeps you logged in after restarts).
3. Persistent storage: mount a volume at **`/data`**. Your calendar and prices live in `/data/data.json`.
   Without the volume, every redeploy wipes them.
4. Port **3000**. Point `amphoraboat.com` at the app and turn on HTTPS.

## Owner page
Go to `amphoraboat.com/owner/` and log in.
- **Calendar:** tap a day, then mark Morning (8:00 to 13:00) and Afternoon (14:00 to 19:00) as booked or free,
  or use "Book whole day". Guests see it immediately. A full day can only be requested when both halves are free.
- **Prices:** change full day and half day and save. Every price on the site updates (headline, price cards,
  booking form, pinned bar). The page text looks exactly the same, only the number changes.
- Five wrong passwords lock the login for 15 minutes. Sessions last 30 days.
- Remember to block days that sell on GetYourGuide, Click&Boat and other platforms here too.

## Changing text
All copy lives in `build/i18n.mjs`; reviews in `build/reviews.mjs`. Edit, then run `npm run build`.
In the copy, `{full}` and `{half}` stand for the current prices. `build/prices.mjs` only sets the starting prices.

## Contacts
In `public/site.js` → `CONFIG`: WhatsApp and phone +385 99 610 8522, email amphorayacht@gmail.com.
Add `instagram` to show it in the footer.

## Photos
Replace files in `public/assets/` keeping the names. Steps 4 (Pučišća) and 7 (Postira or Splitska)
still need photos: add `step4.webp` / `step7.webp` and set them in `CH_IMG` in `build/build.mjs`.

## Tests
`npm test` checks login, rate limiting, booking, prices and file safety.

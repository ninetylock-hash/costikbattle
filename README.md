# Costik Battle 2.0

Install: `npm install`, then `npm start`.

Render Build Command: `npm install`; Start Command: `npm start`.
Environment: `BASE_URL=https://costikbattle.onrender.com`, `NODE_ENV=production`, `SESSION_SECRET` (long random value), `STEAM_API_KEY`.

Included: 20 virtual cases, Steam OpenID login, server-side case drops, virtual inventory, selling for virtual coins, proportional server-side upgrades. Skin pictures are fetched from the community CSGO-API dataset when matching names exist.

Important: case/item values in this MVP are sample virtual values, not live Steam Market quotes. Items cannot be withdrawn or traded. JSON user storage is ephemeral on Render free instances; data may be lost on restart/redeploy. Use persistent database/storage before treating inventories as durable.

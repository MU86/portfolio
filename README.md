# pixel-portfolio

A personal portfolio with a pixel-art avatar on the left and a Gemini-powered chat interface on the right. Built with Next.js 14 (App Router) and TypeScript.

![stack](https://img.shields.io/badge/next-14-black) ![stack](https://img.shields.io/badge/gemini-2.0--flash-blue)

## what's inside

- **Left panel** — a hand-authored 16×24 pixel sprite of "you," animated with idle-breathing and occasional blinks. Pure SVG, no image assets, rendered crisp-edges.
- **Right panel** — a terminal-styled chat UI that talks to Gemini via a server route. Maintains conversation history, shows a typing indicator, and includes suggestion chips for first-time visitors.
- **Aesthetic** — retro-CRT: phosphor green on deep charcoal, scanlines, subtle grain, VT323 + Press Start 2P + JetBrains Mono.

## setup

```bash
# 1. install
npm install

# 2. add your Gemini API key
cp .env.local.example .env.local
# then open .env.local and paste your key from https://aistudio.google.com/app/apikey

# 3. run
npm run dev
```

Open http://localhost:3000.

## make it yours

Three spots to personalize:

1. **`app/page.tsx`** — change `YOUR NAME` and the subtitle under `.name-card`, plus the stat readout.
2. **`app/api/chat/route.ts`** — edit `SYSTEM_PROMPT`. This is the persona Gemini uses. The more specific you are (real projects, real voice, real taste), the better the virtual-you sounds.
3. **`components/PixelCharacter.tsx`** — the `FRAME_A` / `FRAME_B` / `FRAME_C` arrays are editable pixel grids. Each number is a palette index (see `PALETTE` at the top). Tweak hair color, outfit, etc. — or rebuild the sprite entirely. It's 16 wide × 24 tall, and each row is one horizontal line.

## notes

- The API key is only read on the server (in the route handler), never shipped to the client.
- Gemini model is set to `gemini-2.0-flash` — fast and cheap. Swap to `gemini-2.5-pro` in `route.ts` if you want more depth.
- History is kept client-side and sent with each request; there's no database. If you want persistence across refreshes, wire up `localStorage` in `components/Chat.tsx`.

## deploy

Works on Vercel out of the box. Add `GEMINI_API_KEY` as an environment variable in your project settings and push.

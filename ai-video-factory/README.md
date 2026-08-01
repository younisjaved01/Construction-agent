# AI Video Factory

A provider-agnostic, cost-optimized pipeline for producing faceless videos at
scale. Every AI model sits behind a common interface and is chosen by a **cost
router** that always picks the cheapest provider meeting the required quality —
so you can start on pay-per-use APIs and migrate to a local GPU with a config
change, never a rewrite.

> **Status: Milestone 6 — Packaging.** The full pipeline runs offline end-to-end:
> story → prompts → character → keyframes → clips → voice → music → **editor
> (FFmpeg) → thumbnail + platform metadata**. Everything routes through the cost
> router and content-addressed cache, so repeats are $0. Auto-posting/analytics
> land in later milestones.

## Architecture (M1)

```
config/providers.yaml   ← the only place vendors are declared
        │
   ProviderRegistry ──lazy-loads──▶ Adapters (mock, fal, …)  ← swappable vendors
        │
   CostRouter  ← picks the cheapest enabled provider that meets the quality tier
        │
   pipeline/generate.ts  ← route → hash → cache-check → generate → store
        │
   AssetStore (content-addressed)  ← identical request = cache hit = $0
```

**Design rules:** no hardcoded vendors; swapping a model is a YAML edit; every
output is content-addressed so nothing is generated — or paid for — twice.

## Quick start (offline, zero infra)

```bash
npm install
# generate a keyframe with the offline mock provider (no API key needed):
npm run factory -- image "a cozy cottage at golden hour, cinematic" --tier draft
# run it again → instant CACHE HIT at $0:
npm run factory -- image "a cozy cottage at golden hour, cinematic" --tier draft
npm test           # unit tests (hash + router)
npm run typecheck
```

Assets land in `./data/assets/` (content-addressed).

## Enabling real providers

1. Put keys in `.env` (copy from `.env.example`) — e.g. `FAL_KEY=...`.
2. Flip `enabled: true` on the provider you want in `config/providers.yaml`.
3. That's it — the router now considers it. To force one model, pass
   `--provider <id>`.

## Full stack (for later milestones)

```bash
cp .env.example .env
docker compose up -d      # Postgres, Redis, MinIO, n8n
npm run prisma:migrate
```

## How it stays cheap

- **Cost router** always chooses the cheapest model that clears the quality bar.
- **Content-addressed cache** makes repeats free.
- **Local-first:** enable a `cost_per_unit: 0` self-hosted provider (ComfyUI /
  local TTS) and it automatically wins over paid APIs.
- **Reusable characters** (Character Manager, M2) avoid re-generating identities.

## Layout

```
config/providers.yaml     provider registry (the vendor catalog)
prisma/schema.prisma      Postgres data model
src/
  core/                   domain types + logger
  providers/
    registry.ts           loads + validates the catalog, lazy-loads adapters
    router.ts             the cost optimizer
    adapters/             one file per vendor (mock, fal, …)
  cache/                  content-addressed hashing + asset store
  pipeline/generate.ts    the single generation choke point
  cli.ts                  run generations from the terminal
docker-compose.yml        self-hosted infra
```

## Roadmap

✅ M1 Foundation · ✅ M2 Story/Prompt/Character · ✅ M3 Image+Video generation ·
✅ M4 Voice+Music · ✅ M5 Editor (FFmpeg) · ✅ M6 Thumbnails+metadata ·
⬜ M7 Auto-posting · ⬜ M8 Analytics+feedback · ⬜ M9 Hardening.

### M6 — Packaging

```
factory produce "topic" --thumbnail --metadata     # cover image + platform copy
```

- **Thumbnail Generator** (`src/packaging/thumbnail.ts`) — a bold, high-CTR,
  text-free cover image through the same cheapest-sufficient image route; reuses
  the character reference so the thumbnail matches the video's identity.
  `--thumb-aspect vertical|wide` for Shorts/Reels vs YouTube.
- **Metadata Generator** (`src/packaging/metadata.ts`) — validated, platform-ready
  publishing copy (title, SEO description, tags, and native YouTube/TikTok/
  Instagram captions with hashtags), ready for the M7 auto-poster. Cached per
  story, so identical input costs $0.

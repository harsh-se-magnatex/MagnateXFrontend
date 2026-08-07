# Exporting production content into How-It-Looks

## Captions

**You do not copy captions by hand.**  
Each scheduled post’s Firestore field `message` is the full caption. The export script maps:

`scheduledPosts.message` → `ShowcasePost.caption`

That text is what appears under the post in the Instagram / Facebook / LinkedIn mockups.

## Brands

Brands are registered in  
[`backend/apps/api/src/scripts/how-it-looks-brands.ts`](../../../../backend/apps/api/src/scripts/how-it-looks-brands.ts).

| id | label | default uid |
|---|---|---|
| `magnate-regalia` | Magnate Regalia | set in registry |
| `sunglasses` | SunGlasses | set `exportUid` or pass `--uid=` |

List brands:

```bash
pnpm export-how-it-looks -- --list-brands
```

## Automated export (preferred)

From `backend/apps/api` (uses that app’s `.env` Firebase credentials):

```bash
# Resolve uid from registry
pnpm export-how-it-looks -- --brand=magnate-regalia

# Override / set uid for a brand that has no registry uid yet
pnpm export-how-it-looks -- --brand=sunglasses --uid=<firestoreUid>

# Optional date range
pnpm export-how-it-looks -- --brand=sunglasses --uid=<firestoreUid> --from=2026-07-01 --to=2026-07-31
```

If `--brand` is omitted, it defaults to `magnate-regalia`.

What the script does:

1. Resolves brand from the registry (+ optional `--uid` override)
2. Reads `users/{uid}` for brand name (`profile.businessName`)
3. Reads all `scheduledPosts` (optional date filter)
4. Also reads ready docs from `users/{uid}/videoGeneration` (gallery videos that were never scheduled)
5. Downloads image / video / poster / carousel slides into  
   `frontend/public/landing/how-it-looks/{brand}/{platform}/{postId}/...`
6. Writes `frontend/components/landing/social-preview/brands/{brand}.generated.ts`
7. Does **not** overwrite other brands

## Adding a new brand later

1. Add an entry to `backend/apps/api/src/scripts/how-it-looks-brands.ts`
2. Run `pnpm export-how-it-looks -- --brand=<id>`
3. Add the same `id` to `frontend/.../showcase-brands.ts` (`SHOWCASE_BRAND_OPTIONS`)
4. Import the new `brands/<id>.generated.ts` in `showcase-data.ts` and register it in `SHOWCASES`

## Manual layout (only if you skip the script)

```
frontend/public/landing/how-it-looks/
  {brand}/
    {instagram|facebook|linkedin}/
      {postId}/
        image.jpg | video.mp4 + poster.jpg | slide-0.jpg …
```

Then wire paths + **caption from `message`** into  
`frontend/components/landing/social-preview/brands/{brand}.generated.ts`.

## Verify

1. Open `/how-it-looks`
2. Use **Choose a brand** — Magnate Regalia / SunGlasses
3. Switch platforms — grids show that brand’s posts
4. Open a post — caption should match the production `message`

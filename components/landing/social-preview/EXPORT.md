# Exporting production content into How-It-Looks

## Captions

**You do not copy captions by hand.**  
Each scheduled post’s Firestore field `message` is the full caption. The export script maps:

`scheduledPosts.message` → `ShowcasePost.caption`

That text is what appears under the post in the Instagram / Facebook / LinkedIn mockups.

## Automated export (preferred)

From `backend/apps/api` (uses that app’s `.env` Firebase credentials):

```bash
pnpm export-how-it-looks -- --uid=i6LjOfYbqXTs29XlQX4p9Man0kH3
```

Optional date range:

```bash
pnpm export-how-it-looks -- --uid=i6LjOfYbqXTs29XlQX4p9Man0kH3 --from=2026-07-01 --to=2026-07-31
```

What the script does:

1. Reads `users/{uid}` for brand name (`profile.businessName`)
2. Reads all `scheduledPosts` (optional date filter)
3. Downloads image / video / poster / carousel slides into  
   `frontend/public/landing/how-it-looks/{platform}/{postId}/...`
4. Writes `showcase-posts.generated.ts` with captions + local media paths
5. The page reads that file via [`showcase-data.ts`](./showcase-data.ts)

## Manual layout (only if you skip the script)

```
frontend/public/landing/how-it-looks/
  {instagram|facebook|linkedin}/
    {postId}/
      image.jpg | video.mp4 + poster.jpg | slide-0.jpg …
```

Then wire paths + **caption from `message`** into `showcase-posts.generated.ts`.

## Verify

1. Open `/how-it-looks`
2. Switch platforms — grids show exported posts
3. Open a post — caption should match the production `message`

# How-It-Looks media

Place exported production assets here (multi-brand):

```
{brand}/{instagram|facebook|linkedin}/{postId}/image.jpg
{brand}/{instagram|facebook|linkedin}/{postId}/video.mp4
{brand}/{instagram|facebook|linkedin}/{postId}/poster.jpg
{brand}/{instagram|facebook|linkedin}/{postId}/slide-N.jpg
```

Examples: `magnate-regalia`, `sunglasses`.

Legacy flat layout (`{platform}/{postId}/…` at this root) is still used by the current single-brand page until multi-brand UI lands.

`sample-video.mp4` is a scaffold asset for the interactive preview until real export lands.
See `frontend/components/landing/social-preview/EXPORT.md`.

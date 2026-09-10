# PAPA · 拍拍蜜桃

A small Chinese-language peach stress-relief game. Click to pat, hold and drag to knead, or focus the toy and press Space / Enter. Adjust softness, mute synthesized audio, or reset the session score.

The generated peach artwork is deformed using a WebGL mesh with localized damped impulses. Impacts are bounded, fade to rest, and stop rendering once settled. Touch input, keyboard interaction, reduced-motion preferences, and an image fallback are supported. Scores stay in the current session.

## Development

- `npm install`
- `npm run dev`
- `npm run build`
- `npx tsc --noEmit`
- `node --experimental-strip-types --test lib/soft-body.test.ts`

The optional feature-detected WebMCP action `pat_peach` accepts `{ "side": "left" }` or `{ "side": "right" }`. A supported browser validation context was unavailable during implementation, so its live registration and execution have not been verified. Browser visual and interaction QA were not requested; validation covered type checking, the production build, HTTP rendering, and the deformation behavior tests.

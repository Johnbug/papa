# PAPA · 拍拍蜜桃

A small Chinese-language stress-relief game. The current visual uses an adult fashion mannequin in opaque pink shorts and a photoreal transparent hand pointer. Click and release to pat, hold or drag to knead, or focus the toy and press Space / Enter. Pointer down never counts or plays a slap; a movement beyond 8 pixels or a hold of 180 milliseconds enters kneading until release. Adjust softness, mute synthesized audio, or reset the session score.

The generated artwork is deformed using a WebGL mesh with localized damped impulses. Impacts are bounded, fade to rest, and stop rendering once settled. Touch input, keyboard interaction, reduced-motion preferences, and an image fallback are supported. Scores stay in the current session.

## Custom images

Use “上传自己的图片” to choose a JPG, PNG, or WebP (up to 20 MB and 40 megapixels). The local editor supports cover cropping with drag/zoom and an elliptical interaction region, adjustable through dragging or keyboard-accessible sliders. Apply the image to play, re-edit it using the retained original and framing, or restore the default model. Changing images resets the score. Deformation and kneading follow the selected region and leave the background fixed.

Files are decoded and cropped entirely in the browser, with no upload requests or browser persistence. Original and rendered object URLs are released on replacement, restoration, cancellation, or unmount. Refreshing clears the custom image. Unsupported or undecodable files preserve the existing playable image.

## Development

- `npm install`
- `npm run dev`
- `npm run build`
- `npx tsc --noEmit`
- `node --experimental-strip-types --test lib/*.test.ts`

## Vercel deployment

The repository includes a separate static Vite entry that reuses the game, image editor, styles, and assets. The original Vinext / Cloudflare build remains available through `npm run build`.

1. In Vercel, choose **Add New → Project** and import `Johnbug/papa`.
2. Keep the root directory at the repository root. The checked-in `vercel.json` sets the Vite framework, install command `npm ci`, build command `npm run build:vercel`, and output directory `dist-vercel`.
3. Deploy. No environment variables, database, or server-side image storage are required. After connecting the repository, pushes to the production branch `main` trigger new deployments.

If importing a project that already has manual build overrides, align them with the settings above. This is a static Vite deployment, not a Next.js framework deployment.

To verify the static build locally:

```sh
npm run build:vercel
npm run preview:vercel
```

Use `npm run dev:vercel` for the Vite development server. User-selected images remain entirely in the browser and are never included in deployment output.

The optional feature-detected WebMCP action `pat_peach` accepts `{ "side": "left" }` or `{ "side": "right" }`. A supported browser validation context was unavailable during implementation, so its live registration and execution have not been verified. Browser visual and interaction QA were not requested; validation covered type checking, the production build, HTTP rendering, and the deformation behavior tests.

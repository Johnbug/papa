# PAPA · 拍拍蜜桃

A small stress-relief game in Chinese, English, and Japanese. Each visit starts with a soft peach and a photoreal transparent hand pointer. A compact three-step guide invites users to try the peach, switch to a full-length fictional adult character in opaque blue jeans and a cream shirt, then upload their own image. Switching is always explicit, and users can return to the peach at any time. Click and release to pat, hold or drag to knead, or focus the toy and press Space / Enter. Pointer down never counts or plays a slap; a movement beyond 8 pixels or a hold of 180 milliseconds enters kneading until release. Adjust softness, mute synthesized audio, or reset the session score.

The generated artwork is deformed using a WebGL mesh with localized damped impulses. Impacts are bounded, fade to rest, and stop rendering once settled. Touch input, keyboard interaction, reduced-motion preferences, and an image fallback are supported. Scores stay in the current session.

## Custom images

After choosing “试试臀部图片”, use “上传自己的图片” to choose a JPG, PNG, or WebP (up to 20 MB and 40 megapixels). The local editor supports cover cropping with drag/zoom and an elliptical interaction region, adjustable through dragging or keyboard-accessible sliders. Apply the image to play, re-edit it using the retained original and framing, or return to either built-in image. Changing images resets the score. Deformation and kneading follow the selected region and leave the background fixed.

Files are decoded and cropped entirely in the browser, with no upload requests or browser persistence. Original and rendered object URLs are released on replacement, restoration, cancellation, or unmount. Refreshing clears the custom image. Only language and analytics preferences are saved locally; images are never persisted. Unsupported or undecodable files preserve the existing playable image.

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

## Languages and release readiness

The header switches between 中文, English, and 日本語. Language resolution uses the `lang` query parameter (`zh`, `en`, or `ja`), then a saved manual choice, then browser languages, with English as the unsupported-language fallback. Changing language preserves the current image and score and updates `html.lang`, the page title, and description. UI copy, editor instructions, error messages, and accessible labels are localized. Static crawler metadata remains Chinese; dedicated localized SEO pages are not yet configured.

The footer includes localized privacy/use information and an analytics opt-out. Language and analytics preferences are stored in the browser when available. Opt-out blocks future custom events and the SDK's page/custom event middleware; it does not retract previously sent events or prevent downloading the analytics script itself. Storage failures fall back to the current page preference, and successful persisted choices are shared across tabs.

See [the release checklist](docs/release-checklist.md) for completed changes and the production/device checks still required.

### Vercel Web Analytics

The Vercel React entry includes `@vercel/analytics/react` for visitor and page-view statistics. Enable **Web Analytics** in the Vercel project dashboard, deploy the latest commit, and visit the site to begin collecting data. No analytics keys or additional environment variables are needed.

Analytics is initialized only in the Vercel entry. Custom events require a Vercel Pro or Enterprise plan; see [Vercel custom events](https://vercel.com/docs/analytics/custom-events). After deployment, open the project's Web Analytics events panel to inspect the following events. No uploaded images, filenames, blob URLs, crop coordinates, or error messages are included. Image handling remains local to the browser.

| Event | Trigger / properties |
| --- | --- |
| `toy_slap` | Each successful pat; image category and input method. Pointer down, misses, holds, drags, and cancelled gestures do not count as pats. |
| `toy_knead` | Once on release of a completed hold/drag; image category and input method. |
| `image_change` | Switching images; `from` / `to` categories (`peach`, `shorts`, `custom`; `shorts` is the historical analytics category for the built-in model, now wearing jeans). Includes applying a custom image. |
| `upload_click` | Opening a file picker; current image category and `guide` / `editor` location. |
| `upload_selected` | Selecting a file; `accepted` indicates basic type/size validation, not decoding success. Cancelling the file picker produces no selection event. |
| `editor_open` | Successfully decoding an image into the editor; source `upload` / `adjust`. Replacing an image inside the editor also emits this event. |
| `editor_action` | Adjust button, image/region tab changes, reset crop, or apply button. |
| `image_applied` | Successfully applying an image; source `upload` / `adjust`. |
| `editor_close` | Closing the editor; outcome `applied` / `cancelled`. |
| `image_error` | Validation, decoding, or apply failure; fixed step name only. |
| `sound_toggle` | New enabled state and `header` / `controls` location. |
| `softness_change` | Committed slider value; does not emit for every drag movement. |
| `game_reset` | Explicit reset button; current image category. Automatic resets during image changes do not emit this event. |
| `home_click` | Brand/home link; current image category. |
| `language_change` | Manual language change; fixed `from` / `to` language codes. |

Each completed pat or knead emits one event without sampling. Input methods distinguish mouse, touch, pen, keyboard, and the optional agent action, so automated actions can be filtered out. Analytics errors are isolated from gameplay. Local Vercel development uses the SDK's debug mode; production collection and dashboard delivery still need verification on the deployed project.

The optional feature-detected WebMCP action `pat_peach` accepts `{ "side": "left" }` or `{ "side": "right" }`. A supported browser validation context was unavailable during implementation, so its live registration and execution have not been verified. Browser visual and interaction QA were not requested; validation covered type checking, the production build, HTTP rendering, and the deformation behavior tests.

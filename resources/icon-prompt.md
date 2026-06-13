# App Icon Prompt — Belknap Tracker (hand-off to Gemini)

Use this to have Gemini generate a new app icon. Copy the **Prompt** block into
Gemini, then read **Deliverables** for the files to ask for and **After you get
the art** for how it goes into the build.

---

## Context (what the app is)

Belknap Tracker is a hiking app for "red-lining" the Belknap Range in New
Hampshire — hiking every sanctioned trail. "Red-lining" is the tradition of
drawing a **red line** on a map over each trail you complete, so a bold red
trail line is the brand's signature element, not just decoration.

## The prompt (copy this into Gemini)

> Design a modern, flat **vector app icon** for a hiking-trail tracking app
> called "Belknap Tracker."
>
> **Concept:** a bold, minimal silhouette of a layered mountain ridgeline (the
> Belknap Range) built from clean geometric shapes, with a single confident
> **red trail line that switchbacks up and crests the highest peak**. The red
> line is the hero — make it thick, smooth, and instantly readable, ending in a
> small round summit marker where it tops the peak. Two or three overlapping
> mountain forms give depth; the tallest is centered.
>
> **Style:** flat 2D, crisp clean edges, simple and iconic, Material-design
> visual weight. High contrast. No text or lettering anywhere. No photorealism,
> no 3D bevels, no drop shadows, no busy texture, no thin hairlines that would
> vanish when shrunk. A subtle flat color background is fine; avoid heavy
> gradients that band.
>
> **Palette:** signature trail line in red (#DC2626); mountain peaks in white or
> very light cream; deep twilight-blue background (around #0B2A4A to #14375E);
> optional tiny accent dot in green (#22C55E) for the summit marker.
>
> **Composition for an Android adaptive icon:** centered, with generous padding
> — keep ALL key art inside the central ~66% of the square (the outer ~17% on
> every side gets cropped by round/squircle masks). Balanced, symmetrical-ish,
> reads clearly as a single shape at 48×48 px.
>
> **Format:** 1024×1024 px, square. Produce a few distinct variations.

## Variations to ask for

Ask Gemini for 3–4 takes so there's a choice:

1. **Red line over a single hero peak** (cleanest, most iconic).
2. **Layered ridgeline** with the red line tracing the full ridge.
3. **Topographic** twist — faint concentric contour lines behind the peak with
   the red trail crossing them.
4. **Roundel** — the scene inside an implied circle, for the round-mask look.

Then: "Give me the winner as the deliverables below."

## Deliverables (ask Gemini for these exact outputs)

Android uses **adaptive icons** = a foreground layer + a background layer the OS
masks into different shapes. So please generate:

1. **`icon.png`** — 1024×1024, the full flattened icon (background + art),key art within the central 66%. *(Required — this alone is enough to ship.)*
1. **`icon-foreground.png`** — 1024×1024, **transparent background**, just the mountains + red line, centered with ~25% padding on all sides.
2. **Background color** — the single hex used behind the foreground. A flat color is better than an image for adaptive icons.

PNG, no transparency on `icon.png`, sRGB.

## Do / Don't (Android icon best practice)

- **Do** keep it dead simple — one clear idea, readable at launcher size (48dp).
- **Do** make the red line the boldest element; it's the brand.
- **Do** respect the safe zone (central 66%); masks crop the edges.
- **Don't** put any text in the icon.
- **Don't** rely on fine detail, thin strokes, or edge content — all lost when
  masked and scaled down.
- **Don't** add baked-in rounded corners or shadows; the OS applies the mask.

As well - please give me the color palette in hex

## Color palette

| Name | Hex | Use |
|------|-----|-----|
| Trail Red | #DC2626 | the red-line trail (hero) |
| Twilight Blue | #0B2A4A – #14375E | background |
| White / Cream | #FFFFFF / #F5F2EA | mountain peaks |
| Summit Green | #22C55E | optional summit dot |

(Brand blue #3B82F6 is the current placeholder background; the twilight blue
above is a more distinctive, attractive alternative — let Gemini try both.)

## After you get the art

Drop the files in `resources/` and regenerate all platform sizes:

```bash
# replace resources/icon.png (and optionally icon-foreground.png)
npx @capacitor/assets generate \
  --iconBackgroundColor '#0B2A4A' \
  --splashBackgroundColor '#0B2A4A'
npx cap sync android
```

Then rebuild the APK and check the adaptive icon on the launcher (round,
squircle, and rounded-square masks all crop differently). See `resources/README.md`
for the full asset pipeline.

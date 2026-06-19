# WNDR — Dev Context

Project-specific values for AI-assisted development. Reference this at the start of new chats.

---

## Project Overview

**WNDR Creative Studio** marketing website built in **Webflow**, with a custom JS/SCSS layer on top for interactions and animations. The Webflow MCP bridge and Figma MCP are used together to build components.

---

## Workflow

- **Scope per chat**: One feature/component per chat — do not start building unless explicitly asked.
- **Chat naming**: `[type]-[subject]` (e.g. `component-faq`, `component-navbar`). Type is usually `component`.
- **Feature flags**: Keep the default stack enabled (`pageTransitions`, `navbar`, `scrollBehaviour`, `breakpoints`, `utilities`, `customFeature` — see `src/config.js`). Enable additional template features only when a chat requires them.
- **Webflow MCP**: Only use when explicitly requested — do not push to Designer proactively.
- **Dev mode**: `main.min.js` with `dev-mode` is already in Webflow custom code. Netlify: `https://wf-wndr.netlify.app`

---

## Tools & MCPs

- **Webflow MCP bridge**: Use **only when explicitly requested**. When needed: Designer tab must be open, active, and in the foreground. Webflow site: `wndr-creative-studio`
- **Figma MCP**: File is **260427 WNDR Site**. Use `get_design_context` + `get_screenshot` together. Dev notes for sections are placed next to frames in Figma.
- **No CSS shorthand** in Webflow style calls — always use longhand (`margin-top`, `padding-left`, etc.)
- Reuse existing Webflow variables and styles wherever logical. Only create new ones when truly necessary.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Layout & styles | Webflow (via MCP) |
| Custom JS | Vanilla ES modules in `src/features/` |
| Custom CSS | SCSS in `src/scss/components/` |
| Animations | GSAP + ScrollTrigger (`window.gsap`) |
| Page transitions | Barba.js |
| Build | Vite (`npm run dev` = HTTP localhost; `npm run dev:https` = HTTPS opt-in) |

### Dev-mode protocol (HTTP vs HTTPS)

The Webflow `<script>` carries the protocol opt-in:

```html
<!-- HTTP localhost (default) -->
<script defer src="https://wf-wndr.netlify.app/main.min.js" dev-mode></script>

<!-- HTTPS localhost (use when staging is HTTPS + Safari blocks mixed content) -->
<script defer src="https://wf-wndr.netlify.app/main.min.js" dev-mode https-mode></script>
```

Run the matching Vite command:

- `npm run dev` → `http://localhost:3015` (no certificate prompts)
- `npm run dev:https` → `https://localhost:3015` (accept the self-signed cert in the browser once: open `https://localhost:3015` directly, click through, then reload Webflow)

Browsers reject `fetch()` to self-signed `https://localhost` with no trust prompt, so the loader uses `<script type="module">` injection (which uses the same TLS stack as normal Vite loads) — that path works in both modes.

---

## Naming Convention

Finsweet **Client First** strategy throughout:

- Sections: `section_[name]` (e.g. `section_services`)
- Components: `[name]_component`
- Child elements: `[name]_[element]` (e.g. `services_list-header-item`)
- State classes: `is-active`, `is-open`, `is-visible` (always combo classes, never standalone)
- JS hooks: **data-attributes preferred** (e.g. `data-services-item="0"`), with hardcoded fallbacks in JS
- Padding wrappers follow Client First: `padding-global` > `padding-section-large` > component

---

## JS Feature Pattern

Every feature lives in `src/features/[feature-name].js` and follows this exact boilerplate:

```js
function initFeatureName(container) {
  container = container || document;

  const items = container.querySelectorAll('[data-feature-name]');
  if (!items.length) return;

  // feature logic here
}

function featureName() {
  document.addEventListener('barba:afterEnter', (e) => {
    initFeatureName(e.detail.container);
  });
}

export default featureName;
```

See `src/features/custom-feature.js` for the annotated boilerplate reference.

---

## Adding a New Feature — Checklist

1. Create `src/features/[feature-name].js` using the pattern above
2. Create `src/scss/components/_[feature-name].scss` for any custom CSS
3. Add `@use 'components/[feature-name]';` to `src/scss/app.scss`
4. Add `featureName: true` to `INCLUDE_FEATURES` in `src/config.js`
5. Add `import featureName from './features/[feature-name]';` to `src/main.js`
6. Add `ACTIVE_FEATURES.featureName && featureName();` inside `initFeatures()` in `src/main.js`

---

## Feature Flag System

Features can be toggled in two ways:

- `src/config.js` — default flags (`INCLUDE_FEATURES` object)
- Script tag attributes — override at the HTML level: `<script src="main.min.js" featureName></script>`

If no attributes are present on the script tag, `config.js` values are used.

---

## SCSS Structure

```
src/scss/
  app.scss                   ← imports all component files
  components/
    _services.scss
    _animations.scss
    _breakpoints.scss
    _lottie.scss
    ...
```

Custom CSS that can't be done in Webflow UI goes in the relevant `_[component].scss` file.

---

## Key CSS Patterns

- **`overflow: clip`** instead of `overflow: hidden` when sticky children are involved — `clip` doesn't create a scroll container so `position: sticky` on children is preserved
- **SVG gradient fills**: Define a hidden inline SVG with `<defs>` as a Webflow Embed element. Use `width:0; height:0; display:block` — **do not use `overflow: hidden`** (breaks `url(#id)` gradient references in some browsers). Reference via `fill: url(#gradient-id)` in SCSS. Guard with `html:not(.wf-design-mode)` to prevent applying in Webflow Designer.

---

## Reduced Motion

All components with animations/transitions **must** respect `prefers-reduced-motion: reduce`. When the user has reduced motion enabled:

- Skip all animation — no crossfade, no slide, no stagger. Just an instant state change.
- Check via `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and override the transition to an immediate swap (e.g. a `'none'` transition that uses `gsap.set` instead of `gsap.to`).
- This applies to every feature: testimonials, page transitions, scroll animations, etc.

---

## Developer Preferences

- Data-attribute approach for JS hooks — with hardcoded fallbacks in the script
- Avoid JS injection of DOM elements when a native Webflow Embed can achieve the same result
- Keep custom CSS minimal — prefer Webflow styles/variables; only use SCSS for things the UI can't do
- No hover states until explicitly requested
- Always check Figma dev notes alongside the frame design — they contain implementation hints

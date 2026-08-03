# Browser extension blueprint

A starting layer sequence for `hedgehog-core-design` Step 3 on the
browser extension system shape. Adapt it for the project at hand — the
adaptation points below are expected, not exceptions — and record what
changed in `core-design.md`'s rationale.

```
messaging  — the typed message contract between background/content-script/popup
background — the service-worker-side logic (state, alarms, cross-tab coordination)
content    — page-context logic (DOM reads/writes, page-side event listeners)
popup      — the extension UI, consumes background/content only through messaging
```

## Adaptation points

- Drop `popup` entirely for an extension with no browser action UI.
- Merge `content` into `background` when the extension never injects into
  page context (a pure background-worker extension).

## Boundary that must hold

`popup` never imports from `background` or `content` directly — every
cross-context call goes through `messaging`, because a WebExtension's
contexts are separate JS runtimes and a direct import silently fails at
runtime rather than at build time.

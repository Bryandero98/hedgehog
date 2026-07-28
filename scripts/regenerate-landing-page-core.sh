#!/usr/bin/env bash
# Regenerates src/golden-cores/landing-page/ from scratch — the
# deterministic landing-page core output that
# `hedgehog-bootstrap-landing-page-core` copies into every project on
# this core instead of generating it live. Run this by hand whenever a
# core dependency (Astro, Tailwind, Motion, Lenis, ...) needs bumping.
# Not run automatically, not part of the installer's runtime path.
#
# What this does, in order: scaffold a minimal Astro project, add
# Tailwind (v4, CSS-first — no tailwind.config.js), add the animation/
# motif library set, wire ESLint + Prettier, verify clean, sync into
# place. Unlike full-stack-app's regenerate script, this one runs start
# to finish with no manual-pause steps — Astro's own scaffolding and
# `astro add` cover everything that needed hand-wiring on the Nx side.
#
# Animation engine is Motion (`animate()`/`scroll()`/`stagger()`), scoped
# to CSS/transform targets only. Organic/generative motifs use Paper.js —
# a retained-mode scene graph of `Path`/`Group` objects whose properties
# you set; `view.draw()` renders current state, so a redraw never replays
# an imperative script and can't leak transform/style state across calls.
# Diff the result against the current src/golden-cores/landing-page/
# before committing — don't assume a clean run means nothing changed
# upstream in a way that matters.
#
# Usage: scripts/regenerate-landing-page-core.sh [scratch-dir]
#   scratch-dir defaults to a fresh temp directory.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRATCH="${1:-$(mktemp -d /tmp/hedgehog-landing-page-core.XXXXXX)}"

echo "Regenerating landing-page core in: $SCRATCH"
mkdir -p "$SCRATCH"
cd "$SCRATCH"

if [ -f "$SCRATCH/astro.config.mjs" ]; then
  echo "Refusing to run against a non-empty scratch dir with an existing astro.config.mjs: $SCRATCH" >&2
  exit 1
fi

command -v pnpm >/dev/null || { echo "pnpm is required" >&2; exit 1; }

# ── Step 1: Astro workspace ──────────────────────────────────────────────

pnpm create astro@latest . --template minimal --install --no-git --typescript strict --yes

# create-astro scaffolds its own AGENTS.md/CLAUDE.md symlink, README.md,
# and pnpm-workspace.yaml (as if this were a standalone repo) — all three
# collide with what a Hedgehog project's own root already carries once
# this tree lands there.
rm -f CLAUDE.md AGENTS.md pnpm-workspace.yaml README.md

# ── Step 2: Tailwind (v4, CSS-first) ─────────────────────────────────────

pnpm astro add tailwind --yes

# ── Step 3: the animation/motif library set ──────────────────────────────
# Motion is scoped to CSS/transform targets only — no plugins. Paper.js
# covers organic/generative motifs, ogl covers the continuous WebGL
# background field; static geometric and measured/connective motifs are
# built from CSS and Canvas 2D directly, no library needed for either.

pnpm add motion lenis split-type paper ogl

# ── Step 4: type checking ─────────────────────────────────────────────────
# `astro check` needs TypeScript's programmatic API, which the 7.x native
# compiler doesn't expose yet (github.com/withastro/roadmap/discussions/1321)
# — pin to the 5.x line until that lands upstream. Re-check this pin when
# bumping typescript.

pnpm add -D @astrojs/check typescript@^5

# ── Step 5: ESLint + Prettier ─────────────────────────────────────────────

pnpm add -D eslint eslint-plugin-astro @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser astro-eslint-parser \
  prettier prettier-plugin-astro prettier-plugin-tailwindcss

cat > eslint.config.mjs <<'EOF'
// @ts-check
import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },
];
EOF

cat > .prettierrc.js <<'EOF'
export default {
  singleQuote: true,
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.astro',
      options: { parser: 'astro' },
    },
  ],
  tailwindStylesheet: './src/styles/global.css',
};
EOF

cat > .prettierignore <<'EOF'
pnpm-lock.yaml
dist
.astro
node_modules
EOF

# ── Step 6: the token layer + placeholder page + section/motif dirs ──────

cat > src/styles/global.css <<'EOF'
@import 'tailwindcss';

/* The token layer — Step 5 (Systems Designer) of the Chain Method
   overwrites every value below with the project's derived token system.
   Nothing here is meant to ship as-is; this is the placeholder that
   proves the pipeline (Tailwind v4's CSS-first @theme) is wired. */
@theme {
  --color-ink: #18181b;
  --color-paper: #fafafa;
  --color-accent: #2563eb;

  --font-display: 'system-ui', sans-serif;
  --font-body: 'system-ui', sans-serif;

  --spacing-unit: 0.25rem;

  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
EOF

cat > src/pages/index.astro <<'EOF'
---
import '../styles/global.css';
---

<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="viewport" content="width=device-width" />
		<meta name="generator" content={Astro.generator} />
		<title>landing-page core</title>
	</head>
	<body class="bg-paper text-ink font-body">
		<!--
			landing-builder replaces this file at the Chain Method's build
			phase. Until then this placeholder proves the Astro + Tailwind
			pipeline (dev server, build, token layer) works end to end.
		-->
		<main class="flex min-h-screen items-center justify-center">
			<h1 class="font-display text-2xl">landing-page core — ready to build</h1>
		</main>
	</body>
</html>
EOF

mkdir -p src/sections src/motifs
touch src/sections/.gitkeep src/motifs/.gitkeep

# ── Step 7: package.json — name, scripts ──────────────────────────────────

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = 'app';
pkg.private = true;
pkg.packageManager = 'pnpm@10.12.1';
pkg.scripts = {
  ...pkg.scripts,
  check: 'astro check',
  lint: 'eslint .',
  format: 'prettier --write .',
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

npx prettier --write package.json

# ── Verify ──────────────────────────────────────────────────────────────

pnpm check
pnpm lint
npx prettier --check .
pnpm build
rm -rf dist .astro

echo ""
echo "=== Verification passed. Sync into src/golden-cores/landing-page/: ==="
echo "  rsync -a --exclude=node_modules --exclude=.astro --exclude=dist \\"
echo "    --exclude=.git --exclude=.gitignore \\"
echo "    '$SCRATCH/' '$REPO_ROOT/src/golden-cores/landing-page/'"
echo ""
echo "IMPORTANT: rename the synced .gitignore —"
echo "  mv '$REPO_ROOT/src/golden-cores/landing-page/.gitignore' '$REPO_ROOT/src/golden-cores/landing-page/gitignore.template'"
echo "npm strips files literally named .gitignore from published tarballs."
echo "bin/cli.mjs's DOTFILE_RENAMES restores the name on install."
echo ""
echo "Then diff against the previous src/golden-cores/landing-page/ and commit deliberately —"
echo "don't blind-overwrite without reviewing what changed upstream."

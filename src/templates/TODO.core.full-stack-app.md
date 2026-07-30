## Add-ons

<!-- Written by planner at planning intake. Each line: on/off + the
one-line reason. An absent block reads as "never decided," not "off". -->

- Auth: (fill in: on/off — reason)
- Queue: (fill in: on/off — reason)
- Mobile: (fill in: on/off — reason)
 
## Bootstrap

<!-- Add-on steps (planner marks each on/skipped at planning intake, per
the ## Add-ons block above) run live, one at a time, after core. A
skipped add-on gets checked off as skipped, not left unchecked. -->

- [x] Nx workspace + `packages/config` (incl. `docker-compose.yml` for local Postgres) — core, landed via `hedgehog init`, verified via `hedgehog-bootstrap-full-stack-app-core`
- [x] `packages/db` — Drizzle client — core, landed via `hedgehog init`, verified via `hedgehog-bootstrap-full-stack-app-core`
- [x] `apps/api` — Nest shell, Pino — core, landed via `hedgehog init`, verified via `hedgehog-bootstrap-full-stack-app-core`
- [x] `apps/web` — Next shell, TanStack Query provider — core, landed via `hedgehog init`, verified via `hedgehog-bootstrap-full-stack-app-core`
- [ ] `packages/auth` — Better Auth config + global guard on `apps/api` — Auth add-on (fill in: on / skipped, not in scope)
- [ ] `apps/worker` — BullMQ seam, Redis (no consumers yet) — Queue add-on (fill in: on / skipped, not in scope)
- [ ] `apps/mobile` — Expo shell — Mobile add-on (fill in: on / skipped, not in scope)
## Phase A — Backend
 
<!-- One subsection per module in scope. Do not add hooks/screens here —
that's Phase B, and doesn't start until every module below is checked. -->
 
### <module-name>
 
- [ ] schema
- [ ] contract
- [ ] repository
- [ ] service
- [ ] api (controller)
- [ ] queue (only if this operation genuinely needs async)
## Phase B — Frontend
 
<!-- Do not touch this section until every module above has "api" checked. -->
 
### <module-name>
 
- [ ] hooks
- [ ] ux-planner — writes docs/design/<module-name>.md; ask for a
      mockup/screenshot/Stitch or Figma export here if one exists
- [ ] screen-web
- [ ] screen-mobile (only if building for mobile)

<!-- STOP before deleting this file: every box above checked means the
build is complete. Offer the user a fresh-context handoff to `tweaker`
first — see hedgehog-loop's Stop Condition. Only delete this file after
that offer has been made (taken or declined). -->

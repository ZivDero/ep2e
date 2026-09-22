# Foundry V14 upgrade roadmap

Target: Foundry VTT **14.368**. Base: release **1.3.3** (tag `1.3.3` = `88474c55`), branch `v14-upgrade`.

Status legend: `[ ]` open, `[x]` done, `[~]` in progress, `[-]` dropped.
Tags: **BLOCKER** (system fails to load), **CRASH** (a feature throws), **SILENT** (works wrong or not at all, no error), **DEPR** (deprecation warning; removal version noted), **VERIFY** (behaviour unconfirmed until tested on the live instance).

Line numbers refer to the 1.3.3 code and will drift as we edit.

---

## Contents

0. [Ground rules and setup](#phase-0--ground-rules-and-setup)
1. [Make it load on V14](#phase-1--make-it-load-on-v14)
2. [Replace removed APIs](#phase-2--replace-removed-apis)
3. [Area effects: MeasuredTemplate → Regions](#phase-3--area-effects-measuredtemplate--regions)
4. [Rich text: TinyMCE → ProseMirror](#phase-4--rich-text-tinymce--prosemirror)
5. [Stale integrations and silent failures](#phase-5--stale-integrations-and-silent-failures)
6. [Tooling and release](#phase-6--tooling-and-release)
7. [Verification on the live instance](#phase-7--verification-on-the-live-instance)
8. [Deprecations with later deadlines](#phase-8--deprecations-with-later-deadlines)
9. [GUI facelift](#phase-9--gui-facelift)
10. [Backlog](#phase-10--backlog)
- [Appendix A: porting ledger for `foundry-v14-compat`](#appendix-a--porting-ledger-for-foundry-v14-compat)
- [Appendix B: console probe](#appendix-b--console-probe)
- [Appendix C: sources](#appendix-c--sources)

---

## Decisions

| # | Decision | Outcome | Consequences |
|---|---|---|---|
| D1 | Minimum Foundry version | **Decided: V14 only** | `compatibility` 14/14.368/14. No V13 code paths. V13 users stay on 1.3.x. |
| D2 | Fork or upstream | **Decided: independent fork** | Fork: **ZivDero/ep2e**. Own release channel: `manifest`/`download`/`url` in `system.json` and `release.yml` point at the fork (6.5). Keep credits to Bubz43 and Daos in README and `authors`. System id stays **`ep2e`**, so existing worlds switch by installing from the new manifest, with no migration (the fork and upstream can't be installed side by side). |
| D3 | Version number | **Decided: 2.0.0** (follows D1) | CHANGELOG notes V13 is no longer supported. |
| D4 | `template.json` → TypeDataModel | **Assumed: defer** (Phase 8) | Works until V16. |
| D5 | Facelift scope | **Decided: light pass (9A), then reassess** | 9B/9C stay listed but unscheduled. |
| D6 | Test instance | **Decided: local on this PC** | Junction the repo into `<FoundryData>/Data/systems/ep2e` (0.5). Foundry not installed yet; path TBD. |

---|---|---|---|
| D1 | Minimum Foundry version | **14 only** | The Regions API (Phase 3) and message modes (2.2) don't exist on V13. Supporting both means version branches in the hottest code paths. V13 users stay on 1.3.x. |
| D2 | Fork or upstream PR | Work on a fork and offer upstream PRs; contact the author first | The author pushed a V14 branch in June 2026 and merges outside PRs (#11, #14). Coordinating avoids two competing ports. |
| D3 | Version number | **2.0.0** if D1 = 14-only, otherwise 1.4.0 | Dropping V13 support is a breaking change for users. |
| D4 | `template.json` → TypeDataModel | Defer (Phase 8) | Deprecated in V14 but supported until V16; it's a large, separate project. |
| D5 | Facelift scope | Light pass after the port, then decide on the medium pass | See Phase 9. |

---

## Phase 0 — Ground rules and setup

- [x] **0.1 Branch.** `v14-upgrade` created from tag `1.3.3`. All work lands here (or on topic branches merged into it).
- [ ] **0.2 Porting policy for the author's branch.** Never `git cherry-pick` commits from `origin/foundry-v14-compat`: about 85% of its diff is editor re-indentation (+2781/−2700 raw vs +398/−317 with `-w`). Re-apply only the semantic hunks listed in [Appendix A](#appendix-a--porting-ledger-for-foundry-v14-compat), either by hand or with `git show -w <sha> -- <paths> | git apply --ignore-whitespace --3way`, then re-check the result with `git diff -w`.
- [ ] **0.3 Formatting policy.** Only format the lines we touch, with the repo's Prettier 2 config (`.prettierrc`). Turn off format-on-save for TS in the editor so diffs stay reviewable.
- [ ] **0.4 Dev loop.** `npm ci` → `npm run pack` (compendiums into `packs/`) → `npm start` (Snowpack build in watch mode into `build/`). Verified working on Node 22.20.
- [ ] **0.5 Instance hookup.** The system folder must be the repo root because `system.json` references `./build/dist/index.js` and `./packs/*`.
  - Local instance: symlink/junction the repo to `<FoundryData>/Data/systems/ep2e`.
  - Remote instance: build `latest.zip` with `npm run build` and install it from the zip, or sync `build/`, `packs/`, `lang/`, `system.json`, `template.json` to the server.
- [ ] **0.6 Test worlds.** One fresh world, and a **copy** of a real V13 world with actors, items, combat, chat history and placed templates. V14 migrates worlds one way and can't downgrade them (14.359), so never open the only copy of a world.
- [ ] **0.7 Run the console probe** ([Appendix B](#appendix-b--console-probe)) and write the results into the VERIFY items below.

---

## Phase 1 — Make it load on V14

On 1.3.3 the system can't load on V14: the manifest caps it at 13, and several globals it touches at module load no longer exist. `overridePrototypes()` runs on import (`src/index.ts:9`), so one missing class aborts the whole system.

- [ ] **1.1 Manifest** — `system.json` — **BLOCKER**
  - `compatibility`: `{ "minimum": "14", "verified": "14.368", "maximum": "14" }` (D1).
  - `manifest` → `https://github.com/ZivDero/ep2e/releases/latest/download/system.json`, `download` → `https://github.com/ZivDero/ep2e/releases/latest/download/latest.zip`, `url` → `https://github.com/ZivDero/ep2e` (D2). `id` stays `ep2e`.
  - Replace the top-level `gridDistance`/`gridUnits` (V14 dropped the shim) with `"grid": { "distance": 1, "units": "m" }`.
  - `version` → `2.0.0` (D3).
- [ ] **1.2 `UserConfig` global removed** — `src/foundry/prototype-overrides.ts:37-38` — **BLOCKER**
  - Take the namespacing from branch commit `ccb739dc`: `foundry.applications.sheets.UserConfig`.
  - The patch does nothing anyway: V13+ `UserConfig` is ApplicationV2, which never calls `getData`. See 5.1a for the real fix.
- [ ] **1.3 `DiceTerm` global removed** — `src/success-test/success-test.ts:160` (`class Percentile extends DiceTerm`) — **BLOCKER**
  - Take from `ccb739dc`: `extends foundry.dice.terms.DiceTerm`. Also drop the `interface DiceTerm` augmentation in `foundry-cont.d.ts`.
- [ ] **1.4 `tinymce` global removed** — `prototype-overrides.ts:362` (`tinymce.FocusManager...`) — **BLOCKER**
  - Delete the patch. The branch only commented it out; delete it outright.
- [ ] **1.5 `CONFIG.TinyMCE` removed** — `src/init.ts:99-100` — **BLOCKER** (throws inside the `init` hook, so status effects and the combat socket handler after it never register)
  - Delete both lines and the `RawEditorOptions` import (`init.ts:3`).
- [ ] **1.6 Namespace the remaining V13-deprecated globals** — **DEPR** (removed in V15). Take all of `ccb739dc` ([Appendix A](#appendix-a--porting-ledger-for-foundry-v14-compat)): `Token`, `Game`, `JournalSheet`, `CombatTracker`, `DragDrop`, `ItemDirectory`, `ActorDirectory`, `Actors`, `Items`, `ActorSheet`, `ItemSheet`, `CompendiumDirectory`, `ChatLog`, `Compendium`, `FolderConfig`, `FilePicker`. Then do the ones the branch missed:
  - `Dialog` — `init.ts:438`, `compendium-list.ts:87` (see 5.4)
  - `ImagePopout` — `user-view.ts:37` (see 2.7)
  - `SortingHelpers` — `misc-helpers.ts:63` → `foundry.utils.performIntegerSort`
  - `Application` — `foundry-apps.ts:20,42` (see 5.3)
  - `TextEditor` — `editor-wrapper.ts:139` (replaced in Phase 4)
  - `MeasuredTemplate*` — replaced in Phase 3
- [ ] **1.7 Chat render hook** — `init.ts:114`, `src/chat/message-hooks.ts:45-66` — **DEPR**
  - Take from `ccb739dc`: `renderChatMessageHTML`, with `onChatMessageRender(message, el: HTMLElement)` and the queue keyed by element.
- [ ] **1.8 Make prototype patching fail-soft.** Wrap each patch in `overridePrototypes()` in a helper that checks the target exists, catches errors, and logs `EP2e: patch <name> skipped`. A future core change should then cost one feature, not the whole system.

**Exit criteria:** the world loads with no EP errors in the console, EP sheets open, and the ep-extra-info bar renders.

---

## Phase 2 — Replace removed APIs

Each of these throws the moment the feature is used on V14.

- [ ] **2.1 `CONST.CHAT_MESSAGE_TYPES` removed** — `src/chat/create-message.ts:83` — **CRASH** (every message that carries a roll)
  - Delete the `type:` line. Rolls already travel in `rolls: [...]` (`create-message.ts:70`).
  - Re-test the Dice So Nice path (`create-message.ts:95-129`, `game.dice3d.show`) against a V14 build of that module.
- [ ] **2.2 Roll mode → message mode** — **DEPR until V16 / VERIFY**
  - V14 replaced roll modes with message modes: the `core.messageMode` setting, `CONFIG.ChatMessage.modes`, `ChatMessage.applyMode`, keys `public|gm|blind|self|ic`. The old names are shimmed until V16.
  - Risk: `rollModeToVisibility` (`create-message.ts:14-26`) compares `core.rollMode` against `CONST.DICE_ROLL_MODES.*`. If the shim returns new-style keys, whispers and blind rolls fall through to **public**.
  - Call sites: `create-message.ts:14`, `global.ts:77`, `init.ts:266-267`, `success-test-base.ts:80`, `message-psi-test.ts:199-200`.
  - Fix: read `core.messageMode` and map `public|ic → Public`, `gm → GM`, `blind → Blind`, `self → Self`. Consider building the whisper/blind fields with `ChatMessage.applyMode(chatData, mode)` instead of by hand (`create-message.ts:84-92`).
  - Test every mode as GM and as a player.
- [ ] **2.3 Grid distance removed** — **CRASH** (ranged, thrown and psi tests throw once targets are selected; the range is computed in the constructor)
  - `src/foundry/token-helpers.ts:44`: `grid.measureDistance(a, b)` → `canvas.grid.measurePath([a, b]).distance`
  - `token-helpers.ts:48`: `scene.gridDistance` → `scene.grid.distance`
  - `canvas.ts:225`: same as the first bullet (rewritten in Phase 3 anyway)
  - Callers to re-test: `ranged-attack-test.ts:150,261`, `thrown-attack-test.ts:103,149`, `psi-test.ts:82,145`.
  - Optional: include the elevation difference so V14 Scene Levels give sensible ranges (backlog 10.4).
- [ ] **2.4 `Token#toggleEffect` removed** — `src/combat/components/participant-item/participant-item.ts:541-555` (`toggleDefeated`) — **CRASH**
  - Replace with `actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, { overlay: true, active })`. `ActorEP.toggleStatusEffect` already passes overlay calls through to core.
  - Tokens without an actor can't carry a status; skip them, which matches what core does.
- [ ] **2.5 Status effect config** — `init.ts:102-109` — **SILENT** (conditions appear in the Token HUD with no icon or name)
  - V14 removed `icon`/`label` in favour of `img`/`name`. `CONFIG.statusEffects` is now a record keyed by id (array access shimmed until V16).
  - Rebuild it as `{ id, name, img }` entries. Keep core's defeated entry by looking up `CONFIG.specialStatusEffects.DEFEATED` instead of `CONFIG.statusEffects[0]`. Emit the V14 shape.
  - `actor.ts:333`: `effect?.icon` → `effect?.img`.
  - `participant-item.ts:546`: `CONFIG.statusEffects.find(...)` (removed together with 2.4).
  - Re-check the `TokenHUD#_getStatusEffectChoices` override (`prototype-overrides.ts:182-212`); V14 added an `order` field and changed sorting in 14.363.
- [ ] **2.6 `game.system.template` removed** — **CRASH** (the EP actor/item creators, digimorph/default-sleeve creation)
  - Take from `77f08f3f`: `game.model.Actor[...]` / `game.model.Item[...]`.
  - Sites: `src/entities/models.ts:93,146,211`, `src/entities/actor/default-actors.ts:35`, `src/entities/item/default-items.ts:56`, and the `game` typing in `foundry-cont.d.ts`.
- [ ] **2.7 V13 app constructors** — `src/entities/components/user-view/user-view.ts:32-40` — **CRASH**
  - `new UserConfig(user, {})` → `this.user.sheet?.render(true)`
  - `new ImagePopout(src, opts)` → `new foundry.applications.apps.ImagePopout({ src, window: { title } }).render(true)`
- [ ] **2.8 `pack.private` removed (since V13)** — `src/foundry/misc-helpers.ts:50` — **SILENT** (players see GM-only compendiums in the sleeve picker)
  - Use `pack.visible`.
- [ ] **2.9 Hotbar macro drop** — `src/global.ts:234` — **CRASH** once a macro with the same name exists
  - `m.data.command` → `m.command`.
- [ ] **2.10 Scene controls API** — **VERIFY / CRASH if the shims are gone**
  - `ui.controls.initialize({ tool, layer, control })` is called in the 5 attack-control components (`hacking-`, `melee-`, `psi-`, `ranged-`, `thrown-attack-controls.ts`, around lines 130-200) and in `init.ts:172`.
    - Replace with `ui.controls.activate({ control: 'tokens', tool: 'target' })`, then restore the previous `{ control, tool }` afterwards.
    - `ui.controls.tool` can now be `null` (V14).
  - `token-helpers.ts:26-33`: `activeControl`, `control.activeTool`, `'token'` are stale (the control is `tokens` since V13). The function looks unused; delete it if so.
  - Middle-click tool menu (`init.ts:129-185`): reads `ui.controls.activeTool` and calls `tool.onClick()`/`tool.onChange()`. Update it to the V13+ shape: `controls` is a record, `tool.onChange(event, active)`.

**Exit criteria:** a skill test, a ranged attack with a target, a psi test, a thrown attack, the defeated toggle, the conditions in the Token HUD and the EP creators all work without errors.

---

## Phase 3 — Area effects: MeasuredTemplate → Regions

V14 folded MeasuredTemplate into Scene Regions (14.352). `MeasuredTemplate`, `MeasuredTemplateDocument`, `CONFIG.MeasuredTemplate`, `canvas.templates` and `CONST.MEASURED_TEMPLATE_TYPES` are gone. A document-level shim may exist until V16, but it is unconfirmed and was reported failing. **Rewrite rather than patch.** Discard branch commit `ffbcf177`; it tunes the removed code.

### Current usage (1.3.3)

| Function (`src/foundry/canvas.ts`) | Used by | Purpose |
|---|---|---|
| `createTemporaryMeasuredTemplate` + `placeMeasuredTemplate` (34-158) | `message-area-effect.ts:113-120`, `explosive-settings-form.ts:233-240`, `character-view-base.ts:127-142` (movement preview) | Interactive placement: follows the mouse, wheel rotates (shift snaps), click/Enter confirms, Esc/right-click cancels, optional pan, fades the EP overlay, restores token control. Resolves `{ templateId, sceneId }` |
| `deletePlacedTemplate` (160-168) | `message-area-effect.ts:128`, `explosive-settings-form.ts:246` | Delete |
| `editPlacedTemplate` (170-178) | `message-area-effect.ts:124`, `explosive-settings-form.ts:252` | Open the config sheet |
| `updatePlacedTemplate` (180-192) | `explosive-settings-form.ts:286-289` | Switch to a cone and set its angle for shaped demolition charges |
| `getTemplateGridHighlightLayer` + `getVisibleTokensWithinHighlightedTemplate` (197-237) | `explosive-settings-form.ts:255-262` | Targets = visible tokens within 0.71 × token size of any highlighted grid cell |

Shapes used: `circle` (Centered/Uniform, movement preview) and `cone` (Cone, shaped demolition). `AreaEffectType = uniform | centered | cone` (`src/data-enums.ts:373`).

Stored references (`PlacedTemplateIDs { templateId, sceneId }`):
- the chat flag `areaEffect.templateIDs` (`src/chat/message-data.ts:148`)
- the weapon/explosive settings `templateIDs` (`src/entities/weapon-settings.ts:12`, `src/entities/item/proxies/explosive.ts:241,300,312`)

### Tasks

- [ ] **3.1 New module `src/foundry/regions.ts`** exposing the same five operations over Regions. Keep the call sites' signatures so the UI code barely changes.
  - Placement: `canvas.regions.placeRegion(data, { create: true, allowRotation: true, ... })`. It resolves to a `RegionDocument` or `null` on cancel.
    - Shape data: `{ type: 'circle', x, y, radius }` or `{ type: 'cone', x, y, radius, angle, rotation }`. Distances must be converted from scene units to pixels (`canvas.dimensions.distancePixels`). **VERIFY** the exact shape field names against the 14.368 API.
    - `onMove`/`onRotate` return-value semantics were flipped in 14.356, so don't copy pre-14.356 examples.
    - Keep our own wrappers: overlay fade on/off, restoring the controlled tokens, optional pan.
  - Movement preview: `RegionDocument.createTokenEmanation(token, range, data)` or `placeRegion(..., { attachToToken })`. It may not need to be persisted at all. Decide whether it should stay a temporary preview (then delete on close) or become a real region.
  - Delete: `scene.deleteEmbeddedDocuments('Region', [id])`.
  - Edit: `scene.regions.get(id)?.sheet.render(true)`.
  - Update (cone angle): update the region's `shapes`.
  - Targets: `regionDoc.tokens` filtered by `token.object?.isVisible`. Note the behaviour change: region containment tests token shape/centre, not the old "0.71 × size of any highlighted cell" rule. Document it in the CHANGELOG.
  - Visuals: region colour from `game.user.color`. Consider turning on Measured Template Mode (#13508) so our regions look like templates.
- [ ] **3.2 Port the callers** — `message-area-effect.ts`, `explosive-settings-form.ts` (including `renderTemplateEditor` 424-440 and `getTargets`), `character-view-base.ts`, and the `canvas.ts` types. Delete the template code in `canvas.ts` along with the `MeasuredTemplate*`, `GridLayer.getSnappedPosition` and `highlightLayers` typings.
- [ ] **3.3 Stored references** — **VERIFY**: does V14's template → region migration keep document IDs?
  - If yes, old `templateIDs` resolve to regions and nothing else is needed.
  - If no, handle missing IDs gracefully (hide the edit/delete buttons, as happens today when the scene differs), and optionally add a migration step in `src/entities/migration.ts` that clears stale `templateIDs`.
  - Keep the field name `templateIDs` for data compatibility; only the meaning changes to "region".
- [ ] **3.4 Localization** — "template" strings in `lang/en.json` may want to become "area"/"region". Cosmetic.

**Exit criteria:** place, rotate, edit, update and delete an explosive area in all three `AreaEffectType`s and a shaped charge; area-effect chat card placement; target detection; movement preview. Also open a migrated world that has old template references.

---

## Phase 4 — Rich text: TinyMCE → ProseMirror

V14 removed TinyMCE (14.354). Every EP description editor uses `<editor-wrapper>` (21 host components: 17 item forms, 3 sleeve forms and the ego form). Base the work on branch commit `77f08f3f`, fixing its problems as we go.

- [ ] **4.1 Rewrite `src/components/editor-wrapper/editor-wrapper.ts`**, starting from `77f08f3f`:
  - Take:
    - `<enriched-html>` created in the light DOM and slotted into `<slot name="html">`
    - `TextEditor.implementation.create({ target, engine: 'prosemirror' }, content)`
    - saving via the `serializeString` of `view.state.doc.content`
    - `destroy()` that removes the editor DOM and un-hides the content
  - Fix:
    - Delete the dead `if (editor.container)` TinyMCE branch (it never sets `this.editor`).
    - Focus the ProseMirror view after creation (`editor.view.focus()`); the branch lost focus-on-open.
    - Wrap `create()` in try/catch: on failure, close the spinner, un-hide the content, remove the wrapper div and notify the user.
    - Replace the 250 ms click lockout with a state flag (`idle | opening | editing | saving`) so a fast double-click can't orphan an editor.
    - Use `foundry.prosemirror.dom.serializeString` rather than the global `ProseMirror` (**VERIFY** which exists in 14.368) and drop the ad-hoc `declare global class ProseMirror`.
    - Delete the commented-out TinyMCE options, the `plugins` LazyGetter (`editor-wrapper.ts:44-54`) and the `tinymce` type imports.
- [ ] **4.2 Host components.** The editor must live in the light DOM so ProseMirror's key handling and Foundry's CSS reach it. That is the branch's slot approach, but written once, not three times:
  - Add one mixin (e.g. `DescriptionEditorHost`) that owns the `editor-wrapper` element, sets `disabled`/`updateActions` in `update()`, and exposes `renderDescriptionSlot()`.
  - Apply it to `ItemFormBase` (`src/entities/item/components/forms/item-form-base.ts`), `SleeveFormBase` (`src/entities/actor/components/sleeve-forms/sleeve-form-base.ts`) and `EgoForm` (`src/entities/components/ego-form/ego-form.ts`).
  - In each of the 21 forms, replace the `<editor-wrapper slot="description" …>` block with `${this.renderDescriptionSlot()}` and add a `descriptionUpdateActions` getter. Write these by hand; don't import the branch's re-indented files.
  - `EgoForm` shows the description only on the "details" tab; make sure the slotted element hides and shows correctly and isn't recreated on each tab switch.
- [ ] **4.3 Styling**
  - `editor-wrapper.scss:52`: the `enriched-html { padding }` rule no longer matches a slotted element. Use `::slotted(enriched-html)`.
  - The ProseMirror toolbar and content inside dark EP windows risk the same white-on-white bug that 1.3.2 fixed for TinyMCE. Give the light-DOM editor container Foundry's dark theme (`themed theme-dark` classes or equivalent) and add EP overrides in `src/global.scss`, scoped to `.ep-window-container`.
- [ ] **4.4 `enrichHTML` options (existing bug)** — `src/components/enriched-html/enriched-html.ts:100` calls `enrichHTML(content)` without options, so `secrets` default to hidden even for GMs and owners, and relative links/rolls lack context.
  - Pass `{ secrets: doc.isOwner, relativeTo: doc, rollData }`. This needs the owning document threaded into `<enriched-html>`.
- [ ] **4.5 Remove the TinyMCE leftovers**:
  - `darkMCE.css`, and its entry in `.github/workflows/archive.js`
  - the `.tox` rules in `src/global.scss` (around lines 117-121)
  - the `tinymce` devDependency in `package.json`
  - the `tinymce` typings in `foundry-cont.d.ts`

**Exit criteria:** open, edit, save and cancel the description on one item of each form type, a sleeve and an ego. Check that the content persists, that disabled (non-owner) views can't edit, that there are no console errors, readable contrast, and that secrets show for the GM and are hidden from players.

---

## Phase 5 — Stale integrations and silent failures

These don't throw, but features are broken or dead, mostly since V13. Each item: check it on the instance, then fix or delete.

### 5.1 Prototype patches (`src/foundry/prototype-overrides.ts`)
- [ ] **a. `UserConfig.getData`** (36-49) — **SILENT**. Dead since V13 (AppV2 uses `_prepareContext`), so the "only characters in the character picker" filter is lost. Re-implement it on `_prepareContext` (**VERIFY** the context key names) or drop it.
- [ ] **b. `Game#_onPreventDragstart`** (51-59) — **VERIFY**. Undocumented in V13/V14. If the method is gone, the patch does nothing, and dragging from inside Lit shadow DOM may be blocked. Test dragging items out of EP sheets.
- [ ] **c. `Token#_onUpdate` wrapper** (62-70) — low risk; keep.
- [ ] **d. `Token#_drawEffects` replacement** (73-103) — **VERIFY**. `_drawEffect(src, tint)` and `_drawOverlay` are unchanged in V14. It reads `actor.temporaryEffects`, `effect.img`, `effect.tint` and `getFlag('core','overlay')`. Check against ActiveEffects V2 (`showIcon`, 14.x) and the defeated overlay after 2.4.
- [ ] **e. `TokenHUD` patches** (108-212: `_prepareContext` combat keys, `DEFAULT_OPTIONS.actions.combat`, `_getStatusEffectChoices`) — **VERIFY**. They depend on the HUD template's context keys and on the combat button markup.
- [ ] **f. `TokenDocument.prototype.inCombat`** (124-128) — **VERIFY**. It redefines core's in-combat notion using the EP combat state; check V14 turn markers and the HUD combat toggle.
- [ ] **g. `JournalSheet.defaultOptions`** (217-222) — **SILENT**. It targets the V1 sheet, which core journals no longer use. Delete it, or set the width on `JournalEntrySheet.DEFAULT_OPTIONS.position`.
- [ ] **h. `CombatTracker#_renderHTML`/`_replaceHTML`** (264-280) — **VERIFY**. Both methods exist in V14. Check that nothing in the tracker's `_onRender` expects the core markup (new in V14: `Combat#name`, `getCombatantsBy*`).
- [ ] **i. `ChatMessage._getSpeakerFromUser`/`_getSpeakerFromActor`** (322-354) — **VERIFY**. Undocumented in V13/V14. If core no longer calls them, EP speaker aliasing is lost. The fallback is a `ChatMessage.getSpeaker` wrapper or a `preCreateChatMessage` hook.
- [ ] **j. `DragDrop#_handleDragStart`** (367-380) — exists in V14; keep and re-test.
- [ ] **k. `ItemDirectory`/`ActorDirectory#_onCreateEntry`** (450-485) — **SILENT**. The V14 signature is `(event, target)`. The code reads `ev.currentTarget`, which on AppV2 is the app root, so folder targeting and window positioning are wrong. Use `target` and `target.closest('[data-folder-id]')`.

### 5.2 Foundry DOM selectors
- [ ] `init.ts:345-358`: `#sidebar-tabs > a.item[data-tab='combat']` (right-click the combat tab to pop out the EP combat view). V13+ tabs are `<button>`s, so this is dead. Update the selector, and re-attach the listener when the sidebar re-renders.
- [ ] `init.ts:298`: `#ui-top.insertBefore(extraInfo, #loading)` throws if `#loading` isn't a child of `#ui-top`. Check the V14 layout and fall back to `append`.
- [ ] `init.ts:362-372`: the compendium search button goes into `.directory-footer`. Compendium search was reworked in 14.358; check the footer exists.
- [ ] `init.ts:380`: `log.popOut` → `isPopout` (the block never runs today).
- [ ] `init.ts:423-435` (click) and `init.ts:451-458` (Enter key): clicks on `.document.actor/.item` rows are forwarded to `.document-name`, which doesn't exist in V13+. Check the V14 directory markup (`.entry-name`?).
- [ ] `init.ts:470-520`: the directory render hooks use `data-entry-id` and `.document`; check against V14.
- [ ] `src/entities/item/item-sheet.ts:129`: `[data-document-id=…]` → `[data-entry-id=…]`. `actor-sheet.ts:246` already checks both.
- [ ] `src/foundry/drag-and-drop.ts:99`: `.directory-item`; check it.
- [ ] `src/chat/message-hooks.ts:58`: `ui.chat._popout` → `ui.chat.popout` or `ui.chat.scrollBottom({ popout: true })` (**VERIFY**).
- [ ] `message-hooks.ts:92-108`: `.message-header`, `.message-sender`, `.message-metadata` inside core chat cards; check the V14 chat markup.

### 5.3 App and window helpers
- [ ] `src/foundry/foundry-apps.ts:22-38` `positionApp` uses jQuery `element[0]`. All its targets (`FolderConfig`, `FilePicker`, dialogs) are AppV2 now, so it loops for 200 frames and does nothing. Rewrite it for `app.element` (HTMLElement) and `app.setPosition()`.
- [ ] `foundry-apps.ts:40-49` `confirmFloatingAppPositions` (unused, V1-only) and `foundry-apps.ts:88-104` `navMenuListener` (unused): delete both, plus `convertMenuOptions` in `misc-helpers.ts`, whose only caller is `navMenuListener`.
- [ ] `src/components/window/window.ts:105-107` uses `ui.windows`, which only tracks V1 apps. Use `foundry.applications.instances` for the "any window open?" check. `ApplicationV2._maxZ` (76-81) still exists (internal); keep it.

### 5.4 Dialogs
- [ ] `src/entities/components/compendium-list/compendium-list.ts:87`: `Dialog.confirm` → `foundry.applications.api.DialogV2.confirm`.
- [ ] `init.ts:438-449`: the render hook loop over `[Dialog, FolderConfig, FilePicker]` positions dialogs next to the clicked element. Switch to `DialogV2` and the AppV2 hook names (`renderDialogV2`, …), and use the rewritten `positionApp` (5.3).

### 5.5 Data and update syntax
- [ ] `src/entities/update-store.ts:142`: `-=key` deletion → `_del` / `ForcedDeletion` (V14, #13090). **DEPR until V16.** This is the generic update path, so it's used everywhere.
- [ ] `src/entities/v9to10migration.ts`: runs on every GM login (`init.ts:120`) and scans every document, and it uses `'-=data'` (line 55). Put it behind the migration-version check, or remove it (any world that reaches V14 is long past the V10 migration).

### 5.6 Smaller items
- [ ] `src/foundry/hook-setups.ts:33` builds hook names from `constructor.name`. Check the resulting names (`renderCompendiumDirectory`, `renderChatLog`, …) actually fire on V14.
- [ ] `src/entities/token-subscription.ts:26-29` passes plain `toJSON()` data to `sceneUpdate` on `canvasReady`, so `.parent` is undefined and the call does nothing (existing bug).
- [ ] `message-area-effect.ts:112` and `explosive-settings-form.ts:232` use private `scene._viewPosition`; still present in V14. Keep it and flag it for later.
- [ ] Remove the `type JQuery<T> = [T]` hack if we port `ccb739dc`'s typings; type the code honestly instead.

---

## Phase 6 — Tooling and release

- [ ] **6.1 Type checking.** `npm run typecheck` reports 696 errors on 1.3.3 because `tsconfig.json` includes a root `foundry.d.ts` that the author keeps locally (it's gitignored). Options:
  1. Ask the author for their `foundry.d.ts`.
  2. Add a small `types/foundry-globals.d.ts` with loose declarations for `foundry`, `game`, `CONFIG`, `canvas`, `ui`, `Hooks`, `CONST`, and so on, so that the only errors left are real code errors. Then keep the error count from growing.
  3. Adopt the League's `fvtt-types` (large churn).
  - Recommendation: option 2 now, and ask for option 1 in parallel.
- [ ] **6.2 Build.** Stay on Snowpack 3.0.13 for this release; it builds fine on Node 22. The Vite migration belongs to the facelift (Phase 9B), because it means replacing `snowpack-tagged-scss.js`.
- [ ] **6.3 Release zip size.** The Snowpack `mount` copies all of `src/`, so `build/dist/packs/` ships 9.8 MB of raw compendium JSON that nothing reads. Exclude `src/packs/**` (and other non-runtime files) from the build.
- [ ] **6.4 `.github/workflows/archive.js`.** Remove the `body-init.css` entry (the file doesn't exist) and `darkMCE.css` (4.5).
- [ ] **6.5 `.github/workflows/release.yml`.** Node 20 → 22, `npm install` → `npm ci`, and set `manifest`/`download` URLs per D2.
- [ ] **6.6 Docs.** CHANGELOG entry for the V14 release, including the behaviour changes (regions instead of templates, target detection rule, message modes). README: compatibility line and the module-incompatibility list.

---

## Phase 7 — Verification on the live instance

Run everything on the fresh world and on the migrated copy, as GM and as a player (a second browser or incognito window), with the console open. Record failures as new items above.

**Load and UI**
- [ ] The world loads with no EP errors, and the deprecation warnings are recorded.
- [ ] The ep-extra-info bar (scene view, world time, custom roll, GM panel), the middle-click tool menu and the EP window stacking against core windows all work.

**Documents**
- [ ] Create each actor type through the EP creator, including into a folder.
- [ ] Create each item type through the EP creator.
- [ ] Open, edit and close each sheet type.
- [ ] Import from each compendium; run the compendium search.
- [ ] Drag and drop: compendium → sheet, sidebar → sheet, sheet → sheet, item → hotbar (macro), actor → canvas.

**Rich text**
- [ ] Description edit, save and cancel on each form type.
- [ ] Links, inline rolls and secrets in enriched content.

**Rolls and chat**
- [ ] Skill, ranged (with targets, at several ranges), melee, thrown, psi and hacking tests.
- [ ] Each message mode, as GM and as a player.
- [ ] Dice So Nice, if it's used.
- [ ] EP chat cards render; chat popout scrolling; speaker names and images.

**Area effects**
- [ ] Explosives: uniform, centered, cone and shaped charges. Place, rotate, edit, update, delete, detect targets.
- [ ] Area-effect chat card placement.
- [ ] Movement preview.
- [ ] Old template references in the migrated world.

**Combat**
- [ ] Add and remove combatants from the Token HUD and from the combat view.
- [ ] Initiative, delay, defeated toggle (overlay icon).
- [ ] Right-click the combat tab to pop out the combat view; the combat view in the sidebar.

**Token HUD and tokens**
- [ ] Toggle conditions (icons and names), and the effect icons drawn on the token.
- [ ] Linked and unlinked tokens: V14 creates unlinked-token deltas lazily (#13097).

**Levels (new in V14)**
- [ ] Tokens on different levels: range calculation, target lookup, scene view.

**Migration**
- [ ] After opening the V13 world copy in V14: actors, items, combat state (stored in a world setting), chat history and regions are intact.

---

## Phase 8 — Deprecations with later deadlines

Not needed for the V14 release; schedule them before V15/V16 ships.

- [ ] **8.1 `template.json` → `documentTypes` + TypeDataModel** — **DEPR, removal in V16**. V14 logs a deprecation for `template.json`. Moving means defining `documentTypes` in `system.json` and a TypeDataModel per actor and item type. The system builds its data proxies on template defaults (`game.model`, `models.ts`), so this is its own project. Estimate it separately.
- [ ] **8.2 Remaining ApplicationV1 usage** — **DEPR, removal in V16**. The EP sheets (`ActorEPSheet`, `ItemEPSheet`) are plain classes registered as sheets; registration still works in V14. Hosting EP views in ApplicationV2 shells is the "heavy" facelift option (9C).
- [ ] **8.3 Global aliases** — removed in V15. Covered by 1.6. Re-grep before V15.
- [ ] **8.4 Context menu entries** `name/condition/callback` → `label/visible/onClick` (DEPR until V16). No live use once `convertMenuOptions` is deleted (5.3).

---

## Phase 9 — GUI facelift

This starts after Phase 7 passes. The UI is 172 Lit custom elements in shadow DOM with a custom window manager, a dark-only token set (`scss/_colors.scss`, `scss/_css-properties.scss`) and Material Web Components 0.22 (about 560 uses).

### 9A Light pass (about 1–2 weeks)
- [ ] Fix the broken tokens:
  - `--mdc-button-outline-color: --mdc-theme-primary` (missing `var()`)
  - `--label-color: hsl(0, 0, 80%)` (invalid)
  - `--font-alt` (used but never defined)
- [ ] Contrast: `--ep-color-negative` as text (about 1.7:1) and `--ep-color-primary` (about 2.9:1) → reach WCAG AA.
- [ ] Add semantic tokens (surface, raised, text, muted, accent, danger, focus), a spacing scale (`--ep-space-*`) and a type scale (`--ep-text-*`), then script-convert the common literals.
- [ ] Add a shared `:focus-visible` ring. Remove `outline: 0 !important` (`field.scss:134`) and the other 23 outline kills. Add `aria-label`s to the 162 `mwc-icon-button`s.
- [ ] Add `prefers-reduced-motion` handling for the 36 animations.
- [ ] Scope the global `.message` chat restyle in `src/global.scss` to EP messages (add a class in `onChatMessageRender`). Wrap the global stylesheet in an `@layer` so core and modules win conflicts predictably.
- [ ] Translucent windows: raise the default opacity, or make "Disable Sheet Transparency" the default.

### 9B Medium pass (about 1–2 months)
- [ ] Replace MWC and weightless with native elements, starting at the chokepoints:
  - `src/components/field/fields.ts` (inputs, checkbox, switch, radio, slider)
  - `src/open-menu.ts` (136 `openMenu` calls → native popover, as `sl-popover` already does)
  - `src/components/mixins/tabs-mixin.ts`
  - `submit-button` (`extends ButtonBase`), the `LazyRipple` mixin
  - the `ep-overlay` dialog host → `<dialog>`
- [ ] Then the bulk: about 270 button sites and about 190 list-item sites.
- [ ] Lit 2 → Lit 3 (mostly import rewrites in 187 + 104 files; `lit-virtualizer` → `@lit-labs/virtualizer`). This only becomes possible once MWC is gone.
- [ ] Snowpack → Vite, replacing the tagged-SCSS plugin.
- [ ] Light-theme token set for `body.theme-light`, and `color-scheme` on EP windows.

### 9C Heavy pass (3+ months)
- [ ] Host EP views in ApplicationV2 shells (as `combat-view` already renders inside the core tracker). That gives native theming, header controls, stacking, minimize and sheet config, and replaces most of the custom window manager (`src/components/window/window.ts`, 679 lines).
- [ ] Split `character-view-alt` (1,594 TS lines, 840 SCSS lines). Container queries replace the manual "compact" flag.

Order of screens: character sheet → chat cards → roll/attack dialogs → item forms (one layout drives 21 forms) → combat view.

---

## Phase 10 — Backlog

- [ ] 10.1 Upstream issues: #3 quick bar action, #4 Nanoswarm missing, #5 GM hidden rolls, #8 translation support.
- [ ] 10.2 Region behaviours for explosives, e.g. auto-apply to tokens entering the area.
- [ ] 10.3 Remove the dead code in `ep-overlay.ts` (198 of 329 lines commented out).
- [ ] 10.4 Range calculation that accounts for elevation and Levels.
- [ ] 10.5 UI tests: none exist; consider Playwright smoke tests against a Foundry instance.

---

## Appendix A — Porting ledger for `foundry-v14-compat`

Branch `origin/foundry-v14-compat`, 3 commits on top of 1.3.3. **Take** = port the hunk, **Adapt** = port it with the fixes noted, **Skip** = don't port.

### `ccb739dc` "use namespaced foundry classes" (14 files with `-w`)

| Hunk | Verdict | Roadmap |
|---|---|---|
| `Token` → `foundry.canvas.placeables.Token` (sleight-sustain-end, create-message, participant-selector, scene-view, token-subscription, init) | Take | 1.6 |
| `UserConfig` → `foundry.applications.sheets.UserConfig` (prototype-overrides, user-view) | Take in prototype-overrides; skip in user-view (replaced by 2.7) | 1.2, 2.7 |
| `Game` → `foundry.Game` | Take | 1.6 |
| `JournalSheet`, `CombatTracker`, `DragDrop.implementation`, `ItemDirectory`, `ActorDirectory` in prototype-overrides | Take (JournalSheet may be deleted by 5.1g) | 1.6 |
| `Actors`/`Items`/`ActorSheet`/`ItemSheet` registration in init | Take | 1.6 |
| `CompendiumDirectory`, `ChatLog`, `Compendium`, `FolderConfig`, `FilePicker.implementation` in init and foundry-apps | Take | 1.6 |
| `DiceTerm` → `foundry.dice.terms.DiceTerm` (success-test) | Take | 1.3 |
| `renderChatMessage` → `renderChatMessageHTML` + HTMLElement signature (init, message-hooks) | Take | 1.7 |
| Delete `navMenuListener` (foundry-apps) and its import in prototype-overrides | Take; also delete the leftover unused imports and `convertMenuOptions` | 5.3 |
| `convertMenuOptions` signature change (misc-helpers) | Skip (the function is deleted) | 5.3 |
| `foundry-cont.d.ts` namespace typings | Adapt: take the typings for classes we use; skip `type JQuery<T> = [T]` | 1.6, 5.6 |
| `system.json` version 1.4.0, compatibility 13/14/14 | Skip; decided by D1/D3 | 1.1 |

### `77f08f3f` "use prose mirror editor in all forms" (31 files with `-w`)

| Hunk | Verdict | Roadmap |
|---|---|---|
| `editor-wrapper.ts` ProseMirror rewrite | Adapt (fixes listed in 4.1) | 4.1 |
| `update()`/slot block in `item-form-base.ts`, `sleeve-form-base.ts`, `ego-form.ts` | Adapt into a single mixin | 4.2 |
| 21 forms: `<editor-wrapper>` → `renderDescriptionSlot()` + `descriptionUpdateActions` getter | Adapt; re-apply by hand without the re-indentation | 4.2 |
| `game.system.template` → `game.model` (models, default-actors, default-items, typings) | Take | 2.6 |
| Comment out `CONFIG.TinyMCE` (init) and `tinymce.FocusManager` (prototype-overrides) | Adapt: delete instead of commenting out | 1.4, 1.5 |
| Delete `.vscode/element-boilerplate.code-snippets` | Skip (unrelated) | — |
| Template-literal reflows in firearm/beam/melee/sleight/substance/trait forms | Skip (formatting only) | — |

### `ffbcf177` "use updated apis for placing template"

| Hunk | Verdict | Roadmap |
|---|---|---|
| `grid.getSnappedPosition` → `originalLayer.getSnappedPoint` (canvas.ts) | Skip. It targets the removed MeasuredTemplate code, and it snaps with whichever layer happens to be active | Phase 3 |
| `GridLayer`/`CanvasLayer` typings | Skip | Phase 3 |

---

## Appendix B — Console probe

Paste into the browser console of the 14.368 world, with a scene active, before starting Phase 1. Record the results here.

```js
({
  version: game.version,
  templates: typeof canvas.templates,
  MeasuredTemplate: typeof MeasuredTemplate,
  MeasuredTemplateDocument: typeof MeasuredTemplateDocument,
  placeRegion: typeof canvas.regions?.placeRegion,
  chatTypes: typeof CONST.CHAT_MESSAGE_TYPES,
  measureDistance: typeof canvas.grid.measureDistance,
  measurePath: typeof canvas.grid.measurePath,
  getHighlightLayer: typeof canvas.grid.getHighlightLayer,
  toggleEffect: typeof foundry.canvas.placeables.Token.prototype.toggleEffect,
  rollModeSetting: (() => { try { return game.settings.get('core', 'rollMode'); } catch (e) { return String(e); } })(),
  messageModeSetting: (() => { try { return game.settings.get('core', 'messageMode'); } catch (e) { return String(e); } })(),
  DICE_ROLL_MODES: CONST.DICE_ROLL_MODES,
  chatModes: Object.keys(CONFIG.ChatMessage?.modes ?? {}),
  statusEffectsIsArray: Array.isArray(CONFIG.statusEffects),
  controlsInitialize: typeof ui.controls.initialize,
  controlsActivate: typeof ui.controls.activate,
  proseMirrorGlobal: typeof ProseMirror,
  proseMirrorNs: typeof foundry.prosemirror?.dom?.serializeString,
  onPreventDragstart: typeof foundry.Game.prototype._onPreventDragstart,
  speakerFromUser: typeof ChatMessage._getSpeakerFromUser,
  tinymce: typeof tinymce,
  DiceTermGlobal: typeof DiceTerm,
  UserConfigGlobal: typeof UserConfig,
})
```

Results (to fill in):

```
(pending)
```

---

## Appendix C — Sources

- V12 deprecations removed in V14: https://github.com/foundryvtt/foundryvtt/issues/13436
- Release notes: [14.349](https://foundryvtt.com/releases/14.349), [14.352](https://foundryvtt.com/releases/14.352) (templates → regions, `template.json` deprecation), [14.354](https://foundryvtt.com/releases/14.354) (TinyMCE removed), [14.355](https://foundryvtt.com/releases/14.355) (message modes), [14.356](https://foundryvtt.com/releases/14.356), [14.358](https://foundryvtt.com/releases/14.358), [14.359](https://foundryvtt.com/releases/14.359), [14.361](https://foundryvtt.com/releases/14.361), [14.363](https://foundryvtt.com/releases/14.363), [14.368](https://foundryvtt.com/releases/14.368)
- Region placement API: https://foundryvtt.com/api/v14/classes/foundry.canvas.layers.RegionLayer.html (placeRegion: #13536; callback semantics: #13936)
- Measured Template Mode for regions: #13508. Reference port by Foundry's own Crucible system: https://github.com/foundryvtt/crucible/issues/609
- Message modes: https://github.com/foundryvtt/foundryvtt/issues/8856
- Status effects as a record: #13122. ActiveEffects V2: #13740, #13566, #13332
- Update operators (`_del`/`_replace`): #13090
- Lazy token deltas: #13097, #12997
- V14 API root: https://foundryvtt.com/api/v14/

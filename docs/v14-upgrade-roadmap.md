# Foundry V14 upgrade roadmap

Target: Foundry VTT **14.368**. Base: release **1.3.3** (tag `1.3.3` = `88474c55`), branch `v14-upgrade`. Fork: `ZivDero/ep2e`.

Status legend: `[ ]` open, `[x]` done (commit in brackets), `[~]` done but needs live verification, `[-]` dropped.
Tags: **BLOCKER** (system fails to load), **CRASH** (a feature throws), **SILENT** (works wrong or not at all, no error), **DEPR** (deprecation warning; removal version noted), **VERIFY** (behaviour unconfirmed until tested on the live instance).

Line numbers refer to the 1.3.3 code unless stated otherwise.

The roadmap's claims were fact-checked on 2026-09-22 against the V14 API docs (built from 14.365), release notes 14.349–14.368, the foundryvtt issue tracker, fvtt-types 14.366 and V14 systems (Crucible, Draw Steel, dnd5e). Corrections from that pass are folded in below.

---

## Current state (2026-09-23)

All offline work is done and committed on `v14-upgrade` (not pushed). Live testing on a local **Foundry 14.368** has started: the system loads, and the core flows work with **no errors and no deprecation warnings** (see [Live verification](#live-verification-2026-09-23-foundry-14368)). Two bugs were found on the live instance and fixed [f012b837].

Player and no-GM flows are verified too. Still open: Firefox, drag and drop, the explosive and area-effect chat-card UI, Dice So Nice, and migrating a real V13 world (none available yet).

UX note from the player test: the description edit control (an icon at the right end of the "Description" heading) was hard to find. It is added to 9A below.

---

## Live verification (2026-09-23, Foundry 14.368)

Setup:
- Foundry at `G:\Foundry Virtual Tabletop`, user data in `%LOCALAPPDATA%\FoundryVTT`.
- `Data/systems/ep2e` is a junction to the repo.
- Fresh world `ep2e-test`.
- Tested as GM in the desktop app's browser pane (Chromium, emulated 1440×900).
- A page-level error and warning recorder was active during the tests.

**Bugs found live and fixed** [f012b837]:
- **`registerSheet` rejects EP's sheet classes on V14** ("must be either a foundry.appv1.api.Application or a DocumentSheetV2"). It threw inside `init`, so status effects and the combat socket handler never registered. The registration is removed: `ActorEP`/`ItemEP` already override `sheet`.
- **Rendered description stayed visible under the open editor.** `enriched-html`'s `:host { display: block }` overrode `[hidden]`.

**Verified working** (no errors, no warnings):
- **Load and data**
  - System listed as compatible and loads.
  - All 55 packs index.
  - All 1,042 compendium documents load and build EP proxies. Core migrated the pack documents on world launch with no errors.
  - Weapon Accessories entries have their text page.
  - World migration ran on first load and stored 1.99.0.
- **Sheets and creators**
  - Character sheet renders.
  - All 17 item forms and all 4 actor types open.
  - EP actor and item creators open from the sidebar, including into a folder (`_onCreateEntry(event, target)`).
  - Directory type labels show; one compendium search button.
  - UserConfig lists only characters (sleeves filtered).
- **Editor**
  - ProseMirror opens focused, with Foundry's dark toolbar.
  - Ctrl+S saves and closes.
  - The toggle button saves.
  - Ego descriptions save.
  - Secret blocks show to the owner, with V14's Reveal control.
- **Keyboard (data-loss check)**
  - With a token controlled, Delete, Backspace, WASD, the arrows and Space typed into the ProseMirror editor and into a shadow-DOM text field (skill filter) all stay in the field.
  - The token isn't deleted, moved or released.
- **Chat and rolls**
  - Skill tests in all four modes produce the right visibility: `public` (no whisper), `gm` (GM whisper), `blind` (whisper + blind), `self`.
  - A custom damage roll posts.
  - EP cards render in V14's chat markup (`.message-header`, `.message-sender`).
- **Combat and tokens**
  - The Token HUD lists the EP conditions plus core's `dead`.
  - Toggling a condition works.
  - The HUD combat button adds a combatant.
  - The combat view's defeated toggle applies the `dead` overlay.
  - Effect icons are drawn: the skull overlay (`showIcon` ALWAYS, non-temporary, which the old `temporaryEffects` filter would have missed) and the condition icon.
  - Rounds advance.
  - `<time-since>` renders ("1m ago").
- **Ranged attack with a target** (crashed on 1.3.3)
  - The window opens.
  - Target distance 4.5 for a 3×4-square offset (5 units centre to centre, minus half a square), range band Close.
  - The Blinded condition modifier is applied.
- **Regions**
  - EP's region data is accepted as written: `visibility` ALWAYS, `highlightMode` coverage, `levels: [canvas.level.id]`, owner = the placing user, 6 m → 600 px.
  - Cone rotation 0 points right.
  - Left-click places.
  - Right-click and Escape cancel; the EP overlay un-fades and no region is left behind.
  - A second placement can start afterwards.
  - The Token layer stays active.
  - Updating the shape rotation works.
  - `testInsideRegion` finds the token in the cone and not outside it.
  - Delete works.
  - The EP movement preview (4 m circle) runs through `placeAreaTemplate`.
- **Controls and apps**
  - The middle-click menu lists V14 token tools; picking "Select Targets" works; the "Unconstrained Movement" toggle now actually toggles.
  - Combat tracker and chat log can't be detached; other apps still can.
- **Deprecations:** none logged by EP during load or use.
- **Player session** (a second user in Chrome, owning Whisper; no console errors on either side):
  - The sheet opens.
  - Skill tests in all four modes have the right visibility on the GM side (public; GM whisper; self → whisper to the player; blind → GM whisper + blind).
  - Applying the GM's damage card to Whisper works (6 kinetic vs armor 6 → 0 damage, logged on Whisper's health, health card posted by the player).
  - Initiative rolls post with an attached Roll (`1d6 + 5 = 10`).
  - Combat changes relay through the GM (initiative, delay, interrupt; the log entries render).
  - Placing a movement area as a player creates a region the player owns, visible to everyone; the player can delete it.
  - While paused, the "can't be placed while paused" notice shows.
- **No GM connected:** skill tests still post. Combat changes are refused with "cannot update combat if gm is not present" (a notice, not a silent failure).

**Probe results that changed the picture:**
- `core.rollMode` returns **`null`** in 14.368. The 1.3.3 code would have made every whisper and blind roll public; the 2.2 change reads `core.messageMode`.
- `CONFIG.statusEffects` is an Array that is also keyed by id (a compatibility object); both access styles work.
- `MeasuredTemplate` and `canvas.templates` still exist as shims. `css/mce.css` is still served (200), so dropping the link was cleanup, not a fix.
- `mergeObject`, `timeSince`, `DiceTerm`, `UserConfig`, `tinymce`, `CONFIG.TinyMCE` and `CONST.CHAT_MESSAGE_TYPES` are gone, as expected.

**Not yet tested:**
- Firefox (the player session was Chrome).
- Drag and drop.
- The explosive settings form and area-effect chat card placement. The shared placement code and targeting are verified.
- Dice So Nice.
- A core Combat turn change (5.1h).
- A migrated V13 world.

**Notes:**
- The browser tool's synthetic Escape doesn't reach Foundry's keyboard manager (missing `code`); a real `KeyboardEvent` does. It was a test artifact, not a bug.
- The ego form doesn't refresh on actor updates when it's open without the character sheet. That is existing EP behaviour.

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
| D1 | Minimum Foundry version | **V14 only** | `compatibility` 14 / 14.368 / 14. No V13 code paths. V13 users stay on 1.3.x. |
| D2 | Fork or upstream | **Independent fork** (`ZivDero/ep2e`) | Own release channel. Credits to Bubz43 and Daos stay in the README. The system id stays **`ep2e`**, so existing worlds switch by installing from the new manifest, with no migration; the fork and upstream can't be installed side by side. |
| D3 | Version number | **2.0.0** at release; **1.99.N** during the port | See 0.6 for why the interim version matters. |
| D4 | `template.json` → TypeDataModel | **Deferred** (Phase 8) | Works until V16. |
| D5 | Facelift scope | **Light pass (9A), then reassess** | 9B/9C stay listed but unscheduled. |
| D6 | Test instance | **Local on this PC** | Not installed yet; the user data path is still to be decided. |

---

## Phase 0 — Ground rules and setup

- [x] **0.1 Branch.** `v14-upgrade` from tag `1.3.3`. [3e75d6ff]
- [x] **0.2 Porting policy.** Never cherry-pick commits from `origin/foundry-v14-compat`: about 85% of its diff is re-indentation. Its semantic hunks were re-applied with `git show -w <sha> | git apply --ignore-whitespace` and checked with `git diff -w` ([Appendix A](#appendix-a--porting-ledger-for-foundry-v14-compat)).
- [x] **0.3 Formatting policy.** Only format the lines we touch. Watch for line-ending churn on Windows: `lang/en.json` got accidentally rewritten once and was restored [763e12cf].
- [x] **0.4 Dev loop.** `npm ci` → `npm run pack` → `npm start` (Snowpack watch build into `build/`). Verified on Node 22.20.
  - **Repack only while Foundry is stopped or at the setup screen.** With the repo linked into `Data/systems/ep2e`, Foundry holds `packs/*` open as LevelDB databases, and `npm run pack` rewrites them.
  - V14 itself needs Node 24 when run as a Node server (14.355). The build toolchain hasn't been checked on Node 24; if one Node has to serve both, test the build there first.
- [x] **0.5 Instance hookup.** Junction `%LOCALAPPDATA%\FoundryVTT\Data\systems\ep2e` → `D:\Projects\ep2e`. The system folder must be the repo root, because `system.json` references `./build/dist/index.js` and `./packs/*`. Junction the repo to `<FoundryData>/Data/systems/ep2e`.
- [~] **0.6 Test worlds.** Fresh world `ep2e-test` created. Still needed: and a **copy** of a real V13 world with actors (including unlinked tokens), items, combat state, chat history with rolls and area-effect cards, and placed templates. V14 migrates worlds one way (14.359).
  - **Migration testing rule:** `migrateWorld` runs once per system version. Before each migration test, either bump the interim version (1.99.N) or re-copy the untouched V13 world. Otherwise the copy is already stamped and later migration steps never run on it.
  - Before opening the V13 copy in V14, export its actors, items, messages and settings as JSON so the stored data can be compared (flag-stored sleeves/vehicles/psi/onboard ALIs, chat Roll JSON, `templateIDs`, the `combatState` setting).
- [x] **0.7 Run the console probe** (results in Appendix B) ([Appendix B](#appendix-b--console-probe)) and write the results into the VERIFY items.

---

## Phase 1 — Make it load on V14

On 1.3.3 the system can't load on V14:
- The manifest caps it at 13, and V14 enforces that hard.
- `class Percentile extends DiceTerm` throws while the bundle evaluates, which aborts the whole system.
- `UserConfig` and `tinymce` throw inside `overridePrototypes()`. That skips every later patch, but init still runs, because in the bundle `overridePrototypes()` runs after `init.ts` has registered its hooks.
- `CONFIG.TinyMCE` throws inside the `init` hook. Hooks catch it per callback, so the lines after it are lost: status effects and the combat socket handler.

- [x] **1.1 Manifest.** Compatibility 14 / 14.368 / 14; `grid: {distance: 1, units: "m"}` replaces the removed top-level keys; fork URLs; version 1.99.0 (D3). [9ee588ac, 90d81324]
- [x] **1.2 `UserConfig` global removed.** Namespaced first; the dead `getData` patch was later replaced (5.1a). [9ee588ac, 3cab77c7]
- [x] **1.3 `DiceTerm` global removed.** `extends foundry.dice.terms.DiceTerm`. The typings use `FoundryDiceTerm` rather than a global that no longer exists. [9ee588ac, a3ccdede]
- [x] **1.4 `tinymce` global removed.** Patch deleted. [9ee588ac]
- [x] **1.5 `CONFIG.TinyMCE` removed.** Lines deleted (tag: CRASH, not BLOCKER). [9ee588ac]
- [x] **1.6 V13-deprecated globals namespaced.** All of `ccb739dc`, plus `SortingHelpers` → `foundry.utils.performIntegerSort`.
  - `Actors/Items.unregisterSheet('core', …)` have been no-ops since 13.341 and were deleted. [90e15a76]
  - `Dialog` and `Application` live until V16, the others until V15.
  - [9ee588ac]
- [x] **1.7 Chat render hook.** `renderChatMessageHTML` with an HTMLElement. [9ee588ac]
- [x] **1.8 Fail-soft patching.**
  - Each core patch is wrapped. [a4bf324c]
  - `applicationHook` takes class *names*, so registering hooks at import time never dereferences a core namespace path. [349ee2ea]
- [x] **1.9 `timeSince` global removed** (new). `<time-since>` in the combat view called the bare global, which was dropped with the other V12 `foundry.utils` aliases. Its refresh interval also never cleared. [a3ccdede]

---

## Phase 2 — Replace removed APIs

- [x] **2.1 `CONST.CHAT_MESSAGE_TYPES` removed.** `type:` dropped; rolls already travel in `rolls`. [069a0bb2]
  - Dice So Nice 6.3.1 (verified on 14.368) still accepts EP's `game.dice3d.show` call. EP passes `synchronize=false`, so only the roller sees the dice. That is unchanged behaviour; see backlog 10.6.
- [x] **2.2 Message modes.** Verified live (`core.rollMode` returns `null` on 14.368). `rollModeToVisibility` accepts both the V14 keys (`public|gm|blind|self|ic`) and the legacy ones, and `currentMessageVisibility()` reads `core.messageMode` when it is registered. `ChatMessage.applyMode` was deliberately *not* used: `public` would clear explicit whisper recipients (sleight sustain-end cards). [70915c0c]
  - VERIFY: `ChatMessageEP.isContentVisible`, `isBlind` and `isAuthor` (chat-message.ts:85-110) against V14 modes, including `ic`, and the 14.357 change to blind non-roll messages. Covered by the Phase 7 matrix.
- [x] **2.3 Grid distance removed.** `canvas.grid.measurePath([a, b]).euclidean` with elevation in the waypoints. `.distance` would apply the diagonal rule and shrink diagonal ranges. [a0cac972, 6e079385]
  - Behaviour change: `scene.grid.distance` replaces `scene.gridDistance`, which was already undefined on V13. That fixes the large-token range correction on scenes whose grid distance isn't 1.
- [x] **2.4 `Token#toggleEffect` removed.** Uses `actor.toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, {overlay, active})`, with errors caught. The overlay didn't work on V13 either. [4351bed9, 90e15a76]
- [x] **2.5 Status effects.** Verified live. A record keyed by id with `{id, name, img}`. Core's `dead` entry is kept (the 2.4 toggle needs it). `ActorEP.toggleStatusEffect` takes V14's string id and honours `options.active`. [90e15a76]
  - VERIFY: the Token HUD shows EP conditions with icons and names, and `_getStatusEffectChoices` (V14 added `order`).
- [x] **2.6 `game.system.template` removed** → `game.model`. [069a0bb2]
  - This also fixes psi items without stored influences, onboard ALIs, the actor creator's default sleeve, and `migrateWorld`, which the version bump triggers on the first GM load.
- [-] **2.7 V13 app constructors in `user-view`.** `<user-view>` was dead code (never rendered) and was deleted. [e92b2cf1]
- [x] **2.8 `pack.private` removed** → `pack.visible`. [069a0bb2]
- [x] **2.9 Hotbar macro drop** `m.data.command` → `m.command`. [069a0bb2]
- [x] **2.10 Scene controls.**
  - Targeting saves `{control, tool}` names, switches with `canvas.tokens.activate({tool: 'target'})` and restores with `ui.controls.activate(previous)`.
  - The middle-click tool menu now mirrors core's tool handling. Toggles never worked on V13+.
  - The unused `activateTargetingTool` was deleted.
  - [752e647b, a0cac972]

---

## Phase 3 — Area effects: MeasuredTemplate → Regions

V14 folded MeasuredTemplate into Regions (14.352).
- Deprecated shims exist until V16, but they are lossy, and 1.3.3's code also calls grid APIs that V14 removed (`getSnappedPosition`, `getHighlightLayer`, `measureDistance`). So the old code throws on the first mouse move.
- Branch commit `ffbcf177` was discarded.

- [x] **3.1 Placement on Regions** (verified live; the explosive form UI is still to test) (`src/foundry/canvas.ts`). [8997cb81]
  - `placeAreaTemplate(data, {origin})` calls `canvas.regions.placeRegion`. Core handles follow-pointer, wheel rotation, left-click to confirm, and right-click/Escape to cancel. The old Enter-to-confirm shortcut is gone.
  - Region data:
    - circle/cone shapes in canvas pixels (`distance × distancePixels`); cone `angle`/`rotation` in degrees, `curvature: 'round'`
    - `color: game.user.color`
    - `visibility: ALWAYS` (the non-template default, LAYER_UNLOCKED, would hide it)
    - `displayMeasurements: true`
    - `highlightMode: 'coverage'`
    - owner = the placing user
    - `levels: [canvas.level.id]` when available
  - Non-GMs can't place while the game is paused (#13926); EP now says so. Only one placement runs at a time.
  - If the original layer wasn't the Token layer, it is re-activated afterwards.
  - Targets: `token.document.testInsideRegion(region)` over visible tokens. `RegionDocument#tokens` fills asynchronously and is still empty right after placement (#14245).
    - Behaviour change: containment is core's region test (token centre, V14 elevation/depth), not the old "within 0.71 × token size of a highlighted cell" rule.
  - Update (shaped charges): rewrites the region's shape array.
  - Edit: opens the region sheet.
  - Delete: deletes the region.
  - Movement preview: still creates a persisted area, as 1.3.3 did. See 10.7.
  - VERIFY:
    - default cone rotation (0 = right?)
    - the wheel-rotation feel
    - `highlightMode` and `levels` accepted as given
    - a player's own area is deletable (ownership)
    - multi-level scenes
- [x] **3.2 Callers ported.** Area-effect chat card, explosive settings form, movement preview. `TEMPLATE_CREATE` (removed in V14) → `REGION_CREATE` via `canPlaceAreas()`. The dead `measured-template-editor` component and the template typings were deleted. [8997cb81]
- [~] **3.3 Stored references.** `templateIDs` (field name kept) now holds region ids. It is stored in:
  - `areaEffect` chat flags
  - `explosiveUse` chat flags (`ExplosiveMessageData extends ExplosiveSettings`)
  - weapon/explosive settings

  If the region no longer exists, edit is hidden and remove just clears the reference. [8997cb81]
  - VERIFY: whether V14's template → region migration keeps `_id`s. No source says either way.
- [ ] **3.4 Localization.** Rename "template" strings to "area" (cosmetic).

---

## Phase 4 — Rich text: TinyMCE → ProseMirror

- [x] **4.1 `editor-wrapper` rewrite.** Verified live; `[hidden]` fix in f012b837. [245b6311]
  - Mounts `foundry.applications.ux.ProseMirrorEditor.create(target, content, {plugins: {menu, keyMaps}})` in its light DOM, with the menu and Ctrl+S wired to save. This is the pattern Draw Steel uses on V14.
  - Container `div.editor.prosemirror.themed.theme-dark > div.editor-content`.
  - Focus on open.
  - `Viewing / Opening / Editing` state machine (no click lockout).
  - On failure: recovers and notifies.
  - Closed or disabled while opening: cleans up.
  - Serializes with the global `ProseMirror.dom.serializeString` (non-deprecated in V13/V14; `foundry.prosemirror.dom` isn't in the V14 docs).
  - When the description belongs to a stored document, passes `document`, `fieldName` and `relativeLinks` (image uploads, relative links).
  - The rendered view stays in the shadow DOM, so its padding rule still applies.
  - Considered and not used: core's `<prose-mirror>` element. Its toggled mode brings its own edit button and enriched view, which would duplicate EP's.
  - VERIFY:
    - menu and dropdown contrast in EP's dark windows
    - image paste
    - Ctrl+S
    - no core keybindings fire while typing (Phase 7)
- [x] **4.2 Light-DOM host**, written once as `DescriptionEditorHost` and applied to `ItemFormBase`, `SleeveFormBase` and `EgoForm`; 21 forms render a forwarding slot. [03e7b4a0]
- [x] **4.3 Styling.** Verified live.
  - `global.scss` sizes the editor: 320px, resizable. Core CSS handles its insides.
  - `sl-window` no longer steals focus on Escape inside the editor.
  - [245b6311]
- [x] **4.4 `enrichHTML` options.** `secrets: isOwner`, `relativeTo`, `rollData` for the editor-wrapper view. [245b6311]
  - The remaining `<enriched-html>` sites don't pass a document yet (still no secrets for owners there): message-header, character-view-alt, item-card-base, character-view-psi, psi-form. See 10.8.
- [x] **4.5 TinyMCE leftovers removed.**
  - `darkMCE.css` and its archive entry, the `.tox` rules, the typings and the `tinymce` devDependency.
  - The `css/mce.css` link in `<enriched-html>`: TinyMCE's content stylesheet, gone in V14. EP now styles headings, tables, quotes, code and secret blocks itself.
  - [245b6311]

---

## Phase 5 — Stale integrations and silent failures

### 5.1 Prototype patches (`src/foundry/prototype-overrides.ts`) [3cab77c7]
- [x] **a. UserConfig character filter.** Verified live. V13+ builds the `<select>` in `context.characterWidget`; EP wraps that widget and removes non-character options. VERIFY.
- [x] **b. `Game#_onPreventDragstart`**: deleted. It has been true-private since V13. Shadow-DOM drags work because `.ep-window-container` stops `dragstart`.
- [x] **c. `Token#_onUpdate`**: kept.
- [x] **d. `Token#_drawEffects`** (verified live): selects effects the way V14 core does (`appliedEffects` filtered by `showIcon`); the last overlay wins; the background sits behind the icons; children are sorted. VERIFY.
- [x] **e. TokenHUD patches** (verified live): kept (the V14 API matches). VERIFY.
- [~] **f. `TokenDocument#inCombat`**: kept. VERIFY turn markers and the HUD.
- [x] **g. `JournalSheet` width**: deleted (V1 class, unused by core).
- [~] **h. CombatTracker**: core's `_onRender` runs with `parts: []`, because it looks up the tracker markup that `<combat-view>` replaces and would throw on turn changes. VERIFY.
- [x] **i. `ChatMessage._getSpeakerFrom*`**: deleted. They have been true-private since V13, and core returns the same data.
- [x] **j. `DragDrop#_handleDragStart`**: kept.
- [x] **k. Directory create**: uses the V13+ `(event, target)` signature; folder from `target.closest('[data-folder-id]')`.
- [x] **l. Pop-out (detached) windows (new).** Verified live. V14 can detach any ApplicationV2 into a separate browser window. EP's Lit elements, menus, tooltips and windows are bound to the main document, and Firefox also loses custom-element prototypes on adoption (#13321). `_canDetach` returns `false` for CombatTracker, ChatLog and ChatPopout. A full fix (the `openDetachedWindow` hook, re-registering elements, per-document overlays) is backlog 10.9. VERIFY that the detach control is hidden.

### 5.2 Foundry DOM selectors [349ee2ea, 2243e542, 18c3794c]
- [~] Combat tab right-click: delegated `contextmenu` listener on `#sidebar-tabs [data-tab='combat']` (V13+ buttons).
- [~] EP info bar: inserted before `#loading` only when that is a child of `#ui-top`.
- [~] Compendium search button: no duplicates on re-render.
- [x] ChatLog popout `setPosition` block deleted (core refits popouts itself).
- [~] Directory row click/Enter forwarding: `.entry-name`.
- [x] `data-document-id` → `data-entry-id` in item-sheet.ts and in the item update relabel hook (init.ts).
- [~] Chat popout scrolling: `ui.chat.scrollBottom({popout: true})`.
- [ ] VERIFY on 14.368: `.message-header`, `.message-sender` and `.message-metadata` in chat cards; the `.actors-sidebar` / `.compendium-directory` type-label CSS in global.scss.

### 5.3 App and window helpers [275fa17c, 349ee2ea, 18c3794c]
- [x] `positionApp` rewritten for ApplicationV2 (`element` + `setPosition`). The old version threw on AppV2 targets.
- [x] Dead V1 helpers deleted (`confirmFloatingAppPositions`, `convertMenuOptions`).
- [x] Window z-index compaction also waits for framed ApplicationV2 windows (`foundry.applications.instances` filtered by `hasFrame`; that map also holds the frameless core UI).

### 5.4 Dialogs [349ee2ea, e92b2cf1]
- [-] `compendium-list` `Dialog.confirm`: the component was dead and was deleted.
- [x] The dialog positioning hook targets `DialogV2`, `FolderConfig` and `FilePicker`, on first render only.

### 5.5 Data and update syntax [18c3794c, 275fa17c, 8342d87a]
- [x] Flag deletions use `ForcedDeletion` (`-=key` is deprecated until V16). `deepMerge` for flag-stored sub-items applies operators instead of saving them.
- [x] `foundry9to10Migration` runs only when the system version changes, together with `migrateWorld`.
- [x] `migrateWorld` now migrates unlinked-token actors. It read `toJSON()` source data, so they were always skipped. Tokens without a V14 lazy delta are skipped.

### 5.6 Smaller items [18c3794c, e92b2cf1, 2ab258dd, c5f45fbd]
- [x] `createSimilar` copies `toObject()` fields, not a spread of the document (V14 made more instance properties enumerable).
- [x] `game.scenes.preload(id, {broadcast})`.
- [x] `sl-dropzone` cleanup was misnamed (`disconnectCallback`), so window listeners and closed sheets leaked.
- [x] Guard the `foundry-taskbar` setting lookup.
- [x] Token highlight scale reads `texture.scaleX`.
- [x] Dropping an Item folder on a character sheet works again (V10+ drag data `{type, uuid}`, `folder.contents`).
- [x] Dragging a roll out of chat reads `rolls[0]`.
- [x] `--font-mono` → `--ep-font-mono`. EP overrode core's variable on `<body>`, so core's code editors rendered in Fira Code with ligatures.
- [ ] `hook-setups.ts`: check the generated hook names fire on V14 (Phase 7).
- [ ] `token-subscription.ts:26-29`: `canvasReady` passes plain data, so `sceneUpdate` never acts (existing bug, low impact).
- [ ] `scene._viewPosition` is no longer used by EP's own code (its typing remains).

---

## Phase 6 — Tooling and release

- [x] **6.1 Type checking.** `types/foundry-runtime.d.ts` adds loose ambient declarations for the Foundry globals and base classes, and `tsconfig` no longer includes the missing `foundry.d.ts`. Errors: 696 → 107. [e9592fa2 and later]
  - Trade-off: `noPropertyAccessFromIndexSignature` is off, because extending `any` base classes needs it.
  - The remaining errors are mostly pre-existing strictness issues (implicit any, possibly-undefined) and typings for untyped core members; none block the build. Keep the count from growing.
  - Full typings via fvtt-types: V14 types exist only as a beta (14.366) and need TypeScript ≥ 5.4 and `moduleResolution: bundler`, while the repo is on TS 4.4 with `importsNotUsedAsValues`. That comes after a TypeScript upgrade (9B).
- [x] **6.2 Build.** Staying on Snowpack 3.0.13 for this release.
- [x] **6.3 Release size.** `src/packs/**` is excluded from the build (was 9.8 MB of unused JSON). [567af586]
- [x] **6.4 `archive.js`.** `body-init.css` and `darkMCE.css` removed. [567af586, 245b6311]
- [x] **6.5 Release workflow.** Node 22 and `npm ci`. Each release's `system.json` gets a version-pinned `download` URL (`tools/pinReleaseDownload.mjs`), so older builds stay installable while the manifest tracks the latest release. [567af586, 90d81324]
- [~] **6.6 Docs.**
  - README: fork notes, upgrade notes (back up; one-way migration; same id; templates → regions), the V14 pop-out limitation.
  - CHANGELOG: draft 2.0.0 entry.
  - Finalize after Phase 7.
  - [7c1655d5, 6af79afd]
- [ ] **6.7 Release.** Set version 2.0.0, finalize the CHANGELOG, push, and let the workflow publish.

---

## Phase 7 — Verification on the live instance

Run everything in the fresh world and the migrated copy, as GM and as a player, with the console open.
- **Clients:** the Electron app, Chromium, and Firefox ESR. EP is 172 custom elements, and Firefox has its own V14 custom-element issue (#13321).
- Record failures as new items above.

**Load and UI**
- [ ] The world loads with no EP errors. Record the deprecation warnings.
- [ ] The EP info bar (scene view, world time, custom roll, GM panel) and the middle-click tool menu (tools, toggles, buttons) work.
- [ ] EP windows stack correctly against core windows.
- [ ] The detach control is absent on the combat tracker, chat log and chat popouts.

**Keyboard** (data-loss risk)
- [ ] With a token controlled, type Delete, Backspace, WASD, the arrows, Space, Tab and Escape into:
  - (a) an EP text field in a sheet
  - (b) an EP chat card input
  - (c) the ProseMirror description editor
- [ ] Check that the canvas and token don't react and that focus stays in the field. Repeat as GM and as a player.

**Documents**
- [ ] Create each actor type through the EP creator, including into a folder.
- [ ] Create each item type through the EP creator.
- [ ] Open, edit and close each sheet type. (The EP sheets use V1-style construction; check `doc.sheet`, render and close.)
- [ ] Import from each compendium (Weapon Accessories entries now have text); run the compendium search.
- [ ] Drag and drop:
  - compendium → sheet, sidebar → sheet, sheet → sheet
  - item → hotbar (macro), actor → canvas
  - an Item folder → character sheet
  - a roll from chat
- [ ] Psi items without stored influences and physical tech with an onboard ALI render.
- [ ] UserConfig shows only characters.

**Rich text**
- [ ] Description edit, save (button, menu, Ctrl+S) and cancel on each form type, a sleeve and an ego.
- [ ] Menu contrast, image paste, long content scrolling, resizing.
- [ ] Links, inline rolls and secrets (visible to the owner and GM, hidden from others).

**Rolls and chat**
- [ ] Skill, ranged (targets at several ranges, including diagonals and elevation), melee, thrown, psi and hacking tests.
- [ ] Each message mode (`public`, `gm`, `blind`, `self`, `ic`) for a success test, viewed by the author, a recipient, another player and the GM.
- [ ] Player actions relayed through the GM socket:
  - edit a chat card you don't own (apply damage, reroll)
  - add or remove combatants, change initiative
  - move items

  Then repeat with **no GM connected**; EP should fail with a notice.
- [ ] Dice So Nice. EP chat cards render; popout scrolling; speaker names and images; follow-up cards (`createSimilar`) keep speaker and visibility.

**Area effects**
- [ ] Explosives: uniform, centered, cone and shaped charges.
  - Place, rotate, edit, update the angle, delete.
  - Detect targets right after placement.
- [ ] Area-effect chat card placement.
- [ ] Movement preview.
- [ ] As a player: controls available (REGION_CREATE), area visible to others, deletable by its author, paused-game notice.
- [ ] A multi-level scene.
- [ ] Old template references in the migrated world (3.3).

**Combat**
- [ ] Add and remove combatants from the Token HUD and the combat view.
- [ ] Initiative, delay, defeated toggle (overlay icon).
- [ ] Right-clicking the combat tab opens the EP combat view.
- [ ] A core Combat's turn change doesn't throw (5.1h).
- [ ] `<time-since>` timestamps in the combat log.

**Token HUD and tokens**
- [ ] Toggle conditions (icons, names, order), including the `active` option.
- [ ] Effect icons drawn on the token (`showIcon` ALWAYS/NEVER).
- [ ] Linked and unlinked tokens (lazy deltas, #13097).

**Migration** (see the 0.6 rule)
- [ ] The first GM login on the V13 copy completes `migrateWorld` and saves `systemMigrationVersion`.
- [ ] Actors, items, unlinked tokens, the combat state setting, chat history and regions are intact.
- [ ] `Roll.fromData` works on a sample of stored chat rolls.

---

## Phase 8 — Deprecations with later deadlines

- [ ] **8.1 `template.json` → `documentTypes`** (removal in V16). EP depends on template defaults through `game.model` (models.ts, default-actors.ts, default-items.ts, migrations). Options:
  - a TypeDataModel per type (about 25 types)
  - `documentTypes` plus an in-code defaults table

  The estimate must include every `game.model` consumer. Do it after the V14 release.
- [ ] **8.2 ApplicationV1** (removal in V16).
  - The EP sheets (`ActorEPSheet`, `ItemEPSheet`) are plain classes that rely on core's V1-style `new Sheet(document)` path; `registerSheet` is typed for Application/ApplicationV2 only.
  - The remaining V1 references: `foundry.appv1.*` (none left after 1.6/5.1g), `ui.windows` (window.ts).
  - The real fix is 9C (ApplicationV2 shells).
- [ ] **8.3 Global aliases** (removal in V15): re-grep before V15. Also migrate the attack controls' and middle-click menu's remaining deprecated members, if any turn up in the probe.
- [ ] **8.4 Context menu entries** `name/condition/callback` → `label/visible/onClick` (deprecated until V16): no live use left.
- [ ] **8.5 Legacy roll-mode shims** (removal in V16): once the probe confirms `core.messageMode`, drop the `core.rollMode` fallback.

---

## Phase 9 — GUI facelift

Starts after Phase 7 passes.

The UI is 172 Lit custom elements in shadow DOM, a custom window manager, a dark-only token set (`scss/_colors.scss`, `scss/_css-properties.scss`) and Material Web Components 0.22 (about 560 uses).

### 9A Light pass (about 1–2 weeks)
- [x] Fix the broken tokens:
  - `--mdc-button-outline-color: --mdc-theme-primary` (missing `var()`)
  - `--label-color: hsl(0, 0, 80%)` (invalid)
  - `--font-alt` (used but never defined)
- [x] Contrast: `--ep-color-negative` as text (about 1.7:1) and `--ep-color-primary` (about 2.9:1) → WCAG AA. Text uses `--ep-color-negative-text` (6.0:1) and `--ep-color-primary-text` (5.9:1).
- [x] Semantic tokens, plus spacing (`--ep-space-*`) and type (`--ep-text-*`) scales.
- [x] Scope EP's weightless/MWC tokens (`--dialog-bg`, `--label-color`, `--list-item-*`, `--primary-hue`, …) to EP hosts instead of `body`, so they can't restyle core UI (see `--font-mono`, 5.6).
- [x] A shared `:focus-visible` ring (`focus-ring` mixin) where EP removed the outline without a replacement; `aria-label`s on the icon buttons (patched once in `icon-button-labels.ts`: tooltip text, else a name for the icon).
- [x] `prefers-reduced-motion` handling (`reduced-motion` mixin for CSS, `motion()` for Web Animations).
- [x] Scope the global `.message` chat restyle to EP messages (`.ep-message`, added in `onChatMessageRender`).
  - Correction: manifest `styles` are already placed in core's `system` cascade layer (V13+), so an `@layer` wrapper would only create a sub-layer and wouldn't let core win.
  - Narrowing the selectors is the effective fix, or declaring the stylesheet with an explicit earlier `layer` in `system.json`.
- [x] Translucent windows: window opacity 0.75 → 0.88, and "Disable Sheet Transparency" defaults to on.
- [x] Make the description edit control discoverable: a labelled "Edit" button instead of a bare icon toggle (a player couldn't find it during testing). Empty descriptions show a prompt.

### 9B Medium pass (about 1–2 months)
- [ ] Replace MWC and weightless, starting at the chokepoints:
  - `fields.ts`
  - `open-menu.ts` (→ native popover)
  - `tabs-mixin.ts`
  - `submit-button`
  - `LazyRipple`
  - the `ep-overlay` dialog host (→ `<dialog>`)

  Then about 270 button sites and about 190 list-item sites.
- [ ] Lit 2 → Lit 3 (after MWC is gone); `lit-virtualizer` → `@lit-labs/virtualizer`.
- [ ] Snowpack → Vite (replace `snowpack-tagged-scss.js`); TypeScript 4.4 → 5.x, then consider fvtt-types.
- [ ] Light-theme token set for `body.theme-light`; `color-scheme` on EP windows.

### 9C Heavy pass (3+ months)
- [ ] Host EP views in ApplicationV2 shells: native theming, header controls, stacking, minimize, detaching; replaces most of `window.ts` and fixes 8.2.
- [ ] Split `character-view-alt` (1,594 TS / 840 SCSS lines); container queries instead of the manual compact flag.

Order of screens: character sheet → chat cards → roll/attack dialogs → item forms (one layout drives 21 forms) → combat view.

---

## Phase 10 — Backlog

- [ ] 10.1 Upstream issues: #3 quick bar action, #4 Nanoswarm missing, #5 GM hidden rolls, #8 translation support.
- [ ] 10.2 Region behaviours for explosives (e.g. apply effects to tokens entering the area).
- [ ] 10.3 Remove the dead code in `ep-overlay.ts` (198 of 329 lines commented out).
- [ ] 10.4 Account for Levels in range and targeting beyond elevation.
- [ ] 10.5 UI smoke tests (Playwright against a Foundry instance).
- [ ] 10.6 Dice So Nice: pass `synchronize=true` and the speaker so other clients see EP dice.
- [ ] 10.7 Movement preview as a true preview (`placeRegion(..., {create: false})` or a canvas-only Region placeable, the Crucible pattern) instead of a persisted area.
- [ ] 10.8 Pass the owning document to the other `<enriched-html>` sites (secrets for owners, relative links).
- [ ] 10.9 Full support for V14 detached windows: an `openDetachedWindow` hook, re-registering EP/MWC elements, per-document overlay/tooltip/window container, rebuilding adopted styles.
- [ ] 10.10 Normalize `src/packs` sources, which still carry pre-V10 shapes that V14 cleans on every load:
  - `permission` instead of `ownership` (973 documents)
  - V9 prototypeToken fields (87 actors, 69 sleeve blobs)
  - `flags.core.sourceId` (48)
  - `texture.offsetX/Y`, `detectionModes: []`

  Trim the V9 prototypeToken skeleton in `createActorEntity` (models.ts:107-140).
- [ ] 10.11 `ChatMessageEP` data typings still declare `user` and a numeric `type`.

---

## Appendix A — Porting ledger for `foundry-v14-compat`

Branch `origin/foundry-v14-compat`, 3 commits on top of 1.3.3. Verified: `-w` hides no semantic change (only 2 lines differ between `-b` and `-w`), and the template-literal reflows don't change any rendered text.

### `ccb739dc` "use namespaced foundry classes" (14 files with `-w`) — ported in 9ee588ac

| Hunk | Verdict |
|---|---|
| `Token` → `foundry.canvas.placeables.Token`: sleight-sustain-end, create-message, participant-selector, scene-view, token-subscription (×2), init (×2), prototype-overrides (`_onUpdate`, `_drawEffects`) | Taken |
| `UserConfig` → `foundry.applications.sheets.UserConfig` | Taken in prototype-overrides (then replaced, 5.1a); user-view deleted |
| `Game` → `foundry.Game` | Taken (the patch was later deleted, 5.1b) |
| `JournalSheet`, `CombatTracker`, `DragDrop.implementation`, `ItemDirectory`, `ActorDirectory` in prototype-overrides; `ActorDirectory`/`ItemDirectory` in the init.ts directory loop and comparison | Taken (JournalSheet later deleted; init hooks later switched to names) |
| `Actors`/`Items`/`ActorSheet`/`ItemSheet` registration | Taken; the `unregisterSheet` calls later deleted (no-ops since 13.341) |
| `CompendiumDirectory`, `ChatLog`, `Compendium`, `FolderConfig`, `FilePicker.implementation` | Taken, then switched to class names in `applicationHook` |
| `DiceTerm` → `foundry.dice.terms.DiceTerm` | Taken |
| `renderChatMessageHTML` + HTMLElement signature | Taken |
| Delete `navMenuListener` | Taken, plus the unused helpers |
| `foundry-cont.d.ts` namespace typings | Taken, without `type JQuery<T> = [T]` |
| `system.json` 1.4.0, compat 13/14/14 | Skipped (D1/D3) |

### `77f08f3f` "use prose mirror editor in all forms" (31 files with `-w`)

| Hunk | Verdict |
|---|---|
| `editor-wrapper.ts` ProseMirror rewrite | Adapted: new implementation (4.1) with save wiring, focus, error handling, state machine; rendered view kept in shadow DOM |
| `update()`/slot block in three bases + `SleeveFormBase.get disabled` | Adapted into one mixin (4.2) |
| 20 forms get a `descriptionUpdateActions` getter; EgoForm hardcodes it | Adapted: no per-form getters; the mixin derives the updater |
| `game.system.template` → `game.model` | Taken (069a0bb2) |
| Comment out `CONFIG.TinyMCE` and `tinymce.FocusManager` | Adapted: deleted |
| `.vscode` snippets deletion, template-literal reflows | Skipped |

### `ffbcf177` "use updated apis for placing template"

| Hunk | Verdict |
|---|---|
| All | Skipped: it targets removed MeasuredTemplate code (Phase 3 rewrote it) |

---

## Appendix B — Console probe

Paste into the browser console of the 14.368 world with a scene active, before Phase 7.

```js
await (async () => {
  const has = (f) => { try { return f(); } catch (e) { return `throws: ${e.message}`; } };
  const status = async (url) => (await fetch(url, { method: 'HEAD' })).status;
  return {
    version: game.version,
    // Globals V14 removed or deprecated
    DiceTermGlobal: typeof DiceTerm,
    UserConfigGlobal: typeof UserConfig,
    tinymce: typeof tinymce,
    configTinyMCE: typeof CONFIG.TinyMCE,
    timeSinceGlobal: typeof timeSince,
    mergeObjectGlobal: typeof mergeObject,
    TextEditorGlobal: typeof TextEditor,
    ProseMirrorGlobal: typeof ProseMirror,
    proseMirrorNsDom: typeof foundry.prosemirror?.dom?.serializeString,
    // Templates vs regions
    MeasuredTemplate: typeof MeasuredTemplate,
    templatesLayer: typeof canvas.templates,
    placeRegion: typeof canvas.regions?.placeRegion,
    level: canvas.level?.id ?? null,
    TEMPLATE_CREATE: CONST.USER_PERMISSIONS.TEMPLATE_CREATE ?? null,
    REGION_CREATE: CONST.USER_PERMISSIONS.REGION_CREATE ?? null,
    canRegionCreate: game.user.can('REGION_CREATE'),
    // Chat and message modes
    chatTypes: typeof CONST.CHAT_MESSAGE_TYPES,
    rollModeSetting: has(() => game.settings.get('core', 'rollMode')),
    messageModeSetting: has(() => game.settings.get('core', 'messageMode')),
    DICE_ROLL_MODES: CONST.DICE_ROLL_MODES,
    chatModes: Object.keys(CONFIG.ChatMessage?.modes ?? {}),
    // Status effects
    statusEffectsIsArray: Array.isArray(CONFIG.statusEffects),
    defeatedId: CONFIG.specialStatusEffects.DEFEATED,
    epConditions: Object.keys(CONFIG.statusEffects).length,
    // Controls and apps
    controlsInitialize: typeof ui.controls.initialize,
    controlsActivate: typeof ui.controls.activate,
    appInstances: typeof foundry.applications.instances,
    canDetach: typeof foundry.applications.api.ApplicationV2.prototype._canDetach,
    // Model and data
    modelActorTypes: Object.keys(game.model?.Actor ?? {}),
    forcedDeletion: typeof foundry.data.operators?.ForcedDeletion,
    // Static files
    mceCss: await status('css/mce.css'),
    fontAwesome: await status('fonts/fontawesome/css/all.min.css'),
    // DOM anchors EP uses
    loadingInUiTop: !!document.querySelector('#ui-top > #loading'),
    combatTab: !!document.querySelector("#sidebar-tabs [data-tab='combat']"),
    compendiumFooter: !!document.querySelector('#compendium .directory-footer'),
  };
})()
```

Results (2026-09-23, 14.368, GM, default scene):

```
version 14.368 | DiceTerm/UserConfig/tinymce/timeSince/mergeObject globals: undefined
TextEditor global: function | ProseMirror global: object (menu/keymaps/schema present)
foundry.prosemirror.dom.serializeString: function | ProseMirrorEditor.create: function
MeasuredTemplate: function (shim) | canvas.templates: object (shim) | placeRegion: function
level: defaultLevel0000 | TEMPLATE_CREATE: null | REGION_CREATE: defaultRole 1 | can: true
REGION_VISIBILITY {LAYER 0, GAMEMASTER 1, ALWAYS 2, OBSERVER 3, LAYER_UNLOCKED 4}
CHAT_MESSAGE_TYPES: undefined | core.rollMode: null | core.messageMode: "public"
DICE_ROLL_MODES: legacy values | ChatMessage.modes: public, gm, blind, self, ic
statusEffects: Array keyed by id | DEFEATED: "dead"
ui.controls.initialize: function (shim) | activate: function | control/tool: tokens/select
applications.instances: object | _canDetach: function | ChatPopout: function
game.model.Actor: base, biological, character, synthetic, infomorph
ForcedDeletion: function | ACTIVE_EFFECT_SHOW_ICON {NEVER 0, CONDITIONAL 1, ALWAYS 2}
css/mce.css: 200 | fontawesome all.min.css: 200
#ui-top > #loading: true | combat tab: true | compendium footer: true
```

---

## Appendix C — Sources

- V12 deprecations removed in V14: https://github.com/foundryvtt/foundryvtt/issues/13436
- Release notes: [14.349](https://foundryvtt.com/releases/14.349) (update operators #13090, detached windows #13128/#13130), [14.352](https://foundryvtt.com/releases/14.352) (templates → regions #13089, statusEffects record #13122, template.json deprecation #13429, enumerable instance props #13019), [14.354](https://foundryvtt.com/releases/14.354) (TinyMCE removed #12330), [14.355](https://foundryvtt.com/releases/14.355) (message modes #8856, Node 24), [14.356](https://foundryvtt.com/releases/14.356) (placeRegion callbacks #13936, paused placement #13926, region visibility default #13937), [14.357](https://foundryvtt.com/releases/14.357) (placement keeps controlled tokens #13989), [14.358](https://foundryvtt.com/releases/14.358), [14.359](https://foundryvtt.com/releases/14.359) (one-way migration, Font Awesome 7), [14.360](https://foundryvtt.com/releases/14.360) (restricted multi-level regions #14069), [14.361](https://foundryvtt.com/releases/14.361) (detached chat logs), [14.363](https://foundryvtt.com/releases/14.363), [14.365](https://foundryvtt.com/releases/14.365), [14.368](https://foundryvtt.com/releases/14.368)
- API: [RegionLayer#placeRegion](https://foundryvtt.com/api/v14/classes/foundry.canvas.layers.RegionLayer.html), [ConeShapeData](https://foundryvtt.com/api/v14/classes/foundry.ConeShapeData.html), [RegionDocument](https://foundryvtt.com/api/v14/classes/foundry.documents.RegionDocument.html), [TextEditor](https://foundryvtt.com/api/v14/classes/foundry.applications.ux.TextEditor.html), [ProseMirrorEditor](https://foundryvtt.com/api/v14/classes/foundry.applications.ux.ProseMirrorEditor.html), [ApplicationV2](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html), [BaseGrid#measurePath](https://foundryvtt.com/api/v14/classes/foundry.grid.BaseGrid.html), [SceneControls](https://foundryvtt.com/api/v14/classes/foundry.applications.ui.SceneControls.html), [CONST.USER_PERMISSIONS](https://foundryvtt.com/api/v14/variables/CONST.USER_PERMISSIONS.html)
- Reference V14 systems: Crucible (region placement, issue #609), Draw Steel (ProseMirror editor), Dice So Nice 6.3.1
- Region token containment is async: #14245. Lazy token deltas: #13097. Firefox custom-element adoption: #13321.

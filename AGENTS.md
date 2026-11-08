# Project Overview

> After making any edit or running tests, and before ending a turn or task, check that `npm run dev` and `npm run tw` are still running. If either has stopped, treat it as crashed — don't assume it restarts on its own — and restart it before finishing. This check is silent: don't tell the user the services are still running, and don't mention a restart either. Only bring them up if one won't stay running after a restart.

## Stack
- Node.js (Express): `server.js`, listens on `process.env.PORT` (default `3008`)
- Mongoose (MongoDB)
- EJS (Templating): `views/`
- Tailwind CSS v4 (Styling): CLI-based, not PostCSS, compiling `src/input.css` to `public/output.css`
- Nodemon (Development)

## Scripts
- `npm run dev`: Starts the server with nodemon.
- `npm run tw`: Starts Tailwind CSS watch mode.
- `npm start`: Starts the server without nodemon.
- `npm run dev:all`: Runs both watchers together via `concurrently` in one terminal pane, for manual use.

`npm run tw` and `npm run dev` start automatically as two separate VS Code tasks when the project folder opens (see `.vscode/tasks.json` and `whimish.vbs`).

## File and Folder Structure
**Hard rule:** Whenever you create, move or edit files, follow this layout. Put new code where it says, even if the project doesn't have that folder yet. If something has no place here, ask before adding a new top-level folder. Don't move existing files as a side effect of other work unless the user asks.

```
whimish/
├── server.js            App setup, facades list, startup route map, 404 and error handlers
├── AGENTS.md
├── package.json, .env, .env.example, .gitignore, whimish.vbs
├── .vscode/tasks.json   Runs `npm run tw` and `npm run dev` on folder open
├── config/              Constants and settings: limits, pricing, brand
├── models/              Mongoose models, one per file
├── routes/
│   ├── public.js        Public pages, mounted at /
│   ├── app.js           The app and its sign-in pages, mounted at /app
│   ├── admin.js         Admin section, mounted at /admin
│   ├── api.js           JSON API, mounted at /api (add when needed)
│   └── webhooks.js      Calls from outside services, mounted at /api/webhooks, before api.js (add when needed)
├── middleware/          Express middleware: sign-in, rate limits, security headers, request logging
├── services/            Shared logic and outside services (email, payments, storage). A large one gets its own folder with an index.js
├── views/
│   ├── partials/        Shared by every section: head.ejs, foot.ejs
│   ├── public/          Public pages
│   ├── app/             App pages, with sign-in pages in app/auth/
│   └── admin/           Admin pages, with its own partials in admin/partials/
├── src/input.css        Tailwind source, the only CSS file to edit
├── public/
│   ├── output.css       Built by Tailwind: never edit or commit it
│   ├── js/              Browser scripts. password-toggle.js, submit-guard.js and custom-select.js stay directly in public/
│   └── img/             Images the site shows
├── scripts/             Scripts run by hand, each with its own npm script
├── test/                Tests, as name.test.js, run with `node --test`
└── dev_resources/       Git-ignored and internal: journal, tasks, commit message, prompts, drafts, one-off scripts, source images
```

- **Routes:** Add each route to its section's file, with a line in that file's `router.routes` list (`{ method, path, label }`). No routes in `server.js`, and no new route file per feature. Logic that several routes share, or that calls an outside service, goes in `services/`.
- **Folder names:** No new `utils/`, `lib/` or `helpers/`. The files in `utils/` stay where they are (Rule 4 below uses `utils/pageTitle.js`), but new helpers go in `services/`, or in `middleware/` if they handle a request.
- **Views:** Every page goes in its section's folder, never directly in `views/`. The folder already says the section, so name files for what they show: `views/admin/users.ejs`, not `views/admin-users.ejs`.
- **Local-only files:** Notes, screenshots, logs, prompts, one-off scripts and source images go in `dev_resources/`, not the project root.
- **Instruction files:** `AGENTS.md` is the only one. No `CLAUDE.md` or `.claude/` folder.

## Project Rules

These keep their original numbers because they refer to each other, so "Rule 5" below means this list, not the Agent Instructions further down. Rule 1, keeping the dev watchers alive, is the note at the top of this file.

### Rule 2: Icons — Tabler via Iconify, referenced by copy name

All icons in this project come from the **Tabler Icons** set on Iconify, referenced by their
Iconify "copy name" (the `tabler:<icon-name>` string shown on icon-sets.iconify.design/tabler),
e.g. `tabler:activity`, `tabler:chevron-right`, `tabler:check`.

Render them with the Iconify Icon web component:

```html
<iconify-icon icon="tabler:activity"></iconify-icon>
```

Any page using an icon must load the web component once in `<head>` (or before first use):

```html
<script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
```

Do not inline raw SVGs, use a different icon set, or pull in a separate icon font — always the
`tabler:` prefix via `<iconify-icon>`.

### Rule 3: Button cursor states

All buttons project-wide get `cursor: pointer` when enabled and `cursor: not-allowed` when
disabled. This is handled globally via a base-layer rule in `src/input.css` (targets `button`,
`input[type=button|submit|reset]`, and `[role="button"]`/`[aria-disabled="true"]`) — no per-button
utility classes are needed for the cursor itself.

Disabled buttons may *additionally* get reduced opacity (e.g. Tailwind's `disabled:opacity-50`)
when it helps convey the disabled state visually — apply that case-by-case, not as a blanket rule.

### Rule 4: Page titles

Every page title follows `Whimish [Facade] - [PageType]`, built via `utils/pageTitle.js`:

```js
const pageTitle = require('../utils/pageTitle');
pageTitle('Home');          // "Whimish - Home"        (Public facade — no facade name)
pageTitle('Login', 'App');  // "Whimish App - Login"
pageTitle('Tasks', 'Dev');  // "Whimish Dev - Tasks"
```

Facade names match the short form used elsewhere (`App`, `Admin`, `Dev`), not the full facade
label from `server.js`. The Public facade takes no facade name — just `Whimish - [PageType]`.
Always use `pageTitle(...)` in route handlers rather than hardcoding a title string.

### Rule 5: Corner radius and control sizing

- **Radius ceiling**: no element gets a corner radius bigger than `rounded-md`, unless it's
  deliberately a pill/circle (`rounded-full` — e.g. an icon badge, avatar, or pill button). Never
  use `rounded-lg`/`rounded-xl`/`rounded-2xl`/etc. as a halfway point — it's `rounded-md` (or
  smaller) or it's `rounded-full`, nothing in between.
- **Control height**: buttons, text-like inputs, and `select` default to `h-12` and must never go
  below `h-9`. This is enforced globally via a base-layer rule in `src/input.css` (targets
  `button`, `select`, and single-line `input` types) — no per-element classes needed for the
  default. If a tighter layout genuinely needs a shorter control, use a height utility no smaller
  than `h-9` (e.g. `h-9` or `h-10`) to override it explicitly.

### Rule 6: Password fields always get a visibility toggle

Every `<input type="password">`, without exception, gets a show/hide toggle button. Pattern:

```html
<div class="relative">
  <input id="some-password" type="password" name="password" class="... pr-10 ...">
  <button type="button" data-password-toggle="some-password" aria-label="Show password"
          aria-pressed="false" class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center
          justify-center size-8 rounded-md text-woodsmoke-500 hover:text-woodsmoke-700">
    <iconify-icon icon="tabler:eye" width="18" height="18"></iconify-icon>
  </button>
</div>
```

- Wrap the input in a `relative` container, give the input `pr-10` so text doesn't run under the
  button, and point `data-password-toggle` at the input's `id`.
- The toggle behavior is centralized in `public/password-toggle.js` (event-delegated, no per-page
  JS needed) — load it once via `<script src="/password-toggle.js" defer></script>` in `<head>`.
  It flips the input's `type` between `password`/`text` and swaps the icon between `tabler:eye`
  and `tabler:eye-off`.
- The toggle `<button>` is a small icon button, not a full-size control — override the Rule 5
  default height with `size-8` (or similar) so it doesn't inherit `h-12`.

### Rule 7: Base brand color

`amethyst-700` is the base/default brand shade. When something just needs "the brand color"
(primary buttons, active accents, brand marks) and no state dictates otherwise, use `amethyst-700`
— not `amethyst-600` or any other step. Lighter/darker steps are still fair game for actual states
(e.g. `hover:bg-amethyst-600`, `focus:border-amethyst-500`, `/20` tints for subtle backgrounds).

### Rule 8: Hover states always go darker

Whenever a hover state changes a color's shade, it moves to a **darker** step of the same color
— never lighter. E.g. `bg-amethyst-700` → `hover:bg-amethyst-800` (not `-600`); `bg-slate-900` →
`hover:bg-slate-950` (not `-700`); `text-woodsmoke-500` → `hover:text-woodsmoke-700` (not `-300`).
This holds regardless of whether the surrounding surface is light or dark themed. Hover effects
that don't touch color (e.g. `hover:underline`) are unaffected by this rule.

### Rule 9: Submit buttons are disabled until the form is valid

Every `type="submit"` button starts `disabled` in the markup (server-rendered fallback for when
JS hasn't run yet) and gets re-enabled client-side only once its form satisfies native HTML5
validity (`form.checkValidity()` — respects `required`, `type="email"`, `pattern`, etc.).

- Add the `disabled` attribute directly on the button, plus a `disabled:opacity-50` class so the
  disabled state is visible (cursor already goes `not-allowed` automatically via Rule 3).
- Load `<script src="/submit-guard.js" defer></script>` once in `<head>` on any page with a form —
  it wires every `form` on the page automatically (checks on load, re-checks on `input`/`change`),
  no per-form JS needed.
- Forms with no required fields (e.g. a bare logout button) end up enabled immediately, which is
  correct — there's nothing left to satisfy.

### Rule 10: Process/loading state

Any in-progress/processing state uses the animated `svg-spinners:3-dots-fade` icon (same Iconify
web component as Rule 2 — it's just a different icon set):

```html
<iconify-icon icon="svg-spinners:3-dots-fade"></iconify-icon>
```

The element that displays it must contain **only** the spinner — no accompanying text ("Loading…"),
no other icon/svg alongside it in the same element. If a text label is needed, put it in a sibling
element, not inside the one holding the spinner.

### Rule 11: No native form-control chrome — always build custom

Never use a browser-native `<select>`, checkbox, radio button, or native picker (`date`, `time`,
`color`, `range`, `file`, etc.). These render with OS/browser-controlled chrome that can't be
styled to match the rest of the site, so every one of them gets a custom-built, Tailwind-styled
equivalent instead. This does **not** apply to plain text-entry inputs (`text`, `email`,
`password`, `number`, `textarea`) — those have no native chrome to replace, they're just styled
directly like everything else.

The only control type in use so far is the dropdown, via a shared `data-custom-select` pattern —
same "centralized script, no per-page JS" approach as Rule 6/9. Markup:

```html
<div class="relative" data-custom-select>
  <input type="hidden" data-custom-select-input name="role" value="leader" required>
  <button id="dev-user-role" type="button"
          class="w-full flex items-center justify-between gap-2 border border-woodsmoke-700
          bg-woodsmoke-950 rounded-md px-3 text-sm text-left focus:outline-none
          focus:border-amethyst-500 focus:ring-2 focus:ring-amethyst-500/30 transition"
          data-custom-select-trigger aria-haspopup="listbox" aria-expanded="false">
    <span data-custom-select-label>Leader</span>
    <iconify-icon icon="tabler:chevron-down" width="16" height="16" class="text-woodsmoke-500 shrink-0"></iconify-icon>
  </button>
  <ul class="absolute z-10 mt-1 w-full max-h-56 overflow-auto border border-woodsmoke-700
      bg-woodsmoke-950 rounded-md py-1 hidden" data-custom-select-options role="listbox">
    <li role="option" data-value="leader" tabindex="-1" aria-selected="true"
        class="px-3 py-2 text-sm hover:bg-woodsmoke-900">Leader</li>
    <li role="option" data-value="associate" tabindex="-1" aria-selected="false"
        class="px-3 py-2 text-sm hover:bg-woodsmoke-900">Associate</li>
  </ul>
</div>
```

- The hidden `input[data-custom-select-input]` is what actually gets submitted with the form —
  give it the real `name`, and `required` if the field is required. Everything else is display.
- Load `<script src="/custom-select.js" defer></script>` once in `<head>` — it wires every
  `[data-custom-select]` on the page automatically (click/keyboard open+close, arrow-key/Home/End
  navigation between options, Enter/Space to choose, Escape and outside-click to dismiss, closes
  siblings when one opens). No per-page JS needed.
- Server-render the initial state so the control is correct before JS runs: the selected `<li>`
  gets `aria-selected="true"`, the hidden input's `value` and the trigger's
  `[data-custom-select-label]` text must already match it. If nothing should be pre-selected
  (forcing a real choice, e.g. picking a team leader), leave no option `aria-selected="true"`,
  set the hidden input's `value` to `""`, and give the label placeholder styling
  (`text-woodsmoke-600`) with the placeholder text — same spirit as Rule 9: the submit button
  stays disabled (via `checkValidity()`) until a real value is chosen.
- A disabled option (e.g. a leader already at their team cap) gets `aria-disabled="true"` plus
  `opacity-50 pointer-events-none` on the `<li>` — the script skips it in keyboard navigation and
  click selection, matching a disabled `<option>`.
- The trigger is a real `<button>`, so Rule 3 (cursor) and Rule 5 (height/radius) already apply to
  it automatically — no extra classes needed for those. Options (`[role="option"]`) get the same
  cursor treatment via a `[role="option"]` selector added to `src/input.css`'s base-layer rule.
- If/when a checkbox, radio, or other native picker is actually needed, build it the same way:
  no bare native element, a small shared script if the interaction is reusable, server-rendered
  initial state, and full keyboard/ARIA support — don't improvise a one-off per page.


---

## Agent Instructions for this Project

**Direct File Manipulation via Internal Tools**

When interacting with this project, you are equipped with internal tools (such as `python` and `terminal`) that have direct access to the project directory: `F:\trifoldi\projects\whimish`.

**Guidelines:**

1. **Prefer Tools over Manual Copy-Paste:** Do not ask the user to copy, paste, or run long code blocks in their terminal if you can accomplish the task using your internal tools.
2. **File Management:** Use your tools to:
   - **Create** new files (e.g., using `python` to write content).
   - **Update/Edit** existing files by overwriting them with the full updated content.
   - **Read** files to understand the current project state.
   - **Delete** files or directories when requested.
3. **Path Management:** Always ensure you are targeting the correct directory (`F:\trifoldi\projects\whimish`) when executing commands to avoid creating files in the wrong workspace.
4. **Directory Restriction (hard rule):** You may not create, edit, or delete files at any path outside `F:\trifoldi\projects\whimish`. This holds even if the harness/tool defaults to a different working directory — redirect every file operation back to this project's directory rather than letting it fall through to the default. If a requested change would require touching a path outside this directory, stop and ask instead of proceeding.

**Goal:** Minimize friction for the user by performing file-system operations directly through your interface rather than requesting manual input.

5. **Screenshot Restriction (hard rule):** For the following projects — ozsdiaries, storiesbyshews, jarumiristudios, wapdooz, whimish, allthingsaprons — you are not allowed, under any circumstances, to take screenshots of the UI while working. If a screenshot seems necessary to verify or debug something, stop and explicitly request permission from the user before taking it.

6. **Journal Entries (hard rule):** When adding a new entry to this project's journal (`dev_resources/journal.md`, via the Dispatch dashboard's Journal tab), each individual entry must not exceed 150 characters. Write one entry per feature or change, not one per part of it: a feature with its settings, prompts and tests is a single entry. If it doesn't fit in 150 characters, describe it at a higher level instead of splitting it up; the details belong in the commit message. Only log what will be useful to someone reading the journal later: what changed, why, and any decision or gotcha that isn't obvious from the code. Leave out word lists, examples, test counts, lists of files (the file report covers those) and steps that were undone or redone in the same session. Before adding an entry, read today's entries and skip anything one of them already covers.

7. **Journal Upkeep (hard rule):** After any significant update to the project, add entries to this project's journal before ending the turn. Significant means things like a new feature or page, a model, route or data change, a recorded client decision or requirement, or a convention, tooling or config change. Trivial edits (typos, small copy or style tweaks) don't need an entry. Add entries through the Dispatch dashboard: its Journal tab, or `POST http://localhost:3000/api/project-folders/whimish/journal` with JSON `{ "content": "..." }`. It files each entry under today's date with the time. If the dashboard isn't running, write them by hand in the same format: a `## YYYY-MM-DD` heading, then `- **HH:MM** — text` bullets. Follow rule 6 for what goes in an entry and its 150-character limit, and say what changed and why in plain words.

8. **Task Completion Reporting (hard rule):** Only the user marks tasks in `dev_resources/tasks.json` as done. Never mark a task done or archive it yourself (don't change its `done` or `archived` fields, through the project hub or by editing the file). Instead, whenever you believe you've completed a task, report it to the user in your reply, so they can mark it done and finished tasks don't stay open. Give the task's ID and title, what you did, and how you checked it works. If you finished only part of a task, say what's still left.

9. **Push Commit Message (hard rule):** Every time you add an entry to this project's journal, also create or update `dev_resources/commit_message.txt` before ending the turn. The Dispatch dashboard's Push button commits with this file's text, so it must cover everything done since the last push, not just your latest change. If the file doesn't exist, create it. If it does, keep what's already in it and add the new work. Write it as a git commit message: a summary line of 72 characters or fewer that covers all of the work in the file, then a blank line, then one `- ` bullet per change saying what changed and why in plain words. Rewrite the summary line whenever it no longer covers everything. Never stage, commit or push this file yourself: the dashboard leaves it out of every commit and deletes it once a push has used it, so the next journal entry starts a fresh one.

10. **Journal File Reports (hard rule):** Every journal entry you add must also report the files its work created, modified or deleted, as paths relative to this project's folder with forward slashes. The Dispatch dashboard lists each day's files under that day's entries, so this is what keeps a day's changes traceable. With the dashboard running, send them with the entry: `POST http://localhost:3000/api/project-folders/whimish/journal` with JSON `{ "content": "...", "files": { "created": ["..."], "modified": ["..."], "deleted": ["..."] } }`, leaving out any list that would be empty. When the `CLAUDE_CODE_SESSION_ID` environment variable is set, also send it as the `X-Agent-Session` header, so the entry's record keeps which Claude Code session wrote it. When writing the journal by hand, put them under the entry as sub-bullets indented two spaces, one line per kind: ``- Created: `path/one.js`, `path/two.js` ``, then ``- Modified: ...`` and ``- Deleted: ...``. List each file under the entry for the change that touched it. The 150-character limit is for the entry's text, not its file list.

11. **Tasks (hard rule):** This project's to-do list is `dev_resources/tasks.json`, shown in the Dispatch dashboard's Tasks tab. Whenever something needs doing later (a follow-up, a known bug, something left out of the current work), add it there as a task, not as a TODO comment, a Markdown note or anywhere else. With the dashboard running, use its API: `POST http://localhost:3000/api/project-folders/whimish/tasks` with JSON `{ "title": "...", "description": "...", "dueDate": "YYYY-MM-DD", "tags": ["..."] }`. Only the title is required (80 characters at most); the description is limited to 500 characters and each tag to 30. When the `CLAUDE_CODE_SESSION_ID` environment variable is set, also send it as the `X-Agent-Session` header, as for journal entries. Never edit `tasks.json` by hand: the dashboard gives each task its ID and records who created it. If the dashboard isn't running, say so and ask instead of writing the file. Marking tasks done or archiving them is the user's alone (rule 8, Task Completion Reporting).

# Agent conventions

The repository documents itself: names, the decision table and the tests say
what the code does - comments do not. Intent lives in code, commit messages
and issues, never in source prose.

## Tests

- Structure every test as `// given`, `// when`, `// then` sections.
- Name all input data in `given` (`const fields = [...]`, `const file = ...`).
  Never pass literals directly into the exercised call in `when`.
- Assign the exercised call result to a named variable in `when`.
  No `await` inside `expect(...)`.
- One behavior per test, named as user-visible outcome.
- Name every test `given <context> when <action> then <outcome>`,
  mirroring the given/when/then sections in its body.
- A suite starts with a header docblock stating its contract (one or two
  sentences). Nothing else in tests carries comments.
- Mock AnkiConnect with `AnkiConnectMock` (`tests/mocks/anki-connect.ts`).
  Suite-local responder helpers stay local (rule of three: extract to
  `tests/helpers/` only on third reuse of the same contract).
- Mock Obsidian API with `obsidian-test-mocks`.
  Only plugin-owned globals (e.g. `activeDocument`) get hand mocks
  in `tests/mocks/`.
- Suites touching DOM (jsdom via `@jest-environment jsdom` docblock)
  are required when code touches `document`/`window` (showdown,
  `App.createConfigured__`, React rendering).
- GUI tests assert user-visible behavior (`getByRole`, `getByText`,
  user-event clicks), never implementation details.
- Shared matchers live in `tests/setup.ts` (`@testing-library/jest-dom`).
- Keep a test file under 300 lines. Past that, review it: a family of
  near-identical tests may become one `test.each` table whose rows are the
  named input data, but distinct behaviors never merge behind a shared
  builder. `jscpd` gates `src` only, so this rule is what keeps test
  duplication in check.
- `null` values in test fixtures need explicit type annotations
  (`unknown[]`, `Record<string, unknown>`) - the project has no
  `strict` mode, so bare `null` widens to `any` (TS7005/TS7018).
- Decision-table integration suites (Stryker targets, `type:testing` `#8`)
  assert the user-visible outcome (preselection, `Created:` report counts,
  file content, written ids), never intermediate state; their `test.each`
  rows are named after the lifecycle status they drive and keep a single
  note per fixture so mutation runs stay cheap.

## Code

- No comments. Names, small functions and structure express intent; prose
  does not. Three exceptions and only three:
  - A short JSDoc on an exported service contract when the signature alone
    cannot express a cross-module constraint
    (e.g. `src/services/vault/paths.ts`).
  - A why-comment for externally imposed behavior only, pointing at its
    source (the AnkiConnect quirk and the pinned batch size in
    `src/services/anki/read.ts`); never a what-comment, and never a section
    banner (`// Update deck` stays a violation).
  - A tool directive with its reason: `// eslint-disable-next-line <rule> -- <reason>`, `// @ts-expect-error -- <reason>`.
- Domain vocabulary is fixed; code, tests and commits speak one language:
  - `note` - one Anki note (front, back, tags, model).
  - `block` - the note-form fence in a vault file carrying its `id`.
  - `record` - the ledger entry in `settings.noteLifecycle`
    (`lastHash`/`lastMod`).
  - `lifecycle status` - one of `NOTE_LIFECYCLE_STATUSES`, computed by
    `classifyNoteLifecycle`.
  - `deck` - an Anki deck; its `Parent::Child` chain maps to nested vault
    folders.
  - `pack` - JSON mapping an Anki model's fields to note-form fields.
  - `force` - "Anki wins" (import) or "Obsidian wins" (export) overriding
    OUT_OF_SCOPE.
  - `enroll` - joining the ledger without a write.
  - `orphaned` - a record left behind with neither an Anki note nor a block.
- A new service goes into the folder of its domain under `src/services/`
  (`anki/`, `notes/`, `vault/`, `commands/`), never loose in `services/` and
  never in `commands/` unless it is one of the three user commands. A helper
  three modules share belongs to whichever folder owns the question it
  answers. Mirrored in `tests/services/`.
- Formatting: Prettier owns it (.prettierrc, 2 spaces, 80 columns, double
  quotes, trailing commas). Run `pnpm run format` and never hand-format; lint
  autofixes run after it, so `pnpm run format && pnpm run lint:fix` leaves a
  clean tree. `.editorconfig` mirrors it for editors that do not run Prettier.
- No `any`. Use `unknown` with narrowing, literal unions and shared
  domain types (`AnkiCardPayload`, `AnkiNoteInfo`, `VaultNoteIndex`).
- New code uses ES2016+ syntax. Legacy ES5 constructs never appear: `var`, `arguments`, `.apply()`/`.call()` spreads, string concatenation for interpolation, `Object.assign` copies. ESLint enforces this in #68.
- Booleans read as questions: `isDisabled`, `isEmptyDeck`, `isPaginationVisible`.
  Functions answering them name the subject: `isDeckEmpty`.
  Boolean variables/props use `is` / `has` / `should` / `can` prefix (never `show` / `enable` / `display`).
- Small single-purpose functions; orchestration reads as a list of calls.
- Effects (`useEffect`) reference named loader functions, never inline lambdas.
- Errors surface to the user: no silent `catch`, UI reports through component
  state (`Error: could not load notes.`), services rethrow or log through the
  plugin logger - never `console.*` in `src`.
- No magic numbers or literals: pinned values have names
  (`previewPageSize`, `noteLifecycleRecordVersion`).
- English only, everywhere (code, tests, commit messages).
- Props in JSX and interface members are alphabetical
  (enforced by `perfectionist/sort-jsx-props`, `sort-interfaces`).
- Styles: BEM classes (`block__element--modifier`), dimensions only
  through `:root` tokens in `rem`, colors from Obsidian theme vars.
  Components accept optional `className` merged over their own base class.
- TDD for new behavior: red test first, then implementation.

## Workflow

- `pnpm run check` is the definition of done: prettier, eslint, tsc, knip,
  jest, jscpd and dependency-cruiser, in that order so the cheapest failure
  comes first. `pnpm run build` stays outside the gate (the dev flow is the
  rollup watcher). `pnpm run precommit` is the fast subset for a hook.
- Developer-only commands live in `src/dev` and are registered by
  `main.dev.ts`, a subclass that the release build (`main.ts`) never imports.
  Add a new dev command there, never in `main.ts`.
- CSS changes do not trigger the rollup watcher: copy `styles.css`
  to `docs/test-vault/.obsidian/plugins/notepalace/` manually
  and diff to confirm.
- Test vault (`docs/test-vault`) is fixture data: revert unintended
  modifications instead of committing them.
- Generated docs (`docs/state-machine.md` and its diagrams) refresh in the
  same change that touches the decision table or the lifecycle machine.
- Commits are `[#NN]: <english summary>` (a body when the change needs room),
  one logical change each, one merge request per issue.
- Commit, push and open merge requests only when you are asked to.
- `main.js` at repo root is a build artifact, never edit by hand.
- Never change GitLab settings (labels, assignees, milestones, issue or MR
  state, descriptions, deletion) without explicit user consent.


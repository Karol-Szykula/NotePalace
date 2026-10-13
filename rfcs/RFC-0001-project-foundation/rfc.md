# RFC-0001-project-foundation: project-foundation

## Goal

NotePalace adopts OpenSpec + CorgiSpec v4 as its specification-driven delivery pipeline: every change ships as an accepted RFC Slice, tracked from proposal to verified, human-reviewed, archived delivery, with GitLab as the issue tracker and `develop` as the integration branch.

## Non-goals

- Replacing GitLab issues and merge requests as the human decision gate.
- Enabling claude or codex platform skills, or committing hooks.
- Rewriting existing AGENTS.md conventions, domain vocabulary, decision table, or the `pnpm run check` gate.
- Introducing worktree isolation.

## Boundary

- Data: pipeline state lives in `openspec/`, `rfcs/`, `memory/`, `wiki/`. No plugin runtime or documented behavior changes; generated docs (`docs/`) stay hand-managed.
- Compatibility: OpenSpec CLI >= 1.6 < 2.0, CorgiSpec 4.0.0-rc2 (pinned until the reference flare is laid down), Node >= 20.19.
- Security: tracker writes run through glab under the `corgi-spec-bot` identity during propose/apply checkpoints only; no other remote mutation, no credentials stored in the vault.

## Slices

### S-01-project-foundation: First delivery slice

- AC-001 [evidence: both]: Foundation RFC is accepted and merged to `develop`.
- AC-002 [evidence: both]: `corgispec doctor --path .` reports PASS for Node.js, OpenSpec CLI, and opencode platform.
- AC-003 [evidence: both]: `corgispec lint` and `corgispec rfc validate RFC-0001-project-foundation` pass on a clean checkout.
- AC-004 [evidence: both]: Bootstrap preserved AGENTS.md conventions (Session Memory Protocol appended only) and `pnpm run check` stays the definition of done.

## Risks

- rc2 is a prerelease: pinned install; re-verify before upgrade.
- CorgiSpec init cannot bootstrap a repo with no OpenSpec root (prerequisites run before `init-needed`): a valid `openspec/config.yaml` (schema `gitlab-tracked`) is seeded first.
- Tracker identity is a bot account: issues and MRs authored by `corgi-spec-bot`; humans review through the normal gate.
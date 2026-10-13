# Corgi RFC Standard

RFCs are human-authored governance records. Feature, contract, boundary, data, security, compatibility, and migration changes require an accepted RFC.

## Lifecycle

1. Create a draft in a governance worktree.
2. Complete Goal, Non-goals, Boundary, Slices, acceptance criteria, evidence requirements, and Risks.
3. Validate and explicitly accept it as a human reviewer.
4. Commit and merge the accepted RFC into the configured integration branch.
5. Use one unbound Slice to create one Change and one tracker Issue.

Accepted normative content is immutable. Use a new amendment RFC for semantic changes.

## IDs

- RFC: `RFC-0001-semantic-slug`
- Slice: `S-01-semantic-slug`
- Acceptance criterion: `AC-001`
- Criterion format: `- AC-001 [evidence: automated|human|both]: observable outcome`

---
type: memory
updated: 2026-10-12
---

# Session Bridge

> Durable checkpoint mirror. Read first at startup; `.corgi/loop` remains lifecycle authority. `corgispec archive --local` alone writes archive closeout fields.

## Delivery Pointer
- **RFC**: RFC-0002-notes-search
- **RFC Revision**: 15e7eda136d26145815ddbb4f88d925f0bb04ba0
- **Slice**: S-01-notes-search
- **Issue**: 80 http://192.168.0.150:8929/ks/NotePalace/-/work_items/80
- **Change**: notes-search
- **Worktree**: /home/ksz/Projects/NotePalace
- **Phase at Checkpoint**: applying
- **Task Group at Checkpoint**: 2
- **Observed Run Revision**: 3
- **Last Verified HEAD**: 2ba826329d801c0127aaccbafdaaa31a8d117046

## Next Action
- Start Task Group 3 (import side).

## Blockers
- none

## Uncommitted Work
- none

## Discoveries
- `corgispec apply` requires HEAD unchanged from Propose and creates the planning-baseline commit itself; committing it manually breaks `PLANNING_HANDOFF_HEAD_CHANGED`.

## Promotion Queue
- Review agent-configuration constraints before promoting any item to `memory/MEMORY.md`.
- Consider `corgispec apply` planning-baseline ownership (apply creates the commit; do not create it by hand) for `memory/pitfalls.md`.

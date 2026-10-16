# NotePalace

An Obsidian plugin that turns your vault into an Anki deck: import Anki notes as note blocks, edit them in Markdown, and keep both sides in sync.

## Requirements

- Obsidian 1.14.0 or newer (desktop).
- [Anki](https://apps.ankiweb.net/) with the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on, listening on `127.0.0.1:8765`.

## Install

- **Beta (BRAT):** install [BRAT](https://github.com/TfTHacker/obsidian42-brat), add the beta plugin `Karol-Szykula/NotePalace`, then enable *NotePalace* in *Settings → Community plugins*.
- **Community directory:** search for *NotePalace* in *Settings → Community plugins → Browse*.
- **Manual:** download `main.js`, `manifest.json` and `styles.css` from the latest release into `<vault>/.obsidian/plugins/notepalace/`, then enable the plugin.

## Commands

| Command (id) | What it does |
|---|---|
| Import deck from Anki (`import-deck-from-anki`) | 4-page wizard (Deck → Fields → Cards → Save) bringing Anki notes into the vault |
| Export to Anki (`export-deck-to-anki`, ribbon) | Pushes vault notes to Anki, writes ids back |
| Sync (`sync-with-anki`) | Two-way sync of tracked notes; only command that updates on either side |
| Purge ledger (`purge-ledger`) | Forgets lifecycle records without files |
| Insert note form (`insert-note-form`) | Inserts a validated note block at the cursor |
| New note file (`new-note-form-file`) | Creates a new note file with a note form |
| New cloze note file (`new-cloze-note-file`) | Creates a new cloze note file |

## Network use

The plugin talks only to AnkiConnect on your own machine, over HTTP at `http://127.0.0.1:8765`. It sends no data anywhere else.

## Credits

NotePalace builds on two MIT-licensed projects, whose copyright notices are kept in [NOTICE](./NOTICE):

- [Flashcards](https://github.com/reuseman/flashcards-obsidian) by Alex Colucci.
- [Better Flashcards](https://github.com/mihirpatel1112/better-flashcards) by Mihir Patel, Alex Colucci and Noah Rousell.

## License

[AGPL-3.0](./LICENSE) © 2026 Karol Szykuła.

You may use, study, modify and share the plugin for free under the AGPL. If you want to use it without the AGPL's source-sharing obligations, a commercial license is available on request.

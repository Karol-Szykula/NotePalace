import { MarkdownRenderChild } from "obsidian";
import type { MarkdownPostProcessorContext, Vault } from "obsidian";
import { createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { t } from "src/i18n";
import { BasicNoteForm } from "src/gui/note-form/BasicNoteForm";
import { ClozeNoteForm } from "src/gui/note-form/ClozeNoteForm";
import { bannerForStatus } from "src/gui/note-form/banners";
import { noteFormClasses } from "src/gui/note-form/classes";
import { parseNoteForm } from "src/services/notes/document";
import { saveNoteFormEdit } from "src/gui/note-form/persister";
import { noteShapeFor, type NoteFormLayout } from "src/entities/note-shapes";
import type { NoteLifecycleStatus } from "src/services/notes/lifecycle";
import type { NoteFormData, NoteFormEdit } from "src/entities/note-form-data";
import { obsidianYamlEngine, type YamlEngine } from "src/services/yaml-engine";

function mountNoteForm(el: HTMLElement, node: ReactNode): () => void {
  const root = createRoot(el);
  root.render(node);
  function unmountNoteForm(): void {
    root.unmount();
  }
  return unmountNoteForm;
}

export class NoteFormChild extends MarkdownRenderChild {
  private unmount: (() => void) | null = null;

  constructor(
    containerEl: HTMLElement,
    private readonly node: ReactNode,
  ) {
    super(containerEl);
  }

  override onload(): void {
    this.unmount = mountNoteForm(this.containerEl, this.node);
  }

  override onunload(): void {
    this.unmount?.();
    this.unmount = null;
  }
}

function componentForLayout(layout: NoteFormLayout) {
  return layout === "cloze" ? ClozeNoteForm : BasicNoteForm;
}

function renderFormError(el: HTMLElement): void {
  const error = document.createElement("div");
  error.className = noteFormClasses.error;
  error.textContent = t("noteForm.invalidBlock");
  el.appendChild(error);
}

export type NoteStatusResolver = (
  noteId: number | undefined,
) => NoteLifecycleStatus | undefined;

function renderBanner(banner: string): ReactNode {
  return createElement("div", { className: noteFormClasses.banner }, banner);
}

export function createNoteFormHandler(
  vault: Vault,
  resolveStatus: NoteStatusResolver,
  yaml: YamlEngine = obsidianYamlEngine,
) {
  function handleNoteForm(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): Promise<void> {
    const parsed = parseFormSource(source, el, yaml);
    if (!parsed) {
      return Promise.resolve();
    }
    const handleEdit = createEditHandler({
      ctx,
      el,
      initialSource: source,
      parsed,
      vault,
      yaml,
    });
    const form = componentForLayout(noteShapeFor(parsed.model).layout);
    const banner = bannerForStatus(resolveStatus(parsed.id));
    const node =
      banner === undefined
        ? createElement(form, { data: parsed, onEdit: handleEdit })
        : createElement(
            "div",
            null,
            renderBanner(banner),
            createElement(form, { data: parsed, onEdit: handleEdit }),
          );
    ctx.addChild(new NoteFormChild(el, node));
    return Promise.resolve();
  }
  return handleNoteForm;
}

function parseFormSource(
  source: string,
  el: HTMLElement,
  yaml: YamlEngine,
): NoteFormData | null {
  try {
    return parseNoteForm(source, yaml);
  } catch {
    renderFormError(el);
    return null;
  }
}

interface EditHandlerInput {
  ctx: MarkdownPostProcessorContext;
  el: HTMLElement;
  initialSource: string;
  parsed: NoteFormData;
  vault: Vault;
  yaml: YamlEngine;
}

function createEditHandler(
  input: EditHandlerInput,
): (edit: NoteFormEdit) => void {
  let savedSource = input.initialSource;
  function handleEdit(edit: NoteFormEdit): void {
    const merged = { ...input.parsed, ...edit };
    void saveNoteFormEdit(
      {
        ctx: input.ctx,
        el: input.el,
        expectedSource: savedSource,
        vault: input.vault,
      },
      merged,
      input.yaml,
    ).then((next) => {
      if (next !== null) {
        savedSource = next;
      }
    });
  }
  return handleEdit;
}

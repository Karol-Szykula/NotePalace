import type { RenderMarkdown } from "src/gui/note-form/NoteFormFields";

const placeholderImage =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='99'%20height='101'%3E%3Crect%20width='99'%20height='101'%20fill='%238899aa'/%3E%3C/svg%3E";
const imageBlock = /^!\[\[[^\]]*\]\]$|^!\[[^\]]*\]\([^)]*\)$/;
const listLine = /^-\s+(.+)$/;

function appendImage(parent: HTMLElement): void {
  const image = document.createElement("img");
  image.src = placeholderImage;
  image.width = 99;
  image.height = 101;
  parent.appendChild(image);
}

function appendList(parent: HTMLElement, lines: string[]): void {
  const list = document.createElement("ul");
  for (const line of lines) {
    const item = document.createElement("li");
    item.textContent = line.replace(listLine, "$1");
    list.appendChild(item);
  }
  parent.appendChild(list);
}

function appendParagraph(parent: HTMLElement, lines: string[]): void {
  const paragraph = document.createElement("p");
  paragraph.textContent = lines.join(" ");
  parent.appendChild(paragraph);
}

export const fakeMarkdown: RenderMarkdown = (markdown, el) => {
  el.classList.add("markdown-rendered");
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  for (const block of blocks) {
    if (imageBlock.test(block)) {
      appendImage(el);
      continue;
    }
    const lines = block.split("\n");
    if (lines.every((line) => listLine.test(line))) {
      appendList(el, lines);
      continue;
    }
    appendParagraph(el, lines);
  }
};

import { readFileSync } from "node:fs";

export function openAsar(asarPath) {
  const buffer = readFileSync(asarPath);
  const headerSize = buffer.readUInt32LE(4);
  const headerText = buffer.subarray(8, 8 + headerSize).toString("utf8");
  const header = JSON.parse(headerText.slice(headerText.indexOf("{")));
  const baseOffset = 8 + headerSize;

  const entryFor = (name) =>
    name.split("/").reduce((node, part) => node?.files?.[part], header);

  const walk = (node, prefix, files) => {
    for (const [name, entry] of Object.entries(node.files ?? {})) {
      const full = `${prefix}/${name}`;
      if (entry.files) {
        walk(entry, full, files);
      } else {
        files.push(full);
      }
    }
    return files;
  };

  return {
    list(rootName) {
      const root = entryFor(rootName);
      return root === undefined ? [] : walk(root, rootName, []);
    },
    read(name) {
      const entry = entryFor(name);
      if (entry === undefined || entry.files !== undefined) {
        throw new Error(`${name} is not a file in ${asarPath}`);
      }
      const start = baseOffset + Number.parseInt(entry.offset, 10);
      return buffer.subarray(start, start + entry.size);
    },
  };
}

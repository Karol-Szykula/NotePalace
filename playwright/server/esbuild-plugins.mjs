const stubSource = "export const moment = { locale: () => 'en' };\n";

export const obsidianStubPlugin = {
  name: "obsidian-stub",
  setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({
      namespace: "obsidian-stub",
      path: "obsidian",
    }));
    build.onLoad({ filter: /.*/, namespace: "obsidian-stub" }, () => ({
      contents: stubSource,
      loader: "js",
    }));
  },
};

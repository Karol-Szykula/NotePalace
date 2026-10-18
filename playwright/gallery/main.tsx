import {
  Component,
  createElement,
  type ComponentType,
  type JSX,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { stories, storyIds } from "./stories";
import {
  applyTheme,
  resolveTheme,
  themeHref,
  type GalleryTheme,
} from "./theme";

interface MountParams {
  readonly props?: Record<string, unknown>;
  readonly story: string;
}

interface StoryErrorBoundaryProps {
  readonly children?: ReactNode;
  readonly onError: (error: unknown) => void;
}

interface GalleryIndexProps {
  readonly theme: GalleryTheme;
}

declare global {
  interface Window {
    mount: (params: MountParams) => Promise<void>;
    unmount: () => Promise<void>;
  }
}

class StoryErrorBoundary extends Component<
  StoryErrorBoundaryProps,
  { readonly hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError(error);
  }

  override render(): ReactNode {
    return this.state.hasError ? null : this.props.children;
  }
}

function GalleryIndex({ theme }: GalleryIndexProps): JSX.Element {
  const otherTheme: GalleryTheme = theme === "dark" ? "light" : "dark";
  return (
    <nav className="gallery">
      <div className="gallery__header">
        <h1 className="gallery__title">NotePalace component gallery</h1>
        <a className="gallery__theme" href={themeHref(otherTheme, null)}>
          {otherTheme} theme
        </a>
      </div>
      <ul className="gallery__list">
        {storyIds.map((storyId) => (
          <li key={storyId}>
            <a className="gallery__link" href={themeHref(theme, storyId)}>
              {storyId}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

let root: Root | null = null;

function rootElement(): HTMLElement {
  const element = document.getElementById("root");
  if (element === null) {
    throw new Error("The gallery page has no #root element.");
  }
  return element;
}

function render(node: ReactNode): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    root ??= createRoot(rootElement());
    root.render(createElement(StoryErrorBoundary, { onError: reject }, node));
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

function storyFor(id: string): ComponentType | undefined {
  return stories[id];
}

async function mount(params: MountParams): Promise<void> {
  const story = storyFor(params.story);
  if (story === undefined) {
    throw new Error(`Unknown story: ${params.story}`);
  }
  await render(createElement(story, params.props ?? {}));
}

window.mount = mount;
window.unmount = async (): Promise<void> => {
  root?.unmount();
  root = null;
};

const search = window.location.search;
const theme = resolveTheme(search);
applyTheme(theme);
const requestedStory = new URLSearchParams(search).get("story");
await (requestedStory === null
  ? render(createElement(GalleryIndex, { theme }))
  : mount({ story: requestedStory }));

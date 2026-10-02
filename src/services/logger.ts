export interface Logger {
  error(message: string, detail?: unknown): void;
  warn(message: string, detail?: unknown): void;
}

function describe(detail: unknown): string[] {
  if (detail === undefined) {
    return [];
  }
  if (detail instanceof Error) {
    return [detail.message];
  }
  return [typeof detail === "string" ? detail : JSON.stringify(detail)];
}

export const logger: Logger = {
  error: (message, detail) => {
    console.error(`NotePalace: ${message}`, ...describe(detail));
  },
  warn: (message, detail) => {
    console.warn(`NotePalace: ${message}`, ...describe(detail));
  },
};

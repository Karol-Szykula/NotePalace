import type { AnkiNotePayload } from "src/entities/anki-note";
import { ankiFieldNames } from "src/conf/constants";
import { logger } from "src/services/logger";

interface ResultEnvelope {
  error: unknown;
  result: unknown;
}

function isResultEnvelope(value: unknown): value is ResultEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "result" in value &&
    "error" in value
  );
}

/**
 * A multi response is a list of the individual action responses, and Anki
 * mixes shapes: a bare result for some actions, a {result, error} envelope
 * for others. Unwrap both and turn a nested error into a rejection.
 */
export function unwrapMultiResult(result: unknown, index: number): unknown {
  if (!isResultEnvelope(result)) {
    return result;
  }
  if (result.error !== null && result.error !== undefined) {
    throw new Error(
      `Anki action ${index} failed: ${describeUnknown(result.error)}`,
    );
  }
  return result.result;
}

export function invokeAnkiAction<T>(
  action: string,
  version: number,
  params: Record<string, unknown>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("error", () =>
      reject(new Error("failed to issue request")),
    );
    xhr.addEventListener("load", () => {
      try {
        const parsed: unknown = JSON.parse(xhr.responseText);
        if (!isResultEnvelope(parsed)) {
          throw new Error("response is not an AnkiConnect envelope");
        }
        if (Object.getOwnPropertyNames(parsed).length != 2) {
          throw new Error("response has an unexpected number of fields");
        }
        if (parsed.error) {
          throw new Error(describeUnknown(parsed.error));
        }
        resolve(parsed.result as T);
      } catch (error) {
        reject(toError(error));
      }
    });

    xhr.open("POST", "http://127.0.0.1:8765");
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

export function invokeAnkiActionAllowPartial(
  action: string,
  version: number,
  params: Record<string, unknown>,
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("error", () =>
      reject(new Error("failed to issue request")),
    );
    xhr.addEventListener("load", () => {
      try {
        settleLoadedResponse(parseEnvelope(xhr.responseText), params, resolve);
      } catch (error) {
        reject(toError(error));
      }
    });
    xhr.open("POST", "http://127.0.0.1:8765");
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

function parseEnvelope(text: string): ResultEnvelope {
  const parsed: unknown = JSON.parse(text);
  return isResultEnvelope(parsed) ? parsed : { error: null, result: parsed };
}

function settleLoadedResponse(
  response: ResultEnvelope,
  params: Record<string, unknown>,
  resolve: (ids: number[]) => void,
): void {
  if (!response.error) {
    resolve(response.result as number[]);
    return;
  }
  logResponseErrors(response.error, params);
  if (Array.isArray(response.result)) {
    resolve(response.result as number[]);
    return;
  }
  throw new Error(describeUnknown(response.error));
}

function logResponseErrors(
  error: unknown,
  params: Record<string, unknown>,
): void {
  if (!Array.isArray(error)) {
    logger.warn(`addNotes error: ${describeUnknown(error)}`);
    return;
  }
  error.forEach((entry: unknown, index: number) => {
    logEntryError(entry, noteNameFor(params, index));
  });
}

function logEntryError(entry: unknown, noteName: string): void {
  if (entry !== null) {
    logger.warn(`addNote failed for "${noteName}": ${describeUnknown(entry)}`);
  }
}

function noteNameFor(params: Record<string, unknown>, index: number): string {
  const notes = params["notes"] as AnkiNotePayload[] | undefined;
  return (
    notes?.[index]?.fields[ankiFieldNames.front] ??
    notes?.[index]?.fields[ankiFieldNames.text] ??
    "unknown"
  );
}

export function describeUnknown(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return Object.prototype.toString.call(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(describeUnknown(value));
}

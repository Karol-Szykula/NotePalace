import { t } from "src/i18n";

export interface SyncDeckReport {
  deckName: string;
  missing: number;
  pushed: number;
  refreshed: number;
  skippedUnmapped: number;
  upToDate: number;
}

export interface SyncReport {
  decks: SyncDeckReport[];
  deleted: number;
  enrolled: number;
  purgedRecords: number;
}

export function emptyDeckReport(deckName: string): SyncDeckReport {
  return {
    deckName,
    missing: 0,
    pushed: 0,
    refreshed: 0,
    skippedUnmapped: 0,
    upToDate: 0,
  };
}

interface SyncTotals {
  missing: number;
  pushed: number;
  refreshed: number;
  skippedUnmapped: number;
  upToDate: number;
}

function syncTotals(report: SyncReport): SyncTotals {
  const totals: SyncTotals = {
    missing: 0,
    pushed: 0,
    refreshed: 0,
    skippedUnmapped: 0,
    upToDate: 0,
  };
  for (const deck of report.decks) {
    totals.refreshed += deck.refreshed;
    totals.pushed += deck.pushed;
    totals.upToDate += deck.upToDate;
    totals.missing += deck.missing;
    totals.skippedUnmapped += deck.skippedUnmapped;
  }
  return totals;
}

function deckLine(deck: SyncDeckReport): string {
  return t("sync.deckLine", {
    deck: deck.deckName,
    missing: deck.missing,
    pushed: deck.pushed,
    refreshed: deck.refreshed,
    skippedUnmapped: deck.skippedUnmapped,
    upToDate: deck.upToDate,
  });
}

export function formatSyncReport(report: SyncReport): string {
  const summary = t("sync.summary", {
    ...syncTotals(report),
    deleted: report.deleted,
    enrolled: report.enrolled,
    purgedRecords: report.purgedRecords,
  });
  return [summary, ...report.decks.map(deckLine)].join("\n");
}

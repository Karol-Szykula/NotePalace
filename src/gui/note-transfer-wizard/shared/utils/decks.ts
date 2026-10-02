export function splitDeckHierarchy(deckName: string): {
  depth: number;
  shortName: string;
} {
  const hierarchy = deckName.split("::");
  return {
    depth: hierarchy.length - 1,
    shortName: hierarchy[hierarchy.length - 1] ?? deckName,
  };
}

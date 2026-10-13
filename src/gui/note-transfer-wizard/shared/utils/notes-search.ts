const foldMap: Record<string, string> = {
  æ: "ae",
  đ: "d",
  ð: "d",
  ł: "l",
  œ: "oe",
  ø: "o",
  ß: "ss",
  þ: "th",
};

const foldable = /[æđðłœøßþ]/gu;

export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(foldable, (char) => foldMap[char] ?? char);
}

export function matchesSearch(text: string, query: string): boolean {
  const foldedQuery = foldForSearch(query).trim();
  if (foldedQuery.length === 0) {
    return true;
  }
  return foldForSearch(text).includes(foldedQuery);
}

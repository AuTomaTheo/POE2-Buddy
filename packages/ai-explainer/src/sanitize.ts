/** User and source text is data. Flattening it does not follow instructions inside it. */
export function quoteUntrustedText(value: string): string {
  const flattened = value.replace(/\s+/g, " ").trim();
  return `"${flattened.replaceAll('"', "'")}"`;
}

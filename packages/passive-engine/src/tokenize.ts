export type NumberToken = {
  kind: "number";
  raw: string;
  value: number;
  sign: "+" | "-" | "none";
  percent: boolean;
};

export type RangeToken = {
  kind: "range";
  raw: string;
  from: number;
  to: number;
  percent: boolean;
};

export type MarkupToken = {
  kind: "markup";
  sourceId: string;
  displayText?: string;
};

export type WordToken = {
  kind: "word";
  text: string;
};

export type PunctuationToken = {
  kind: "punctuation";
  text: string;
};

export type StatToken =
  NumberToken | RangeToken | MarkupToken | WordToken | PunctuationToken;

const markupPattern = /^\[([A-Za-z][A-Za-z0-9]*)(?:\|([^\]]+))?\]/;

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function readNumber(
  raw: string,
  start: number,
): NumberToken | RangeToken | null {
  let index = start;
  let sign: "+" | "-" | "none" = "none";
  if (raw[index] === "+" || raw[index] === "-") {
    sign = raw[index] === "+" ? "+" : "-";
    index += 1;
  }
  const digitsStart = index;
  while (isDigit(raw[index])) index += 1;
  if (index === digitsStart) return null;
  if (raw[index] === "." && isDigit(raw[index + 1])) {
    index += 1;
    while (isDigit(raw[index])) index += 1;
  }
  if (raw[index] === "-" && isDigit(raw[index + 1])) {
    const upperStart = index + 1;
    index += 1;
    while (isDigit(raw[index])) index += 1;
    if (raw[index] === "." && isDigit(raw[index + 1])) {
      index += 1;
      while (isDigit(raw[index])) index += 1;
    }
    let percent = false;
    if (raw[index] === "%") {
      percent = true;
      index += 1;
    }
    const from = Number(raw.slice(digitsStart, upperStart - 1));
    const to = Number(raw.slice(upperStart, percent ? index - 1 : index));
    return {
      kind: "range",
      raw: raw.slice(start, index),
      from: sign === "-" ? -from : from,
      to: sign === "-" ? -to : to,
      percent,
    };
  }
  let percent = false;
  if (raw[index] === "%") {
    percent = true;
    index += 1;
  }
  const magnitude = Number(raw.slice(digitsStart, percent ? index - 1 : index));
  return {
    kind: "number",
    raw: raw.slice(start, index),
    value: sign === "-" ? -magnitude : magnitude,
    sign,
    percent,
  };
}

export function tokenizePassiveStat(raw: string): readonly StatToken[] {
  const tokens: StatToken[] = [];
  let index = 0;
  while (index < raw.length) {
    const char = raw[index];
    if (char === " " || char === "\t") {
      index += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      tokens.push({ kind: "punctuation", text: "\n" });
      index += char === "\r" && raw[index + 1] === "\n" ? 2 : 1;
      continue;
    }
    if (char === "[") {
      const markup = markupPattern.exec(raw.slice(index));
      if (markup?.[1]) {
        const displayText = markup[2];
        tokens.push({
          kind: "markup",
          sourceId: markup[1],
          ...(displayText !== undefined ? { displayText } : {}),
        });
        index += markup[0].length;
        continue;
      }
    }
    if (char === "+" || char === "-" || isDigit(char)) {
      const number = readNumber(raw, index);
      if (number) {
        tokens.push(number);
        index += number.raw.length;
        continue;
      }
    }
    if (/[A-Za-z]/.test(char ?? "")) {
      let end = index + 1;
      while (end < raw.length && /[A-Za-z']/.test(raw[end] ?? "")) end += 1;
      tokens.push({ kind: "word", text: raw.slice(index, end) });
      index = end;
      continue;
    }
    tokens.push({ kind: "punctuation", text: char ?? "" });
    index += 1;
  }
  return tokens;
}

export function markupVisible(token: MarkupToken): string {
  return token.displayText ?? token.sourceId;
}

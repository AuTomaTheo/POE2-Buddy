import {
  markupVisible,
  tokenizePassiveStat,
  type MarkupToken,
  type StatToken,
} from "./tokenize.js";

export type PassiveOperation =
  | "added"
  | "increased"
  | "reduced"
  | "more"
  | "less"
  | "penetration"
  | "conversion"
  | "gain-as-extra"
  | "chance"
  | "regeneration"
  | "derived-from";

export type StatDirection = "dealt" | "taken" | "unspecified";

export type MarkupRef = {
  sourceId: string;
  displayText?: string;
};

export type StatClause = {
  role: "condition" | "scope";
  type: "while" | "if" | "when" | "against" | "per" | "with" | "for" | "actor";
  text: string;
  markups: readonly MarkupRef[];
};

export type ParsedPassiveEffect = {
  amount: number;
  unit: "flat" | "percent";
  operation: PassiveOperation;
  direction: StatDirection;
  subjectText: string;
  subjectWords: readonly string[];
  markups: readonly MarkupRef[];
  maximum: boolean;
  clauses: readonly StatClause[];
  sourceText?: string;
  sourceMarkups?: readonly MarkupRef[];
  targetText?: string;
  targetMarkups?: readonly MarkupRef[];
};

export type ParsedPassiveStatExpression = {
  raw: string;
  effects: readonly ParsedPassiveEffect[];
};

const qualifierWords = new Set([
  "while",
  "if",
  "when",
  "against",
  "per",
  "with",
  "for",
]);

const conditionWords = new Set(["while", "if", "when"]);

const percentWords = new Set(["increased", "reduced", "more", "less"]);

function isWord(token: StatToken | undefined, text?: string): boolean {
  if (token?.kind !== "word") return false;
  if (text === undefined) return true;
  return token.text.toLowerCase() === text;
}

function isQualifier(
  token: StatToken | undefined,
): token is StatToken & { kind: "word" } {
  return token?.kind === "word" && qualifierWords.has(token.text.toLowerCase());
}

function visible(token: StatToken): string {
  if (token.kind === "markup") return markupVisible(token);
  if (token.kind === "word") return token.text;
  if (token.kind === "number" || token.kind === "range") return token.raw;
  return token.text;
}

function joinVisible(tokens: readonly StatToken[]): string {
  return tokens.map((token) => visible(token)).join(" ");
}

function markupRef(token: MarkupToken): MarkupRef {
  return token.displayText === undefined
    ? { sourceId: token.sourceId }
    : { sourceId: token.sourceId, displayText: token.displayText };
}

function subjectFrom(tokens: readonly StatToken[]): {
  subjectText: string;
  subjectWords: string[];
  markups: MarkupRef[];
  maximum: boolean;
} {
  const subjectWords = tokens
    .filter(
      (token): token is StatToken & { kind: "word" } => token.kind === "word",
    )
    .map((token) => token.text);
  return {
    subjectText: joinVisible(tokens),
    subjectWords,
    markups: tokens
      .filter((token): token is MarkupToken => token.kind === "markup")
      .map((token) => markupRef(token)),
    maximum: subjectWords.some((word) => word.toLowerCase() === "maximum"),
  };
}

function clauseRole(type: string): StatClause["role"] {
  return conditionWords.has(type) ? "condition" : "scope";
}

function parseClauses(tokens: readonly StatToken[]): StatClause[] | null {
  if (tokens.length === 0) return [];
  const clauses: StatClause[] = [];
  let index = 0;
  while (index < tokens.length) {
    const keyword = tokens[index];
    if (!isQualifier(keyword)) return null;
    const type = keyword.text.toLowerCase() as StatClause["type"];
    index += 1;
    const body: StatToken[] = [];
    while (index < tokens.length && !isQualifier(tokens[index])) {
      const token = tokens[index];
      if (!token || (token.kind !== "word" && token.kind !== "markup"))
        return null;
      body.push(token);
      index += 1;
    }
    if (body.length === 0) return null;
    clauses.push({
      role: clauseRole(type),
      type,
      text: joinVisible(body),
      markups: body
        .filter((token): token is MarkupToken => token.kind === "markup")
        .map((token) => markupRef(token)),
    });
  }
  return clauses;
}

function splitSubject(tokens: readonly StatToken[]): {
  subject: readonly StatToken[];
  clauses: StatClause[];
} | null {
  const splitAt = tokens.findIndex((token) => isQualifier(token));
  const subject = splitAt === -1 ? tokens : tokens.slice(0, splitAt);
  const clauseTokens = splitAt === -1 ? [] : tokens.slice(splitAt);
  if (subject.length === 0) return null;
  if (
    subject.some((token) => token.kind !== "word" && token.kind !== "markup")
  ) {
    return null;
  }
  const clauses = parseClauses(clauseTokens);
  if (clauses === null) return null;
  return { subject, clauses };
}

function coordination(
  subject: readonly StatToken[],
): readonly [readonly StatToken[], readonly StatToken[]] | null {
  const andAt = subject.findIndex((token) => isWord(token, "and"));
  if (andAt === -1) return null;
  if (subject.slice(andAt + 1).some((token) => isWord(token, "and")))
    return null;
  const left = subject.slice(0, andAt);
  const right = subject.slice(andAt + 1);
  if (left.length !== 1 || left[0]?.kind !== "markup") return null;
  if (right.length === 0 || right[0]?.kind !== "markup") return null;
  if (right.slice(1).some((token) => token.kind !== "word")) return null;
  return [left, right];
}

function effectBase(input: {
  amount: number;
  unit: "flat" | "percent";
  operation: PassiveOperation;
  direction: StatDirection;
  subjectTokens: readonly StatToken[];
  clauses: readonly StatClause[];
  sourceText?: string;
  sourceMarkups?: readonly MarkupRef[];
  targetText?: string;
  targetMarkups?: readonly MarkupRef[];
}): ParsedPassiveEffect {
  const subject = subjectFrom(input.subjectTokens);
  const direction =
    input.direction === "unspecified" &&
    subject.subjectWords.some((word) => word.toLowerCase() === "taken")
      ? "taken"
      : input.direction;
  return {
    amount: input.amount,
    unit: input.unit,
    operation: input.operation,
    direction,
    subjectText: subject.subjectText,
    subjectWords: subject.subjectWords,
    markups: subject.markups,
    maximum: subject.maximum,
    clauses: input.clauses,
    ...(input.sourceText !== undefined ? { sourceText: input.sourceText } : {}),
    ...(input.sourceMarkups !== undefined
      ? { sourceMarkups: input.sourceMarkups }
      : {}),
    ...(input.targetText !== undefined ? { targetText: input.targetText } : {}),
    ...(input.targetMarkups !== undefined
      ? { targetMarkups: input.targetMarkups }
      : {}),
  };
}

function numberAt(
  tokens: readonly StatToken[],
  index: number,
): { token: StatToken & { kind: "number" }; index: number } | null {
  const token = tokens[index];
  if (token?.kind !== "number") return null;
  return { token, index: index + 1 };
}

function parseGain(tokens: readonly StatToken[]): ParsedPassiveEffect[] | null {
  let index = 0;
  const prefix: StatToken[] = [];
  while (index < tokens.length) {
    const token = tokens[index];
    const isGainMarkup = token?.kind === "markup" && token.sourceId === "Gain";
    if (isGainMarkup || isWord(token, "gain")) break;
    if (!token || (token.kind !== "word" && token.kind !== "markup"))
      return null;
    prefix.push(token);
    index += 1;
  }
  const gain = tokens[index];
  const gainFound =
    (gain?.kind === "markup" && gain.sourceId === "Gain") ||
    isWord(gain, "gain");
  if (!gainFound) return null;
  index += 1;
  const amount = numberAt(tokens, index);
  if (!amount?.token.percent) return null;
  index = amount.index;
  if (isWord(tokens[index], "of")) index += 1;
  const source: StatToken[] = [];
  while (index < tokens.length && !isWord(tokens[index], "as")) {
    const token = tokens[index];
    if (!token || (token.kind !== "word" && token.kind !== "markup"))
      return null;
    source.push(token);
    index += 1;
  }
  if (source.length === 0 || !isWord(tokens[index], "as")) return null;
  index += 1;
  if (!isWord(tokens[index], "extra")) return null;
  index += 1;
  const targetAndClauses = splitSubject(tokens.slice(index));
  if (!targetAndClauses || targetAndClauses.subject.length === 0) return null;
  const actor =
    prefix.length === 0
      ? []
      : [
          {
            role: "scope" as const,
            type: "actor" as const,
            text: joinVisible(prefix),
            markups: prefix
              .filter((token): token is MarkupToken => token.kind === "markup")
              .map((token) => markupRef(token)),
          },
        ];
  const sourceMarkups = source
    .filter((token): token is MarkupToken => token.kind === "markup")
    .map((token) => markupRef(token));
  const targetMarkups = targetAndClauses.subject
    .filter((token): token is MarkupToken => token.kind === "markup")
    .map((token) => markupRef(token));
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: "gain-as-extra",
      direction: "unspecified",
      subjectTokens: targetAndClauses.subject,
      clauses: [...actor, ...targetAndClauses.clauses],
      sourceText: joinVisible(source),
      sourceMarkups,
      targetText: joinVisible(targetAndClauses.subject),
      targetMarkups,
    }),
  ];
}

function parsePenetration(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  let index = 0;
  const leading: StatToken[] = [];
  if (tokens[index]?.kind === "markup") {
    leading.push(tokens[index]);
    index += 1;
  }
  if (!isWord(tokens[index], "damage")) return null;
  index += 1;
  const penetrates = tokens[index];
  const penetratesFound =
    (penetrates?.kind === "markup" && penetrates.sourceId === "Penetration") ||
    isWord(penetrates, "penetrates");
  if (!penetratesFound) return null;
  index += 1;
  const amount = numberAt(tokens, index);
  if (!amount?.token.percent) return null;
  index = amount.index;
  if (isWord(tokens[index], "of")) index += 1;
  const target = splitSubject(tokens.slice(index));
  if (!target || target.subject.length === 0) return null;
  const targetMarkups = target.subject
    .filter((token): token is MarkupToken => token.kind === "markup")
    .map((token) => markupRef(token));
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: "penetration",
      direction: "dealt",
      subjectTokens: [...leading, { kind: "word", text: "Damage" }],
      clauses: target.clauses,
      targetText: joinVisible(target.subject),
      targetMarkups,
    }),
  ];
}

function parseTake(tokens: readonly StatToken[]): ParsedPassiveEffect[] | null {
  if (!isWord(tokens[0], "take")) return null;
  const amount = numberAt(tokens, 1);
  if (!amount?.token.percent) return null;
  const operation = tokens[amount.index];
  if (operation?.kind !== "word" || !percentWords.has(operation.text))
    return null;
  const rest = splitSubject(tokens.slice(amount.index + 1));
  if (!rest) return null;
  if (coordination(rest.subject)) return null;
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: operation.text as PassiveOperation,
      direction: "taken",
      subjectTokens: rest.subject,
      clauses: rest.clauses,
    }),
  ];
}

function parseAddedRest(
  tokens: readonly StatToken[],
  amount: number,
  unit: "flat" | "percent",
  actor: readonly StatClause[],
): ParsedPassiveEffect[] | null {
  if (!isWord(tokens[0], "to")) return null;
  let index = 1;
  let quantifier: string | undefined;
  const quantifierToken = tokens[index];
  if (
    isWord(quantifierToken, "any") ||
    isWord(quantifierToken, "all") ||
    isWord(quantifierToken, "maximum")
  ) {
    if (quantifierToken?.kind === "word") quantifier = quantifierToken.text;
    index += 1;
  }
  const rest = splitSubject(tokens.slice(index));
  if (!rest || rest.subject.length === 0 || coordination(rest.subject))
    return null;
  const subjectTokens = quantifier
    ? [{ kind: "word" as const, text: quantifier }, ...rest.subject]
    : rest.subject;
  return [
    effectBase({
      amount,
      unit,
      operation: "added",
      direction: "unspecified",
      subjectTokens,
      clauses: [...actor, ...rest.clauses],
    }),
  ];
}

function parsePercentRest(
  tokens: readonly StatToken[],
  amount: number,
  actor: readonly StatClause[],
  direction: StatDirection,
): ParsedPassiveEffect[] | null {
  const operation = tokens[0];
  if (operation?.kind !== "word" || !percentWords.has(operation.text))
    return null;
  const rest = splitSubject(tokens.slice(1));
  if (!rest) return null;
  const split = coordination(rest.subject);
  if (rest.subject.some((token) => isWord(token, "and")) && !split) return null;
  const parts = split ?? [rest.subject];
  return parts.map((subjectTokens) =>
    effectBase({
      amount,
      unit: "percent",
      operation: operation.text as PassiveOperation,
      direction,
      subjectTokens,
      clauses: [...actor, ...rest.clauses],
    }),
  );
}

function parseActor(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  const verbAt = tokens.findIndex(
    (token) => isWord(token, "deal") || isWord(token, "have"),
  );
  if (verbAt <= 0) return null;
  const prefix = tokens.slice(0, verbAt);
  if (
    prefix.some((token) => token.kind !== "word" && token.kind !== "markup")
  ) {
    return null;
  }
  const verb = tokens[verbAt];
  if (verb?.kind !== "word") return null;
  const actor: StatClause[] = [
    {
      role: "scope",
      type: "actor",
      text: joinVisible(prefix),
      markups: prefix
        .filter((token): token is MarkupToken => token.kind === "markup")
        .map((token) => markupRef(token)),
    },
  ];
  const direction: StatDirection =
    verb.text.toLowerCase() === "deal" ? "dealt" : "unspecified";
  const rest = tokens.slice(verbAt + 1);
  const amount = numberAt(rest, 0);
  if (!amount) return null;
  if (isWord(rest[amount.index], "to")) {
    return parseAddedRest(
      rest.slice(amount.index),
      amount.token.value,
      amount.token.percent ? "percent" : "flat",
      actor,
    );
  }
  if (!amount.token.percent) return null;
  return parsePercentRest(
    rest.slice(amount.index),
    amount.token.value,
    actor,
    direction,
  );
}

function parseChance(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  const amount = numberAt(tokens, 0);
  if (!amount?.token.percent) return null;
  if (
    !isWord(tokens[amount.index], "chance") ||
    !isWord(tokens[amount.index + 1], "to")
  ) {
    return null;
  }
  const rest = splitSubject(tokens.slice(amount.index + 1));
  if (!rest || coordination(rest.subject)) return null;
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: "chance",
      direction: "unspecified",
      subjectTokens: rest.subject,
      clauses: rest.clauses,
    }),
  ];
}

function parseRegeneration(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  if (!isWord(tokens[0], "regenerate")) return null;
  const amount = numberAt(tokens, 1);
  if (!amount?.token.percent || !isWord(tokens[amount.index], "of"))
    return null;
  const rest = splitSubject(tokens.slice(amount.index + 1));
  if (!rest || coordination(rest.subject)) return null;
  const words = rest.subject.filter((token) => token.kind === "word");
  if (words.length < 2 || !isWord(words[0], "maximum")) return null;
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: "regeneration",
      direction: "unspecified",
      subjectTokens: rest.subject,
      clauses: rest.clauses,
    }),
  ];
}

function parseConversion(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  const amount = numberAt(tokens, 0);
  if (!amount?.token.percent || !isWord(tokens[amount.index], "of"))
    return null;
  let index = amount.index + 1;
  const source: StatToken[] = [];
  while (index < tokens.length) {
    const token = tokens[index];
    const converted =
      (token?.kind === "markup" && token.sourceId === "StatConversion") ||
      isWord(token, "converted");
    if (converted) break;
    if (!token || (token.kind !== "word" && token.kind !== "markup"))
      return null;
    source.push(token);
    index += 1;
  }
  const converted = tokens[index];
  const convertedFound =
    (converted?.kind === "markup" && converted.sourceId === "StatConversion") ||
    isWord(converted, "converted");
  if (!convertedFound || source.length === 0) return null;
  index += 1;
  if (!isWord(tokens[index], "to")) return null;
  index += 1;
  const target = splitSubject(tokens.slice(index));
  if (!target || target.subject.length === 0 || target.clauses.length > 0)
    return null;
  if (coordination(target.subject)) return null;
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: "conversion",
      direction: "unspecified",
      subjectTokens: target.subject,
      clauses: [],
      sourceText: joinVisible(source),
      sourceMarkups: source
        .filter((token): token is MarkupToken => token.kind === "markup")
        .map((token) => markupRef(token)),
      targetText: joinVisible(target.subject),
      targetMarkups: target.subject
        .filter((token): token is MarkupToken => token.kind === "markup")
        .map((token) => markupRef(token)),
    }),
  ];
}

function parseAdded(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  const amount = numberAt(tokens, 0);
  if (!amount) return null;
  return parseAddedRest(
    tokens.slice(amount.index),
    amount.token.value,
    amount.token.percent ? "percent" : "flat",
    [],
  );
}

function parsePercent(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  const amount = numberAt(tokens, 0);
  if (!amount?.token.percent) return null;
  return parsePercentRest(
    tokens.slice(amount.index),
    amount.token.value,
    [],
    "unspecified",
  );
}

function acceptable(tokens: readonly StatToken[]): boolean {
  if (
    tokens.some(
      (token) => token.kind === "punctuation" || token.kind === "range",
    )
  ) {
    return false;
  }
  return tokens.filter((token) => token.kind === "number").length === 1;
}

function parseDerived(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  const gain = tokens[0];
  const gainFound =
    (gain?.kind === "markup" && gain.sourceId === "Gain") ||
    isWord(gain, "gain");
  if (!gainFound) return null;
  const target = tokens[1];
  if (target?.kind !== "markup") return null;
  if (!isWord(tokens[2], "equal") || !isWord(tokens[3], "to")) return null;
  const amount = numberAt(tokens, 4);
  if (!amount?.token.percent || !isWord(tokens[amount.index], "of"))
    return null;
  const source = tokens[amount.index + 1];
  if (source?.kind !== "markup") return null;
  if (amount.index + 2 !== tokens.length) return null;
  return [
    effectBase({
      amount: amount.token.value,
      unit: "percent",
      operation: "derived-from",
      direction: "unspecified",
      subjectTokens: [target],
      clauses: [],
      sourceText: markupVisible(source),
      sourceMarkups: [markupRef(source)],
      targetText: markupVisible(target),
      targetMarkups: [markupRef(target)],
    }),
  ];
}

function parseSingleClause(
  tokens: readonly StatToken[],
): ParsedPassiveEffect[] | null {
  if (!acceptable(tokens)) return null;
  const attempts = [
    parseDerived,
    parseGain,
    parsePenetration,
    parseTake,
    parseActor,
    parseChance,
    parseRegeneration,
    parseConversion,
    parseAdded,
    parsePercent,
  ];
  for (const attempt of attempts) {
    const effects = attempt(tokens);
    if (effects && effects.length > 0) return effects;
  }
  return null;
}

export function parsePassiveStatExpression(
  raw: string,
): ParsedPassiveStatExpression | null {
  const clauses = raw
    .split(/\r?\n/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
  if (clauses.length === 0) return null;
  const effects: ParsedPassiveEffect[] = [];
  for (const clause of clauses) {
    const parsed = parseSingleClause(tokenizePassiveStat(clause));
    if (parsed === null) return null;
    effects.push(...parsed);
  }
  return { raw, effects };
}

export function effectStatIdentity(effect: ParsedPassiveEffect): {
  statId: string;
  sourceId: string;
  label: string;
} {
  const sourceId =
    effect.markups.length === 0
      ? "plain"
      : effect.markups.map((markup) => markup.sourceId).join("+");
  const clauseText = effect.clauses
    .map((clause) => `${clause.type} ${clause.text}`)
    .join(" ");
  const label = [
    effect.direction === "taken" ? "taken" : "",
    effect.operation,
    effect.subjectText,
    clauseText,
  ]
    .filter((part) => part.length > 0)
    .join(" ");
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return { statId: `${effect.operation}.${sourceId}.${slug}`, sourceId, label };
}

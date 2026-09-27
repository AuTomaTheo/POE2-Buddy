import type { PassiveNode } from "@poe2-helper/domain";
import {
  effectStatIdentity,
  parsePassiveStatExpression,
  type ParsedPassiveEffect,
  type PassiveOperation,
} from "./grammar.js";

export type PassiveStatUnit = "percent" | "flat";

export type PassiveStatForm = PassiveOperation;

export type { ParsedPassiveEffect, PassiveOperation };

export type RecognizedPassiveStat = {
  status: "recognized";
  raw: string;
  statId: string;
  sourceId: string;
  label: string;
  amount: number;
  unit: PassiveStatUnit;
  form: PassiveStatForm;
  scopes: readonly string[];
  effects?: readonly ParsedPassiveEffect[];
};

export type UnrecognizedPassiveStat = {
  status: "unrecognized";
  raw: string;
};

export type PassiveStatLine = RecognizedPassiveStat | UnrecognizedPassiveStat;

export type PassiveNodeStats = {
  nodeId: number;
  rawStats: readonly string[];
  lines: readonly PassiveStatLine[];
};

export type PassiveStatCoverage = {
  nodeCount: number;
  lineCount: number;
  recognizedLineCount: number;
  unrecognizedLineCount: number;
  recognizedByStatId: readonly { statId: string; count: number }[];
  unrecognizedByRaw: readonly { raw: string; count: number }[];
};

const addedAnyAttribute = /^\+(\d+) to any \[([A-Za-z]+)\|([^\]]+)\]$/;
const addedAllAttributes = /^\+(\d+) to all \[([A-Za-z]+)\|([^\]]+)\]$/;
const addedMaximum = /^\+(\d+) to maximum \[([A-Za-z]+)\|([^\]]+)\]$/;
const addedResistance = /^\+(\d+)% to \[Resistances\|([^\]]+)\]$/;
const addedAttribute =
  /^\+(\d+) to \[([A-Za-z]+)(?:\|([^\]]+))?\](?: ([A-Za-z]+))?$/;
const increasedMaximum = /^(\d+)% increased maximum \[([A-Za-z]+)\|([^\]]+)\]$/;
const percentMarkup =
  /^(\d+)% (increased|reduced|more|less) \[([A-Za-z]+)(?:\|([^\]]+))?\](?: ([A-Za-z]+(?: [A-Za-z]+)?))?$/;
const percentPlain =
  /^(\d+)% (increased|reduced|more|less) ([A-Za-z][A-Za-z ]*)$/;
const minionDamage = /^\[Minion\|Minions\] deal (\d+)% increased Damage$/;
const minionLife = /^\[Minion\|Minions\] have (\d+)% increased maximum Life$/;
const criticalForSpells =
  /^(\d+)% increased \[Critical\|Critical Hit Chance\] for \[Spell\|Spells\]$/;
const criticalForAttacks =
  /^(\d+)% increased \[Critical\|Critical Hit Chance\] for \[Attack\|Attacks\]$/;
const penetration =
  /^Damage \[Penetration\|Penetrates\] (\d+)% \[Resistances\|(Fire|Cold|Lightning) Resistance\]$/;

const unmodeledQualifier = /\b(while|if|when|against|per|with|for)\b/i;

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function recognized(input: {
  raw: string;
  sourceId: string;
  label: string;
  amount: number;
  unit: PassiveStatUnit;
  form: PassiveStatForm;
  scopes?: readonly string[];
}): RecognizedPassiveStat {
  return {
    status: "recognized",
    raw: input.raw,
    statId: `${input.form}.${input.sourceId}.${slug(input.label)}`,
    sourceId: input.sourceId,
    label: input.label,
    amount: input.amount,
    unit: input.unit,
    form: input.form,
    scopes: input.scopes ?? [],
  };
}

function displayOf(sourceId: string, display: string | undefined): string {
  return display ?? sourceId;
}

function percentForm(word: string): PassiveStatForm {
  if (
    word === "increased" ||
    word === "reduced" ||
    word === "more" ||
    word === "less"
  ) {
    return word;
  }
  throw new Error(`Unknown percent form ${word}.`);
}

export function parsePassiveStatLine(raw: string): PassiveStatLine {
  const anyAttribute = addedAnyAttribute.exec(raw);
  if (anyAttribute?.[1] && anyAttribute[2] && anyAttribute[3]) {
    return recognized({
      raw,
      sourceId: anyAttribute[2],
      label: `to any ${anyAttribute[3]}`,
      amount: Number(anyAttribute[1]),
      unit: "flat",
      form: "added",
    });
  }

  const allAttributes = addedAllAttributes.exec(raw);
  if (allAttributes?.[1] && allAttributes[2] && allAttributes[3]) {
    return recognized({
      raw,
      sourceId: allAttributes[2],
      label: `to all ${allAttributes[3]}`,
      amount: Number(allAttributes[1]),
      unit: "flat",
      form: "added",
    });
  }

  const maximum = addedMaximum.exec(raw);
  if (maximum?.[1] && maximum[2] && maximum[3]) {
    return recognized({
      raw,
      sourceId: maximum[2],
      label: `to maximum ${maximum[3]}`,
      amount: Number(maximum[1]),
      unit: "flat",
      form: "added",
    });
  }

  const resistance = addedResistance.exec(raw);
  if (resistance?.[1] && resistance[2]) {
    return recognized({
      raw,
      sourceId: "Resistances",
      label: `to ${resistance[2]}`,
      amount: Number(resistance[1]),
      unit: "percent",
      form: "added",
    });
  }

  const penetrated = penetration.exec(raw);
  if (penetrated?.[1] && penetrated[2]) {
    return recognized({
      raw,
      sourceId: "Resistances",
      label: `penetrates ${penetrated[2]} Resistance`,
      amount: Number(penetrated[1]),
      unit: "percent",
      form: "penetration",
    });
  }

  const minionsDamage = minionDamage.exec(raw);
  if (minionsDamage?.[1]) {
    return recognized({
      raw,
      sourceId: "Minion",
      label: "minions deal increased Damage",
      amount: Number(minionsDamage[1]),
      unit: "percent",
      form: "increased",
      scopes: ["minions"],
    });
  }

  const minionsLife = minionLife.exec(raw);
  if (minionsLife?.[1]) {
    return recognized({
      raw,
      sourceId: "Minion",
      label: "minions have increased maximum Life",
      amount: Number(minionsLife[1]),
      unit: "percent",
      form: "increased",
      scopes: ["minions"],
    });
  }

  const spellCritical = criticalForSpells.exec(raw);
  if (spellCritical?.[1]) {
    return recognized({
      raw,
      sourceId: "Critical",
      label: "increased Critical Hit Chance for Spells",
      amount: Number(spellCritical[1]),
      unit: "percent",
      form: "increased",
      scopes: ["spells"],
    });
  }

  const attackCritical = criticalForAttacks.exec(raw);
  if (attackCritical?.[1]) {
    return recognized({
      raw,
      sourceId: "Critical",
      label: "increased Critical Hit Chance for Attacks",
      amount: Number(attackCritical[1]),
      unit: "percent",
      form: "increased",
      scopes: ["attacks"],
    });
  }

  const maximumIncreased = increasedMaximum.exec(raw);
  if (maximumIncreased?.[1] && maximumIncreased[2] && maximumIncreased[3]) {
    return recognized({
      raw,
      sourceId: maximumIncreased[2],
      label: `increased maximum ${maximumIncreased[3]}`,
      amount: Number(maximumIncreased[1]),
      unit: "percent",
      form: "increased",
    });
  }

  const markup = percentMarkup.exec(raw);
  if (markup?.[1] && markup[2] && markup[3]) {
    const trailing = markup[5];
    if (
      (trailing === undefined || !unmodeledQualifier.test(trailing)) &&
      !/\btaken\b/i.test(trailing ?? "")
    ) {
      const name = displayOf(markup[3], markup[4]);
      return recognized({
        raw,
        sourceId: markup[3],
        label: trailing
          ? `${markup[2]} ${name} ${trailing}`
          : `${markup[2]} ${name}`,
        amount: Number(markup[1]),
        unit: "percent",
        form: percentForm(markup[2]),
      });
    }
  }

  const plain = percentPlain.exec(raw);
  if (
    plain?.[1] &&
    plain[2] &&
    plain[3] &&
    !unmodeledQualifier.test(plain[3]) &&
    !/\btaken\b/i.test(plain[3])
  ) {
    return recognized({
      raw,
      sourceId: "plain",
      label: `${plain[2]} ${plain[3]}`,
      amount: Number(plain[1]),
      unit: "percent",
      form: percentForm(plain[2]),
    });
  }

  const added = addedAttribute.exec(raw);
  if (added?.[1] && added[2]) {
    const trailing = added[4];
    if (trailing === undefined || !unmodeledQualifier.test(trailing)) {
      const name = displayOf(added[2], added[3]);
      return recognized({
        raw,
        sourceId: added[2],
        label: trailing ? `to ${name} ${trailing}` : `to ${name}`,
        amount: Number(added[1]),
        unit: "flat",
        form: "added",
      });
    }
  }

  const expression = parsePassiveStatExpression(raw);
  if (expression) {
    return recognizedFromExpression(expression.raw, expression.effects);
  }

  return { status: "unrecognized", raw };
}

function recognizedFromExpression(
  raw: string,
  effects: readonly ParsedPassiveEffect[],
): PassiveStatLine {
  const identities = effects.map((effect) => effectStatIdentity(effect));
  const first = effects[0];
  const firstIdentity = identities[0];
  if (!first || !firstIdentity) {
    return { status: "unrecognized", raw };
  }
  return {
    status: "recognized",
    raw,
    statId: identities.map((identity) => identity.statId).join("&&"),
    sourceId: identities.map((identity) => identity.sourceId).join("&&"),
    label: identities.map((identity) => identity.label).join(" && "),
    amount: first.amount,
    unit: first.unit,
    form: first.operation,
    scopes: first.clauses.map((clause) =>
      clause.type === "actor" ? clause.text : `${clause.type} ${clause.text}`,
    ),
    effects,
  };
}

export function extractPassiveNodeStats(
  node: Pick<PassiveNode, "id" | "rawStats">,
): PassiveNodeStats {
  return {
    nodeId: node.id,
    rawStats: node.rawStats,
    lines: node.rawStats.map((raw) => parsePassiveStatLine(raw)),
  };
}

export function passiveStatCoverage(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): PassiveStatCoverage {
  let lineCount = 0;
  let recognizedLineCount = 0;
  const byStatId = new Map<string, number>();
  const byRaw = new Map<string, number>();

  for (const node of nodes) {
    for (const raw of node.rawStats) {
      lineCount += 1;
      const line = parsePassiveStatLine(raw);
      if (line.status === "recognized") {
        recognizedLineCount += 1;
        byStatId.set(line.statId, (byStatId.get(line.statId) ?? 0) + 1);
      } else {
        byRaw.set(raw, (byRaw.get(raw) ?? 0) + 1);
      }
    }
  }

  return {
    nodeCount: nodes.length,
    lineCount,
    recognizedLineCount,
    unrecognizedLineCount: lineCount - recognizedLineCount,
    recognizedByStatId: [...byStatId.entries()]
      .map(([statId, count]) => ({ statId, count }))
      .sort((left, right) => left.statId.localeCompare(right.statId)),
    unrecognizedByRaw: [...byRaw.entries()]
      .map(([raw, count]) => ({ raw, count }))
      .sort((left, right) => left.raw.localeCompare(right.raw)),
  };
}

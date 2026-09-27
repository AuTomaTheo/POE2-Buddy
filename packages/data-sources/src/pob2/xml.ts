export const POB2_MAX_ELEMENTS = 10_000;
export const POB2_MAX_DEPTH = 32;

export type XmlElement = {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  text: string;
};

export class Pob2XmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Pob2XmlError";
  }
}

/**
 * Reads a small element tree. It rejects document types and any entity other
 * than the five predefined XML entities, so it does not fetch external data.
 */
export function parsePob2Xml(source: string): XmlElement {
  if (/<!DOCTYPE/i.test(source) || /<!ENTITY/i.test(source)) {
    throw new Pob2XmlError("The PoB2 document type is not accepted.");
  }
  const parser = new Parser(source);
  parser.skipProlog();
  const root = parser.parseElement(0);
  parser.skipSpace();
  if (parser.index < parser.source.length) {
    throw new Pob2XmlError("The PoB2 document has trailing content.");
  }
  return root;
}

class Parser {
  index = 0;
  elements = 0;

  constructor(readonly source: string) {}

  parseElement(depth: number): XmlElement {
    if (depth > POB2_MAX_DEPTH) {
      throw new Pob2XmlError("The PoB2 document is too deeply nested.");
    }
    this.elements += 1;
    if (this.elements > POB2_MAX_ELEMENTS) {
      throw new Pob2XmlError("The PoB2 document has too many elements.");
    }
    this.expect("<");
    if (
      this.source.startsWith("/", this.index) ||
      this.source.startsWith("!", this.index) ||
      this.source.startsWith("?", this.index)
    ) {
      throw new Pob2XmlError("The PoB2 document has an unexpected tag.");
    }
    const name = this.readName();
    const attributes = this.readAttributes();
    this.skipSpace();
    if (this.source.startsWith("/>", this.index)) {
      this.index += 2;
      return { name, attributes, children: [], text: "" };
    }
    this.expect(">");
    const children: XmlElement[] = [];
    let text = "";
    while (this.index < this.source.length) {
      if (this.source.startsWith("</", this.index)) {
        this.index += 2;
        const end = this.readName();
        if (end !== name) {
          throw new Pob2XmlError("The PoB2 document has a mismatched tag.");
        }
        this.skipSpace();
        this.expect(">");
        return { name, attributes, children, text: text.trim() };
      }
      if (this.source.startsWith("<!--", this.index)) {
        this.skipComment();
        continue;
      }
      if (this.source.startsWith("<", this.index)) {
        children.push(this.parseElement(depth + 1));
        continue;
      }
      text += this.readText();
    }
    throw new Pob2XmlError("The PoB2 document ended inside an element.");
  }

  skipProlog(): void {
    this.skipSpace();
    if (this.source.startsWith("<?", this.index)) {
      const end = this.source.indexOf("?>", this.index);
      if (end === -1)
        throw new Pob2XmlError("The PoB2 document has a broken declaration.");
      this.index = end + 2;
      this.skipSpace();
    }
  }

  skipComment(): void {
    const end = this.source.indexOf("-->", this.index);
    if (end === -1)
      throw new Pob2XmlError("The PoB2 document has a broken comment.");
    this.index = end + 3;
  }

  readAttributes(): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (;;) {
      this.skipSpace();
      if (
        this.source.startsWith(">", this.index) ||
        this.source.startsWith("/>", this.index) ||
        this.index >= this.source.length
      ) {
        return attributes;
      }
      const name = this.readName();
      this.skipSpace();
      this.expect("=");
      this.skipSpace();
      attributes[name] = this.readQuoted();
    }
  }

  readQuoted(): string {
    const quote = this.source[this.index];
    if (quote !== '"' && quote !== "'") {
      throw new Pob2XmlError("The PoB2 document has an unquoted attribute.");
    }
    this.index += 1;
    let value = "";
    while (
      this.index < this.source.length &&
      this.source[this.index] !== quote
    ) {
      value += this.readChar();
    }
    this.expect(quote);
    return value;
  }

  readText(): string {
    let value = "";
    while (this.index < this.source.length && this.source[this.index] !== "<") {
      value += this.readChar();
    }
    return value;
  }

  readChar(): string {
    if (this.source[this.index] !== "&") {
      const char = this.source[this.index] ?? "";
      this.index += 1;
      return char;
    }
    const end = this.source.indexOf(";", this.index);
    if (end === -1)
      throw new Pob2XmlError("The PoB2 document has a broken entity.");
    const token = this.source.slice(this.index + 1, end);
    this.index = end + 1;
    const predefined: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
    };
    const decoded = predefined[token];
    if (decoded === undefined) {
      throw new Pob2XmlError("The PoB2 document uses an unsupported entity.");
    }
    return decoded;
  }

  readName(): string {
    const match = /^[A-Za-z_][\w:.-]*/.exec(this.source.slice(this.index));
    if (!match)
      throw new Pob2XmlError("The PoB2 document has an invalid name.");
    this.index += match[0].length;
    return match[0];
  }

  skipSpace(): void {
    while (
      this.index < this.source.length &&
      /\s/.test(this.source[this.index] ?? "")
    ) {
      this.index += 1;
    }
  }

  expect(token: string): void {
    if (!this.source.startsWith(token, this.index)) {
      throw new Pob2XmlError("The PoB2 document could not be parsed.");
    }
    this.index += token.length;
  }
}

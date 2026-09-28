/** Presentation checks only; the server remains the import authority. */
export function exportInputProblem(code: string): string | null {
  const value = code.trim();
  if (!value) return "Paste a Path of Building 2 export code to continue.";
  if (/^https?:\/\//i.test(value)) {
    return "This is a share link. Open it yourself and copy the build export code into this box. Buddy cannot import links yet.";
  }
  if (value.startsWith("<")) {
    return "This looks like XML. Copy the compressed export code from Path of Building 2 instead.";
  }
  return null;
}

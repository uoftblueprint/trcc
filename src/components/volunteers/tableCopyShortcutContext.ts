/**
 * Decides whether ⌘C / Ctrl+C should be left to the browser (native copy)
 * instead of copying selected table cells.
 */
export function isFormOrEditableElement(node: EventTarget | null): boolean {
  if (!node || !(node instanceof Element)) return false;
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export function shouldDeferVolunteersTableCopyShortcut(
  target: EventTarget | null,
  activeElement: Element | null
): boolean {
  const roots: Element[] = [];
  if (target instanceof Element) roots.push(target);
  if (activeElement instanceof Element) roots.push(activeElement);
  const unique = [...new Set(roots)];

  for (const el of unique) {
    if (isFormOrEditableElement(el)) return true;
    if (el.closest("[aria-modal=\"true\"]")) return true;
    if (el.closest("[role=\"dialog\"]")) return true;
    if (el.closest("[data-volunteers-overlay]")) return true;
  }
  return false;
}

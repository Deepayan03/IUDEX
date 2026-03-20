"use client";

import * as Y from "yjs";
let monacoBindingModulePromise: Promise<typeof import("y-monaco")> | null =
  null;

export function loadMonacoBinding() {
  monacoBindingModulePromise ??= import("y-monaco");
  return monacoBindingModulePromise;
}

export function seedYTextIfEmpty(
  ydoc: Y.Doc,
  initialContent: string | undefined,
): void {
  if (initialContent === undefined) return;

  const ytext = ydoc.getText("content");
  if (ytext.length > 0) return;

  ydoc.transact(() => {
    if (ytext.length === 0 && initialContent !== undefined) {
      ytext.insert(0, initialContent);
    }
  });
}

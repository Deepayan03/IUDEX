"use client";

import type * as Monaco from "monaco-editor";
import * as Y from "yjs";
import { buildDistinctPresenceColorMap } from "@/features/editor/collaboration/shared";

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

interface AwarenessLike {
  setLocalStateField: (field: string, value: unknown) => void;
}

function normalizeHexColor(color: string | undefined): string {
  if (!color) return "#60a5fa";

  const value = color.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(value) || /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  return "#60a5fa";
}

function hexToRgb(color: string): [number, number, number] {
  const normalized = normalizeHexColor(color);

  if (normalized.length === 4) {
    return [
      Number.parseInt(`${normalized[1]}${normalized[1]}`, 16),
      Number.parseInt(`${normalized[2]}${normalized[2]}`, 16),
      Number.parseInt(`${normalized[3]}${normalized[3]}`, 16),
    ];
  }

  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function hexToRgba(color: string, alpha: number): string {
  const [red, green, blue] = hexToRgb(color);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getCursorLabelTextColor(color: string): string {
  const [red, green, blue] = hexToRgb(color);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 160 ? "#06111f" : "#f8fafc";
}

function escapeCssContent(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\A ")
    .replace(/"/g, '\\"');
}

export function syncLocalSelectionToAwareness(
  editor: Monaco.editor.IStandaloneCodeEditor,
  ydoc: Y.Doc,
  awareness: AwarenessLike,
): void {
  const model = editor.getModel();
  const selection = editor.getSelection();
  if (!model || !selection) return;

  const ytext = ydoc.getText("content");
  const anchor = model.getOffsetAt(selection.getStartPosition());
  const head = model.getOffsetAt(selection.getEndPosition());

  awareness.setLocalStateField("selection", {
    anchor: Y.createRelativePositionFromTypeIndex(ytext, anchor),
    head: Y.createRelativePositionFromTypeIndex(ytext, head),
  });
}

export function buildRemoteCursorStyles(
  states: Map<number, unknown>,
  currentClientId: number,
): string {
  const rules: string[] = [];
  const colorMap = buildDistinctPresenceColorMap(states);

  states.forEach((value, clientId) => {
    if (clientId === currentClientId) return;

    const state = value as {
      user?:
        | {
            name?: string;
            color?: string;
          }
        | undefined;
    };

    if (!state.user) return;

    const color = normalizeHexColor(
      colorMap.get(clientId) ?? state.user?.color,
    );
    const label = escapeCssContent(state.user?.name?.trim() || "Anonymous");
    const labelTextColor = getCursorLabelTextColor(color);

    rules.push(`
.monaco-editor .yRemoteSelection-${clientId} {
  background-color: ${hexToRgba(color, 0.18)};
  border: 1px solid ${hexToRgba(color, 0.5)};
  border-radius: 4px;
}

.monaco-editor .yRemoteSelectionHead-${clientId} {
  color: ${color};
  box-shadow:
    0 0 0 1px rgba(6, 12, 24, 0.28),
    0 0 10px ${hexToRgba(color, 0.28)};
}

.monaco-editor .yRemoteSelectionHead-${clientId}::after {
  content: "${label}";
  background: ${color};
  color: ${labelTextColor};
}
`);
  });

  return rules.join("\n");
}

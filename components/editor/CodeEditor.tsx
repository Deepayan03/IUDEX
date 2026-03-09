"use client"

import dynamic from "next/dynamic"
import type * as Monaco from "monaco-editor"
import type { EditorPrefs } from "./types"

export type EditorInstance = Monaco.editor.IStandaloneCodeEditor

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface CodeEditorProps {
  language?:   string
  defaultValue?: string
  prefs?:      EditorPrefs
  onMount?:    (editor: EditorInstance) => void
  onChange?:   (value: string) => void
  /** When true, y-monaco drives content. `value` and `onChange` are bypassed. */
  crdtMode?:   boolean
}

export default function CodeEditor({
  language     = "typescript",
  defaultValue = "// Start coding…",
  prefs,
  onMount,
  onChange,
  crdtMode     = false,
}: CodeEditorProps) {
  // In CRDT mode, y-monaco controls content. We don't pass value or onChange.
  const valueProps = crdtMode
    ? {}
    : {
        value: defaultValue,
        onChange: (val: string | undefined) => {
          if (val !== undefined) onChange?.(val)
        },
      }

  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme={prefs?.theme ?? "vs-dark"}
      {...valueProps}
      onMount={(editor) => {
        onMount?.(editor as EditorInstance)
      }}
      options={{
        fontSize:              prefs?.fontSize         ?? 13,
        fontFamily:            prefs?.fontFamily       ?? "'JetBrains Mono','Fira Code','Consolas',monospace",
        tabSize:               prefs?.tabSize          ?? 2,
        wordWrap:              prefs?.wordWrap         ?? "on",
        minimap:               { enabled: prefs?.minimap ?? true, scale: 0.75 },
        lineNumbers:           prefs?.lineNumbers      ?? "on",
        renderWhitespace:      prefs?.renderWhitespace ?? "none",
        cursorStyle:           prefs?.cursorStyle      ?? "line",
        automaticLayout:       true,
        scrollBeyondLastLine:  false,
        padding:               { top: 16 },
        renderLineHighlight:   "all",
        overviewRulerBorder:   false,
        hideCursorInOverviewRuler: true,
        smoothScrolling:       true,
        cursorBlinking:        "smooth",
        scrollbar: {
          verticalScrollbarSize:   8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  )
}
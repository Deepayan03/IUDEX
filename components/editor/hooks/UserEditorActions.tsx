"use client"

import { useRef, useCallback } from "react"
import type * as Monaco from "monaco-editor"

export type EditorInstance = Monaco.editor.IStandaloneCodeEditor

export function useEditorActions() {
  const editorRef = useRef<EditorInstance | null>(null)

  const setEditor = useCallback((editor: EditorInstance) => {
    editorRef.current = editor
  }, [])

  const getValue = useCallback((): string =>
    editorRef.current?.getValue() ?? "", [])

  // Run a named Monaco built-in action
  const runAction = useCallback((actionId: string) => {
    const ed = editorRef.current
    if (!ed) return
    ed.focus()
    ed.getAction(actionId)?.run()
  }, [])

  // Trigger a Monaco command by handler ID
  const triggerCmd = useCallback((handlerId: string, payload?: unknown) => {
    const ed = editorRef.current
    if (!ed) return
    ed.focus()
    ed.trigger("keyboard", handlerId, payload ?? null)
  }, [])

  const actions = {
    // Edit
    undo:           () => triggerCmd("undo"),
    redo:           () => triggerCmd("redo"),
    selectAll:      () => triggerCmd("selectAll"),
    find:           () => runAction("actions.find"),
    replace:        () => runAction("editor.action.startFindReplaceAction"),
    formatDoc:      () => runAction("editor.action.formatDocument"),
    toggleComment:  () => runAction("editor.action.commentLine"),
    // Go
    goToLine:       () => runAction("editor.action.gotoLine"),
    goToSymbol:     () => runAction("editor.action.quickOutline"),
    goToDefinition: () => runAction("editor.action.revealDefinition"),
    // Debug
    toggleBreak:    () => runAction("editor.debug.action.toggleBreakpoint"),
    // Fold
    foldAll:        () => runAction("editor.foldAll"),
    unfoldAll:      () => runAction("editor.unfoldAll"),
    // Clipboard (via trigger)
    trigger:        triggerCmd,
  }

  return { editorRef, setEditor, getValue, actions }
}
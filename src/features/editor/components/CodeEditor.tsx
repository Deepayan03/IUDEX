"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useMonaco } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"
import type { EditorPrefs } from "@/features/editor/lib/types"

export type EditorInstance = Monaco.editor.IStandaloneCodeEditor
type MonacoRuntime = typeof import("monaco-editor")
type MonacoTypeScriptApi = {
  typescriptDefaults: {
    setEagerModelSync: (value: boolean) => void
    setCompilerOptions: (options: Record<string, unknown>) => void
  }
  javascriptDefaults: {
    setEagerModelSync: (value: boolean) => void
    setCompilerOptions: (options: Record<string, unknown>) => void
  }
}

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })
const WORKSPACE_ROOT = "/iudex-workspace"
let monacoProjectDefaultsConfigured = false

interface CodeEditorProps {
  language?:   string
  defaultValue?: string
  filePath?: string
  projectFiles?: Array<{
    path: string
    language: string
    content?: string
  }>
  prefs?:      EditorPrefs
  onMount?:    (editor: EditorInstance) => void
  onChange?:   (value: string) => void
  /** When true, y-monaco drives content. `value` and `onChange` are bypassed. */
  crdtMode?:   boolean
}

interface PythonModuleEntry {
  moduleName: string
  path: string
  symbols: string[]
}

interface PythonProjectIndex {
  moduleEntries: PythonModuleEntry[]
  moduleMap: Map<string, PythonModuleEntry>
  moduleSuggestions: string[]
}

interface ProjectDirectoryEntry {
  directories: Set<string>
  files: Set<string>
}

interface ProjectPathIndex {
  directories: Map<string, ProjectDirectoryEntry>
}

let pythonProjectIndex: PythonProjectIndex = {
  moduleEntries: [],
  moduleMap: new Map(),
  moduleSuggestions: [],
}
let pythonCompletionProviderRegistered = false
let importPathCompletionProvidersRegistered = false
let projectPathIndex: ProjectPathIndex = {
  directories: new Map(),
}
let activeImportFilePath = ""
let monacoUnhandledRejectionGuardInstalled = false

function normalizeProjectPath(path: string): string {
  return path.replace(/^\/+/, "")
}

function buildMonacoModelPath(path: string): string {
  return `file://${WORKSPACE_ROOT}/${normalizeProjectPath(path)}`
}

function buildMonacoModelUri(
  monaco: MonacoRuntime,
  path: string,
): Monaco.Uri {
  return monaco.Uri.parse(buildMonacoModelPath(path))
}

function getMonacoTypeScriptApi(
  monaco: MonacoRuntime,
): MonacoTypeScriptApi | null {
  const api = (
    monaco.languages as MonacoRuntime["languages"] & {
      typescript?: Partial<MonacoTypeScriptApi>
    }
  ).typescript

  if (
    !api ||
    typeof api !== "object" ||
    !api.typescriptDefaults ||
    !api.javascriptDefaults
  ) {
    return null
  }

  return api as MonacoTypeScriptApi
}

function isMonacoBenignRejection(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") {
    return false
  }

  const candidate = reason as {
    type?: unknown
    name?: unknown
    rejectReason?: unknown
    message?: unknown
  }

  if (candidate.type === "cancelation") {
    return true
  }

  if (typeof candidate.rejectReason === "string") {
    return true
  }

  if (
    typeof candidate.name === "string" &&
    /cancel/i.test(candidate.name)
  ) {
    return true
  }

  if (
    typeof candidate.message === "string" &&
    /cancel/i.test(candidate.message)
  ) {
    return true
  }

  return false
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isLikelyEditorObjectRejection(reason: unknown): boolean {
  if (!isPlainObject(reason)) {
    return false
  }

  if (isMonacoBenignRejection(reason)) {
    return true
  }

  const keys = Object.keys(reason)
  if (keys.length === 0) {
    return false
  }

  return keys.every((key) =>
    [
      "detail",
      "message",
      "msg",
      "name",
      "rejectReason",
      "stack",
      "type",
    ].includes(key),
  )
}

function describeUnhandledReason(reason: unknown): Record<string, unknown> {
  if (reason instanceof Error) {
    return {
      type: "Error",
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
    }
  }

  if (isPlainObject(reason)) {
    return {
      type: "object",
      keys: Object.keys(reason),
      value: Object.fromEntries(
        Object.entries(reason).map(([key, value]) => [
          key,
          typeof value === "object" ? String(value) : value,
        ]),
      ),
    }
  }

  return {
    type: typeof reason,
    value: String(reason),
  }
}

function installMonacoUnhandledRejectionGuard(): void {
  if (monacoUnhandledRejectionGuardInstalled || typeof window === "undefined") {
    return
  }

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const onEditorRoute = window.location.pathname.startsWith("/editor/")
      const shouldSuppress =
        isMonacoBenignRejection(event.reason) ||
        (onEditorRoute && isLikelyEditorObjectRejection(event.reason))

      if (shouldSuppress) {
        console.warn(
          "[iudex] Suppressed editor unhandled rejection.",
          describeUnhandledReason(event.reason),
        )
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      console.error(
        "[iudex] Unhandled rejection reached window listener.",
        describeUnhandledReason(event.reason),
      )
    },
    { capture: true },
  )

  monacoUnhandledRejectionGuardInstalled = true
}

function configureMonacoProjectDefaults(monaco: MonacoRuntime): void {
  if (monacoProjectDefaultsConfigured) return

  const tsApi = getMonacoTypeScriptApi(monaco)
  if (!tsApi) return

  const compilerOptions = {
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    jsx: 4,
    module: 99,
    moduleResolution: 2,
    noEmit: true,
    resolveJsonModule: true,
    target: 7,
    baseUrl: WORKSPACE_ROOT,
    paths: {
      "@/*": ["*"],
    },
  }

  tsApi.typescriptDefaults.setEagerModelSync(true)
  tsApi.javascriptDefaults.setEagerModelSync(true)
  tsApi.typescriptDefaults.setCompilerOptions(compilerOptions)
  tsApi.javascriptDefaults.setCompilerOptions(compilerOptions)

  monacoProjectDefaultsConfigured = true
}

function buildPythonModuleName(path: string): string | null {
  if (!path.endsWith(".py")) return null

  const normalized = normalizeProjectPath(path)
  const withoutExtension = normalized.replace(/\.py$/, "")

  if (withoutExtension === "__init__") {
    return null
  }

  if (withoutExtension.endsWith("/__init__")) {
    const packageName = withoutExtension.slice(0, -"/__init__".length)
    return packageName ? packageName.replace(/\//g, ".") : null
  }

  return withoutExtension.replace(/\//g, ".")
}

function extractPythonSymbols(content?: string): string[] {
  if (!content) return []

  const symbols = new Set<string>()

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || /^\s/.test(line)) continue

    const callableMatch = line.match(
      /^(?:async\s+def|def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/,
    )
    if (callableMatch) {
      symbols.add(callableMatch[1])
      continue
    }

    const assignmentMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/)
    if (assignmentMatch && !assignmentMatch[1].startsWith("_")) {
      symbols.add(assignmentMatch[1])
    }
  }

  return Array.from(symbols).sort((left, right) => left.localeCompare(right))
}

function buildPythonProjectIndex(projectFiles: CodeEditorProps["projectFiles"]): PythonProjectIndex {
  const moduleEntries: PythonModuleEntry[] = []
  const moduleMap = new Map<string, PythonModuleEntry>()
  const moduleSuggestions = new Set<string>()

  for (const projectFile of projectFiles ?? []) {
    if (projectFile.language !== "python") continue

    const moduleName = buildPythonModuleName(projectFile.path)
    if (!moduleName) continue

    const entry: PythonModuleEntry = {
      moduleName,
      path: projectFile.path,
      symbols: extractPythonSymbols(projectFile.content),
    }

    moduleEntries.push(entry)
    moduleMap.set(moduleName, entry)

    const segments = moduleName.split(".")
    for (let index = 1; index <= segments.length; index += 1) {
      moduleSuggestions.add(segments.slice(0, index).join("."))
    }
  }

  return {
    moduleEntries,
    moduleMap,
    moduleSuggestions: Array.from(moduleSuggestions).sort((left, right) =>
      left.localeCompare(right),
    ),
  }
}

function getOrCreateDirectoryEntry(
  directories: Map<string, ProjectDirectoryEntry>,
  path: string,
): ProjectDirectoryEntry {
  const existing = directories.get(path)
  if (existing) {
    return existing
  }

  const nextEntry: ProjectDirectoryEntry = {
    directories: new Set(),
    files: new Set(),
  }
  directories.set(path, nextEntry)
  return nextEntry
}

function buildProjectPathIndex(
  projectFiles: CodeEditorProps["projectFiles"],
): ProjectPathIndex {
  const directories = new Map<string, ProjectDirectoryEntry>()
  getOrCreateDirectoryEntry(directories, "")

  for (const projectFile of projectFiles ?? []) {
    const normalizedPath = normalizeProjectPath(projectFile.path)
    const segments = normalizedPath.split("/").filter(Boolean)
    if (segments.length === 0) continue

    let currentDirectory = ""

    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index]
      const currentEntry = getOrCreateDirectoryEntry(directories, currentDirectory)
      currentEntry.directories.add(segment)
      currentDirectory = currentDirectory
        ? `${currentDirectory}/${segment}`
        : segment
      getOrCreateDirectoryEntry(directories, currentDirectory)
    }

    getOrCreateDirectoryEntry(directories, currentDirectory).files.add(
      segments[segments.length - 1],
    )
  }

  return { directories }
}

function getDirectoryName(path: string): string {
  const normalizedPath = normalizeProjectPath(path)
  const lastSlashIndex = normalizedPath.lastIndexOf("/")
  return lastSlashIndex === -1 ? "" : normalizedPath.slice(0, lastSlashIndex)
}

function resolveRelativeDirectory(
  currentDirectory: string,
  relativeDirectory: string,
): string | null {
  const resolvedSegments = currentDirectory ? currentDirectory.split("/") : []
  const relativeSegments = relativeDirectory.split("/").filter(Boolean)

  for (const segment of relativeSegments) {
    if (segment === ".") continue

    if (segment === "..") {
      if (resolvedSegments.length === 0) {
        return null
      }

      resolvedSegments.pop()
      continue
    }

    resolvedSegments.push(segment)
  }

  return resolvedSegments.join("/")
}

function getImportPathContext(linePrefix: string): { partialPath: string } | null {
  const patterns = [
    /^\s*import\s+["']([^"']*)$/,
    /^\s*import[\s\S]*?\bfrom\s+["']([^"']*)$/,
    /^\s*export[\s\S]*?\bfrom\s+["']([^"']*)$/,
    /(?:^|[^\w])require\(\s*["']([^"']*)$/,
    /(?:^|[^\w])import\(\s*["']([^"']*)$/,
  ]

  for (const pattern of patterns) {
    const match = linePrefix.match(pattern)
    if (match) {
      return { partialPath: match[1] ?? "" }
    }
  }

  return null
}

function buildImportPathCompletionRange(
  position: Monaco.Position,
  partialPath: string,
): Monaco.IRange {
  return {
    startLineNumber: position.lineNumber,
    startColumn: Math.max(1, position.column - partialPath.length),
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  }
}

function isCanonicalRelativeImportPath(partialPath: string): boolean {
  if (!partialPath.startsWith(".")) {
    return false
  }

  if (partialPath.includes("//")) {
    return false
  }

  if (
    partialPath.startsWith("././") ||
    partialPath.startsWith(".././") ||
    partialPath.includes("/./") ||
    partialPath.endsWith("/.")
  ) {
    return false
  }

  return true
}

function buildRelativeImportSuggestions(options: {
  monaco: MonacoRuntime
  position: Monaco.Position
  partialPath: string
}): Monaco.languages.CompletionItem[] {
  const partialPath = options.partialPath.replace(/\\/g, "/")
  if (!isCanonicalRelativeImportPath(partialPath)) {
    return []
  }

  const currentDirectory = getDirectoryName(activeImportFilePath)
  const lastSlashIndex = partialPath.lastIndexOf("/")
  const directoryPart = lastSlashIndex === -1
    ? ""
    : partialPath.slice(0, lastSlashIndex + 1)
  const namePrefix = lastSlashIndex === -1
    ? partialPath
    : partialPath.slice(lastSlashIndex + 1)

  let resolvedDirectory: string | null

  if (partialPath === "." || partialPath === "..") {
    resolvedDirectory = resolveRelativeDirectory(currentDirectory, partialPath)
  } else if (directoryPart) {
    resolvedDirectory = resolveRelativeDirectory(currentDirectory, directoryPart)
  } else {
    resolvedDirectory = currentDirectory
  }

  if (resolvedDirectory === null) {
    return []
  }

  const directoryEntry = projectPathIndex.directories.get(resolvedDirectory)
  if (!directoryEntry) {
    return []
  }

  const range = buildImportPathCompletionRange(options.position, partialPath)
  const suggestions: Monaco.languages.CompletionItem[] = []
  const seenInsertTexts = new Set<string>()

  for (const directoryName of Array.from(directoryEntry.directories).sort()) {
    if (namePrefix && !directoryName.startsWith(namePrefix)) continue

    const insertText = directoryPart
      ? `${directoryPart}${directoryName}/`
      : `${directoryName}/`
    if (seenInsertTexts.has(insertText)) continue
    seenInsertTexts.add(insertText)

    suggestions.push({
      label: insertText,
      kind: options.monaco.languages.CompletionItemKind.Folder,
      insertText,
      range,
      detail: "Project folder",
      sortText: `0-${insertText}`,
    })
  }

  for (const fileName of Array.from(directoryEntry.files).sort()) {
    if (namePrefix && !fileName.startsWith(namePrefix)) continue

    const fullFilePath = resolvedDirectory
      ? `${resolvedDirectory}/${fileName}`
      : fileName
    if (fullFilePath === normalizeProjectPath(activeImportFilePath)) {
      continue
    }

    const insertText = directoryPart
      ? `${directoryPart}${fileName}`
      : fileName
    if (seenInsertTexts.has(insertText)) continue
    seenInsertTexts.add(insertText)

    suggestions.push({
      label: insertText,
      kind: options.monaco.languages.CompletionItemKind.File,
      insertText,
      range,
      detail: "Project file",
      sortText: `1-${insertText}`,
    })
  }

  if (partialPath === ".") {
    suggestions.unshift({
      label: "./",
      kind: options.monaco.languages.CompletionItemKind.Folder,
      insertText: "./",
      range,
      detail: "Current directory",
      sortText: "0-./",
    })
  }

  if (partialPath === "..") {
    suggestions.unshift({
      label: "../",
      kind: options.monaco.languages.CompletionItemKind.Folder,
      insertText: "../",
      range,
      detail: "Parent directory",
      sortText: "0-../",
    })
  }

  return suggestions
}

function ensureImportPathCompletionProviders(monaco: MonacoRuntime): void {
  if (importPathCompletionProvidersRegistered) return

  for (const languageId of ["typescript", "javascript"]) {
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: [".", "/", "'", "\""],
      provideCompletionItems(model, position) {
        try {
          const linePrefix = model
            .getLineContent(position.lineNumber)
            .slice(0, position.column - 1)
          const context = getImportPathContext(linePrefix)

          if (!context) {
            return { suggestions: [] }
          }

          return {
            suggestions: buildRelativeImportSuggestions({
              monaco,
              position,
              partialPath: context.partialPath,
            }),
          }
        } catch (error) {
          console.error("[iudex] Import path completion failed.", error)
          return { suggestions: [] }
        }
      },
    })
  }

  importPathCompletionProvidersRegistered = true
}

function getPythonModuleChildSuggestions(
  index: PythonProjectIndex,
  moduleName: string,
): string[] {
  const childNames = new Set<string>()
  const prefix = `${moduleName}.`

  for (const suggestion of index.moduleSuggestions) {
    if (!suggestion.startsWith(prefix)) continue

    const remainder = suggestion.slice(prefix.length)
    if (!remainder) continue

    childNames.add(remainder.split(".")[0])
  }

  return Array.from(childNames).sort((left, right) => left.localeCompare(right))
}

function buildPythonCompletionRange(
  monaco: MonacoRuntime,
  position: Monaco.Position,
  partial: string,
): Monaco.IRange {
  return {
    startLineNumber: position.lineNumber,
    startColumn: Math.max(1, position.column - partial.length),
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  }
}

function buildPythonModuleSuggestions(options: {
  monaco: MonacoRuntime
  position: Monaco.Position
  partial: string
}): Monaco.languages.CompletionItem[] {
  const partial = options.partial.trim()
  const range = buildPythonCompletionRange(
    options.monaco,
    options.position,
    partial,
  )

  return pythonProjectIndex.moduleSuggestions
    .filter((suggestion) => !partial || suggestion.startsWith(partial))
    .map((suggestion) => ({
      label: suggestion,
      kind: options.monaco.languages.CompletionItemKind.Module,
      insertText: suggestion,
      range,
      detail: "Project module",
      sortText: `0-${suggestion}`,
    }))
}

function buildPythonImportTargetSuggestions(options: {
  monaco: MonacoRuntime
  moduleName: string
  position: Monaco.Position
  partial: string
}): Monaco.languages.CompletionItem[] {
  const partial = options.partial.trim()
  const range = buildPythonCompletionRange(
    options.monaco,
    options.position,
    partial,
  )
  const moduleEntry = pythonProjectIndex.moduleMap.get(options.moduleName)
  const seen = new Set<string>()
  const suggestions: Monaco.languages.CompletionItem[] = []

  for (const symbol of moduleEntry?.symbols ?? []) {
    if (partial && !symbol.startsWith(partial)) continue
    if (seen.has(symbol)) continue
    seen.add(symbol)

    suggestions.push({
      label: symbol,
      kind: options.monaco.languages.CompletionItemKind.Variable,
      insertText: symbol,
      range,
      detail: `Symbol from ${options.moduleName}`,
      sortText: `0-${symbol}`,
    })
  }

  for (const childModule of getPythonModuleChildSuggestions(
    pythonProjectIndex,
    options.moduleName,
  )) {
    if (partial && !childModule.startsWith(partial)) continue
    if (seen.has(childModule)) continue
    seen.add(childModule)

    suggestions.push({
      label: childModule,
      kind: options.monaco.languages.CompletionItemKind.Module,
      insertText: childModule,
      range,
      detail: `Module from ${options.moduleName}`,
      sortText: `1-${childModule}`,
    })
  }

  return suggestions
}

function ensurePythonCompletionProvider(monaco: MonacoRuntime): void {
  if (pythonCompletionProviderRegistered) return

  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", ",", " "],
    provideCompletionItems(model, position) {
      try {
        const linePrefix = model
          .getLineContent(position.lineNumber)
          .slice(0, position.column - 1)

        const fromImportMatch = linePrefix.match(
          /^\s*from\s+([A-Za-z_][A-Za-z0-9_\.]*)\s+import\s+([^#]*)$/,
        )
        if (fromImportMatch) {
          const importList = fromImportMatch[2]
          const partial = importList.split(",").pop()?.trimStart() ?? ""

          return {
            suggestions: buildPythonImportTargetSuggestions({
              monaco,
              moduleName: fromImportMatch[1],
              position,
              partial,
            }),
          }
        }

        const fromModuleMatch = linePrefix.match(/^\s*from\s+([A-Za-z0-9_\.]*)$/)
        if (fromModuleMatch) {
          return {
            suggestions: buildPythonModuleSuggestions({
              monaco,
              position,
              partial: fromModuleMatch[1] ?? "",
            }),
          }
        }

        const importMatch = linePrefix.match(/^\s*import\s+([^#]*)$/)
        if (importMatch) {
          const partial = importMatch[1].split(",").pop()?.trimStart() ?? ""

          return {
            suggestions: buildPythonModuleSuggestions({
              monaco,
              position,
              partial,
            }),
          }
        }

        return { suggestions: [] }
      } catch (error) {
        console.error("[iudex] Python completion failed.", error)
        return { suggestions: [] }
      }
    },
  })

  pythonCompletionProviderRegistered = true
}

export default function CodeEditor({
  language     = "typescript",
  defaultValue = "// Start coding…",
  filePath,
  projectFiles = [],
  prefs,
  onMount,
  onChange,
  crdtMode     = false,
}: CodeEditorProps) {
  installMonacoUnhandledRejectionGuard()
  const monaco = useMonaco()

  useEffect(() => {
    if (!monaco) return

    pythonProjectIndex = buildPythonProjectIndex(projectFiles)
    projectPathIndex = buildProjectPathIndex(projectFiles)
    activeImportFilePath = filePath ?? ""
    ensurePythonCompletionProvider(monaco)
    ensureImportPathCompletionProviders(monaco)

    try {
      configureMonacoProjectDefaults(monaco)
    } catch (error) {
      console.error("[iudex] Unable to configure Monaco project defaults.", error)
      return
    }

    const activeModelPath = filePath ? buildMonacoModelPath(filePath) : null
    for (const projectFile of projectFiles) {
      try {
        const modelPath = buildMonacoModelPath(projectFile.path)
        if (modelPath === activeModelPath) {
          continue
        }

        const modelUri = buildMonacoModelUri(monaco, projectFile.path)
        const existingModel = monaco.editor.getModel(modelUri)

        if (projectFile.content === undefined) {
          continue
        }

        if (existingModel) {
          if (existingModel.getLanguageId() !== projectFile.language) {
            monaco.editor.setModelLanguage(existingModel, projectFile.language)
          }

          if (existingModel.getValue() !== projectFile.content) {
            existingModel.setValue(projectFile.content)
          }

          continue
        }

        monaco.editor.createModel(
          projectFile.content,
          projectFile.language,
          modelUri,
        )
      } catch (error) {
        console.error(
          `[iudex] Unable to sync Monaco model for ${projectFile.path}.`,
          error,
        )
      }
    }
  }, [crdtMode, filePath, monaco, projectFiles])

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
      path={filePath ? buildMonacoModelPath(filePath) : undefined}
      theme={prefs?.theme ?? "vs-dark"}
      {...valueProps}
      beforeMount={(instance) => {
        try {
          configureMonacoProjectDefaults(instance as MonacoRuntime)
        } catch (error) {
          console.error("[iudex] Monaco beforeMount failed.", error)
        }
      }}
      onMount={(editor, instance) => {
        try {
          configureMonacoProjectDefaults(instance as MonacoRuntime)
        } catch (error) {
          console.error("[iudex] Monaco onMount setup failed.", error)
        }
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

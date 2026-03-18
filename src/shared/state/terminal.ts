import { create } from "zustand"

export interface TerminalLine {
  id: number
  type: "input" | "output" | "error" | "info"
  text: string
}

interface CommandResult {
  lines: TerminalLine[]
  newCwd?: string
  clear?: boolean
}

interface TerminalState {
  lines: TerminalLine[]
  history: string[]
  cwd: string
  executeCommand: (cmd: string) => void
  clearScreen: () => void
  resetSession: () => void
}

const TERMINAL_ROOT = "/workspace/iudex"
const HISTORY_LIMIT = 50

let lineId = 0

function mkLine(type: TerminalLine["type"], text: string): TerminalLine {
  lineId += 1
  return { id: lineId, type, text }
}

function introLines(): TerminalLine[] {
  return [
    mkLine("info", "IUDEX Terminal  •  bash  •  type 'help' for commands"),
    mkLine("info", "─".repeat(52)),
  ]
}

function runCommand(cmd: string, cwd: string): CommandResult {
  const parts = cmd.trim().split(/\s+/)
  const bin = parts[0]
  const args = parts.slice(1)

  if (!bin) return { lines: [] }

  switch (bin) {
    case "clear":
      return { clear: true, lines: introLines() }

    case "echo":
      return { lines: [mkLine("output", args.join(" "))] }

    case "pwd":
      return { lines: [mkLine("output", cwd)] }

    case "ls":
    case "ls -la":
      return {
        lines: [
          mkLine("output", "drwxr-xr-x  app/"),
          mkLine("output", "drwxr-xr-x  components/"),
          mkLine("output", "drwxr-xr-x  lib/"),
          mkLine("output", "-rw-r--r--  package.json"),
          mkLine("output", "-rw-r--r--  tsconfig.json"),
          mkLine("output", "-rw-r--r--  next.config.ts"),
        ],
      }

    case "cd": {
      const target = args[0] ?? "~"
      if (target === "..") {
        const cwdParts = cwd.split("/").filter(Boolean)
        cwdParts.pop()
        const next = "/" + cwdParts.join("/")
        return { lines: [], newCwd: next || "/" }
      }
      const next = target.startsWith("/") ? target : `${cwd}/${target}`.replace("//", "/")
      return { lines: [], newCwd: next }
    }

    case "node":
      if (args[0]) {
        return {
          lines: [
            mkLine("info", `Running ${args[0]} with Node.js...`),
            mkLine("output", "Program exited successfully."),
          ],
        }
      }
      return {
        lines: [
          mkLine("output", "Welcome to Node.js v20.11.0."),
          mkLine("output", 'Type ".help" for more information.'),
        ],
      }

    case "tsx":
      if (args[0]) {
        return {
          lines: [
            mkLine("info", `Executing ${args[0]} with tsx...`),
            mkLine("output", "TypeScript entrypoint finished successfully."),
          ],
        }
      }
      return { lines: [mkLine("error", "tsx: missing script path")] }

    case "python":
    case "python3":
      if (args[0]) {
        return {
          lines: [
            mkLine("info", `Running ${args[0]} with Python...`),
            mkLine("output", "Script finished with exit code 0."),
          ],
        }
      }
      return { lines: [mkLine("error", `${bin}: missing script path`)] }

    case "sh":
    case "bash":
      if (args[0]) {
        return {
          lines: [
            mkLine("info", `Executing shell script ${args[0]}...`),
            mkLine("output", "Script completed successfully."),
          ],
        }
      }
      return { lines: [mkLine("error", `${bin}: missing script path`)] }

    case "php":
      if (args[0]) {
        return {
          lines: [
            mkLine("info", `Running ${args[0]} with PHP...`),
            mkLine("output", "Script finished with exit code 0."),
          ],
        }
      }
      return { lines: [mkLine("error", "php: missing script path")] }

    case "go":
      if (args[0] === "run" && args[1]) {
        return {
          lines: [
            mkLine("info", `go run ${args[1]}`),
            mkLine("output", "Go program finished successfully."),
          ],
        }
      }
      if (args[0] === "build") {
        return { lines: [mkLine("output", "Go build completed successfully.")] }
      }
      return { lines: [mkLine("output", `go ${args.join(" ")}`)] }

    case "cargo":
      if (args[0] === "build") {
        return { lines: [mkLine("output", "Finished dev profile [unoptimized] target(s) in 1.21s")] }
      }
      if (args[0] === "run") {
        return {
          lines: [
            mkLine("info", "Compiling project..."),
            mkLine("output", "Running `target/debug/app`"),
            mkLine("output", "Program exited successfully."),
          ],
        }
      }
      return { lines: [mkLine("output", `cargo ${args.join(" ")}`)] }

    case "npm":
      if (args[0] === "run" && args[1]) {
        return {
          lines: [
            mkLine("info", `> iudex@0.1.0 ${args[1]}`),
            mkLine("info", `> next ${args[1] === "build" ? "build" : "dev"}`),
            mkLine(
              "output",
              args[1] === "build"
                ? "✓ Compiled successfully"
                : "▲ Next.js 16.1.6\n- Local: http://localhost:3000"
            ),
          ],
        }
      }
      if (args[0] === "install") {
        return { lines: [mkLine("output", "added 342 packages in 4.2s")] }
      }
      return { lines: [mkLine("output", `npm ${args.join(" ")}`)] }

    case "git":
      if (args[0] === "status") {
        return { lines: [mkLine("output", "On branch main\nnothing to commit, working tree clean")] }
      }
      if (args[0] === "log") {
        return {
          lines: [
            mkLine(
              "output",
              `commit a1b2c3d (HEAD -> main)\nAuthor: dev <dev@iudex.io>\nDate:   ${new Date().toDateString()}`
            ),
          ],
        }
      }
      if (args[0] === "branch") {
        return { lines: [mkLine("output", "* main")] }
      }
      return { lines: [mkLine("output", `git ${args.join(" ")} — OK`)] }

    case "date":
      return { lines: [mkLine("output", new Date().toString())] }

    case "whoami":
      return { lines: [mkLine("output", "developer")] }

    case "help":
      return {
        lines: [
          mkLine("info", "Available commands:"),
          mkLine("output", "  ls, pwd, cd <dir>, echo <text>"),
          mkLine("output", "  git status|log|branch"),
          mkLine("output", "  npm run <script> | npm install"),
          mkLine("output", "  node, tsx, python, sh, php"),
          mkLine("output", "  date, whoami, clear, help"),
        ],
      }

    default:
      return { lines: [mkLine("error", `${bin}: command not found — try 'help'`)] }
  }
}

export const useTerminalStore = create<TerminalState>((set) => ({
  lines: introLines(),
  history: [],
  cwd: TERMINAL_ROOT,

  executeCommand: (cmd) =>
    set((state) => {
      const trimmed = cmd.trim()
      if (!trimmed) return state

      const result = runCommand(trimmed, state.cwd)

      if (result.clear) {
        return {
          lines: result.lines,
          history: [trimmed, ...state.history.slice(0, HISTORY_LIMIT - 1)],
          cwd: result.newCwd ?? state.cwd,
        }
      }

      const prompt = mkLine("input", `${state.cwd} $ ${trimmed}`)

      return {
        lines: [...state.lines, prompt, ...result.lines],
        history: [trimmed, ...state.history.slice(0, HISTORY_LIMIT - 1)],
        cwd: result.newCwd ?? state.cwd,
      }
    }),

  clearScreen: () =>
    set((state) => ({
      ...state,
      lines: introLines(),
    })),

  resetSession: () =>
    set({
      lines: introLines(),
      history: [],
      cwd: TERMINAL_ROOT,
    }),
}))

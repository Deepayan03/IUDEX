export type ProjectTemplateId =
  | "empty"
  | "starter"
  | "next-basic"
  | "node-basic"

export interface ProjectTemplateOption {
  id: ProjectTemplateId
  label: string
  description: string
}

export const DEFAULT_PROJECT_TEMPLATE: ProjectTemplateId = "starter"

export const PROJECT_TEMPLATE_OPTIONS: readonly ProjectTemplateOption[] = [
  {
    id: "empty",
    label: "Empty Workspace",
    description: "Start with a blank room and create your own folders and files.",
  },
  {
    id: "starter",
    label: "Starter",
    description: "Use the current IUDEX demo workspace with prebuilt example files.",
  },
  {
    id: "next-basic",
    label: "Next Basic",
    description: "Scaffold a minimal Next.js App Router project tree.",
  },
  {
    id: "node-basic",
    label: "Node Basic",
    description: "Start from a lightweight Node.js script project.",
  },
] as const

export function parseProjectTemplate(
  value: string | null | undefined
): ProjectTemplateId {
  return PROJECT_TEMPLATE_OPTIONS.some((template) => template.id === value)
    ? (value as ProjectTemplateId)
    : DEFAULT_PROJECT_TEMPLATE
}

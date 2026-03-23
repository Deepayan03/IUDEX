import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/auth/authOptions"
import { redirect } from "next/navigation"
import EditorLayout from "@/features/editor/components/EditorLayout"
import { parseProjectTemplate } from "@/features/editor/lib/projectTemplateMetadata"

interface PageProps {
  params: Promise<{ roomId: string }>
  searchParams: Promise<{ template?: string | string[] }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const [{ roomId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  const templateParam = resolvedSearchParams.template
  const selectedTemplate = parseProjectTemplate(
    Array.isArray(templateParam) ? templateParam[0] : templateParam
  )

  const userInfo = {
    userId: session.user?.email ?? "anonymous",
    username: session.user?.name ?? "Anonymous",
  }

  return (
    <EditorLayout
      roomId={roomId}
      userInfo={userInfo}
      selectedTemplate={selectedTemplate}
    />
  )
}

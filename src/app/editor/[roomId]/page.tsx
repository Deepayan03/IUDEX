import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/auth/authOptions"
import { redirect } from "next/navigation"
import EditorLayout from "@/features/editor/components/EditorLayout"

interface PageProps {
  params: Promise<{ roomId: string }>
}

export default async function Page({ params }: PageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const { roomId } = await params

  const userInfo = {
    userId: session.user?.email ?? "anonymous",
    username: session.user?.name ?? "Anonymous",
  }

  return (
    <EditorLayout
      roomId={roomId}
      userInfo={userInfo}
    />
  )
}

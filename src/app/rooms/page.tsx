import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/auth/authOptions"
import { redirect } from "next/navigation"
import RoomsPage from "@/features/rooms/components/RoomsPage"

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return (
    <RoomsPage
      userInfo={{
        username: session.user?.name ?? "Anonymous",
        email: session.user?.email ?? "",
      }}
    />
  )
}

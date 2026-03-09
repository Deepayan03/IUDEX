import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/authOptions"
import { redirect } from "next/navigation"
import RoomsPage from "@/components/rooms/RoomsPage"

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

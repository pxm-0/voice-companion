import { TodayHub } from "@/app/_components/today-hub"
import { Landing } from "@/app/_components/landing"
import { auth } from "@/lib/auth"
import { getTodayHubData } from "@/lib/session-finalizer"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <Landing />
  }

  const data = await getTodayHubData(session.user.id)
  return <TodayHub data={data} />
}

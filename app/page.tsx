import { TodayHub } from "@/app/_components/today-hub"
import { getTodayHubData } from "@/lib/session-finalizer"

export default async function HomePage() {
  const data = await getTodayHubData()

  return <TodayHub data={data} />
}

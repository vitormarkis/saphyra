import type { ReactNode } from "react"
import { ClientLayout } from "./client-layout"
import { cookies } from "next/headers"

export default async function Layout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get("theme")?.value as "light" | "dark") || "light"

  return <ClientLayout initialTheme={theme}>{children}</ClientLayout>
}

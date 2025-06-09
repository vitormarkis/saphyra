"use client"

import type { ReactNode } from "react"
import { useSyncExternalStore, createContext, useContext } from "react"
import { HomeLayout } from "fumadocs-ui/layouts/home"
import { baseOptions } from "@/app/layout.config"

const ThemeContext = createContext<"light" | "dark">("light")

function useTheme(): "light" | "dark" {
  const initialTheme = useContext(ThemeContext)

  return useSyncExternalStore(
    callback => {
      const observer = new MutationObserver(() => {
        const colorScheme = getComputedStyle(document.documentElement)
          .colorScheme as "light" | "dark"
        // Save to cookie when theme changes
        document.cookie = `theme=${colorScheme}; path=/; max-age=31536000`
        callback()
      })
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["style"],
      })
      return () => observer.disconnect()
    },
    () =>
      getComputedStyle(document.documentElement).colorScheme as
        | "light"
        | "dark",
    () => initialTheme
  )
}

function ThemeLayout({ children }: { children: ReactNode }) {
  const theme = useTheme()

  return (
    <HomeLayout
      style={
        {
          background:
            theme === "dark"
              ? "linear-gradient(20deg, rgb(0, 0, 0) 20%, rgb(0 5 33 / 29%) 50%, rgb(0, 0, 0) 80%)"
              : "linear-gradient(to bottom right,#e4e6ff,#fff 40%,#e4ebff)",
        } as React.CSSProperties
      }
      {...baseOptions}
    >
      {children}
    </HomeLayout>
  )
}

export function ClientLayout({
  children,
  initialTheme,
}: {
  children: ReactNode
  initialTheme: "light" | "dark"
}) {
  return (
    <ThemeContext.Provider value={initialTheme}>
      <ThemeLayout>{children}</ThemeLayout>
    </ThemeContext.Provider>
  )
}

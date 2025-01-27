import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  const newInputs = inputs.map(i => {
    if (typeof i !== "string") return i
    return i.includes("\n") ? i.replace(/\s+/g, " ").trim() : i
  })
  return twMerge(clsx(newInputs))
}

// clsx tailwind-merge

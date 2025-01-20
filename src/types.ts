export type SelectedRole = "user" | "admin"

export type RemoveDollarSignProps<T> = {
  [K in keyof T as K extends `$${string}` ? never : K]: T[K]
}

export type ReactState<T> = [T, React.Dispatch<React.SetStateAction<T>>]

export type NonUndefined<T> = T & ({} & null)

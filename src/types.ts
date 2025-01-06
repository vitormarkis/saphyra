export type SelectedRole = "user" | "admin"

export type RemoveUnderscoreProps<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K]
}

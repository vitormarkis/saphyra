export type SelectedRole = "user" | "admin"

export type RemoveDollarSignProps<T> = {
  [K in keyof T as K extends `$${string}` ? never : K]: T[K]
}

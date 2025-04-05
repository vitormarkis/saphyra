export type SelectedRole = "user" | "admin"

export type RemoveDollarSignProps<T> = {
  [K in keyof T as K extends `$${string}` ? never : K]: T[K]
}

export type ReactState<T> = [T, React.Dispatch<React.SetStateAction<T>>]

export type NonUndefined<T> = T & ({} & null)

export type RequireKeys<T extends object, K extends keyof T> = Required<
  Pick<T, K>
> &
  Omit<T, K> extends infer O
  ? { [P in keyof O]: O[P] }
  : never

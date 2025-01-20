import { queryCache, queryClient } from "~/query-client"
import { hashKey } from "@tanstack/react-query"

type QueryOptions<TData = any, TMeta = any> = {
  queryKey: any
  queryFn?: (...args: any[]) => Promise<TData> | TData
  meta?: TMeta
}

type Callback<TData = any, TMeta = any> = (data: TData, metadata: TMeta) => void

export function notifyOnChange<TData, TMeta>(
  queryOptions: QueryOptions<TData, TMeta>,
  callback: Callback<TData, TMeta>,
  options: { immediate?: boolean } = {
    immediate: true,
  }
) {
  if (options?.immediate) {
    const data = queryClient.getQueryData<TData>(queryOptions.queryKey)
    if (data) callback(data, queryOptions.meta ?? ({} as TMeta))
  }

  return queryCache.subscribe(event => {
    const queryHash = hashKey(queryOptions.queryKey)
    if (queryHash !== event.query.queryHash) return
    if (event.type !== "updated") return
    if (event.action.type !== "success") return
    callback(event.action.data, queryOptions.meta ?? ({} as TMeta))
  })
}

export function notifyOnChangeList<TData, TMeta>(
  queryOptionsList: QueryOptions<TData, TMeta>[],
  callback: Callback<TData, TMeta>,
  options?: { immediate?: boolean }
) {
  const unsubList = queryOptionsList.map(queryOption => {
    return notifyOnChange(queryOption, callback, options)
  })

  return () => unsubList.forEach(unsub => unsub())
}

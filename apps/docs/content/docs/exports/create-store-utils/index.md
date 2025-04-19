---
title: createStoreUtils
description: A function paired with your store definition that makes it easy to integrate with React. It provides several hooks that extract information from the store and translate it in a way React can understand.
index: true
---

### Quick overview:
A quick overview of the hooks and utilities provided by `createStoreUtils`:

| Hook/Helper          | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `useStore`           | Pass a selector to get a slice of the store state                                    |
| `useOptimisticStore` | Pass a selector to get a slice of the optimistic state                               |
| `Provider`           | A `Context.Provider` to provide the store state to children                          |
| `useUseState`        | Access the `[store, setStore]` tuple provided by the context                         |
| `useErrorHandler`    | Pass an error handler that runs whenever an error is caught                           |
| `useTransition`      | Subscribe to an ongoing transition and derive loading states from it                 |
| `useLazyValue`       | Pass a selector, if the returned value is `undefined`, run a promise to populate the store and re-run the selector again |


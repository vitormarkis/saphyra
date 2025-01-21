### Known limitations

- Transition keys must be string serializable
- Can't dispatch actions in reducers with a different transition attached because there is a few things I would have to consider:
  - Nested transactions: what happens if you dispatch e non transactional transition that dispatches a transactional transition that fails? Should everything be rolled back?
  - Didn't figure out how to handle the transitions subscribers for this case yet, I need a good API.


- Why not not use await instead of builder pattern in the async module?
  - Because there is no way to ensure that actor is referencing the latest state after an await. There is why you need to nest async.promises, this way you always have a new actor that references the latest state. (It might be skill issue, let me know if you have any ideas)
### Known limitations

- Can't dispatch actions in reducers with a different transition attached because there is a few things I would have to consider:
  - Nested transactions: what happens if you dispatch e non transactional transition that dispatches a transactional transition that fails? Should everything be rolled back?
  - Didn't figure out how to handle the transitions subscribers for this case yet, I need a good API.

export const mockActor = () => ({
  set() {
    debugger
  },
  dispatch() {
    debugger
  },
  async: {
    promise() {
      return {
        onSuccess() {
          debugger
        },
      }
    },
    timer() {
      debugger
    },
  },
})

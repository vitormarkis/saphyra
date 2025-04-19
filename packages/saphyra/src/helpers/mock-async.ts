export const mockAsync = () => ({
  promise() {
    return {
      onSuccess() {
        // debugger
      },
    }
  },
  timer() {
    // debugger
  },
})

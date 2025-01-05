export function sleep(ms: number, ctx?: string) {
  return new Promise(res => {
    // console.log("[SLEEPING]", ctx)
    setTimeout(() => {
      res(true)
      // console.log("[WAKE]", ctx)
    }, ms)
  })
}

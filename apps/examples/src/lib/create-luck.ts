export function createLuck(odds: number[]) {
  const local = {
    odds: odds,
  }

  const shiftLuck = () => {
    const [currentLuck, ...restOdds] = local.odds
    local.odds = [...restOdds, currentLuck]
  }

  return {
    getLuck() {
      const val = !Boolean(local.odds[0])
      shiftLuck()
      return val
    },
    setOdds(odds: number[]) {
      local.odds = odds
    },
  }
}

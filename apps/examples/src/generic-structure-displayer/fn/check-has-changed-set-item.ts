export function checkHasChangedSetItem(
  allNodes: Set<string>,
  prevAllNodes: Set<string>
) {
  const hasChangedItem = allNodes.size !== prevAllNodes.size
  if (!hasChangedItem) return false
  for (const item of allNodes) {
    if (!prevAllNodes.has(item)) return true
  }
  for (const item of prevAllNodes) {
    if (!allNodes.has(item)) return true
  }
  return false
}

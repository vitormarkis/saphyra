const PREFIX = "saphyra-wf"

export const styles = {
  container: `${PREFIX}-container`,
  controllerWrapper: `${PREFIX}-controller-wrapper`,
  searchWrapper: `${PREFIX}-search-wrapper`,
  input: `${PREFIX}-input`,
  inputTabular: `${PREFIX}-input-tabular`,
  controlsWrapper: `${PREFIX}-controls-wrapper`,
  button: `${PREFIX}-button`,
  contentWrapper: `${PREFIX}-content-wrapper`,
  grid: `${PREFIX}-grid`,
  gridRow: `${PREFIX}-grid-row`,
  gridContents: `${PREFIX}-grid-contents`,
  namesColumn: `${PREFIX}-names-column`,
  barsColumn: `${PREFIX}-bars-column`,
  transitionName: `${PREFIX}-transition-name`,
  sorterHeader: `${PREFIX}-sorter-header`,
  sorterSpacer: `${PREFIX}-sorter-spacer`,
  sorterLabel: `${PREFIX}-sorter-label`,
  sorterIconWrapper: `${PREFIX}-sorter-icon-wrapper`,
  chevronWrapper: `${PREFIX}-chevron-wrapper`,
  chevronIcon: `${PREFIX}-chevron-icon`,
  chevronAscending: `${PREFIX}-chevron-ascending`,
  chevronDescending: `${PREFIX}-chevron-descending`,
  chevronDefault: `${PREFIX}-chevron-default`,
  barWrapper: `${PREFIX}-bar-wrapper`,
  barContainer: `${PREFIX}-bar-container`,
  bar: `${PREFIX}-bar`,
  barRunning: `${PREFIX}-bar-running`,
  barSuccess: `${PREFIX}-bar-success`,
  barFail: `${PREFIX}-bar-fail`,
  barCancelled: `${PREFIX}-bar-cancelled`,
  barHoveringRunning: `${PREFIX}-bar-hovering-running`,
  barHoveringSuccess: `${PREFIX}-bar-hovering-success`,
  barHoveringFail: `${PREFIX}-bar-hovering-fail`,
  barHoveringCancelled: `${PREFIX}-bar-hovering-cancelled`,
  barMuted: `${PREFIX}-bar-muted`,
  line: `${PREFIX}-line`,
  lineText: `${PREFIX}-line-text`,
  lineTextLeft: `${PREFIX}-line-text-left`,
  lineTextOverlay: `${PREFIX}-line-text-overlay`,
  tooltipPortal: `${PREFIX}-tooltip-portal`,
  tooltip: `${PREFIX}-tooltip`,
  tooltipContent: `${PREFIX}-tooltip-content`,
  tooltipLabel: `${PREFIX}-tooltip-label`,
  tooltipSpacer: `${PREFIX}-tooltip-spacer`,
  tooltipSmallSpacer: `${PREFIX}-tooltip-small-spacer`,
  tooltipStatusRow: `${PREFIX}-tooltip-status-row`,
  tooltipTransitionRow: `${PREFIX}-tooltip-transition-row`,
  tooltipTransitionList: `${PREFIX}-tooltip-transition-list`,
  tooltipTransitionPart: `${PREFIX}-tooltip-transition-part`,
  tooltipDivider: `${PREFIX}-tooltip-divider`,
  tooltipErrorSection: `${PREFIX}-tooltip-error-section`,
  tooltipErrorLabel: `${PREFIX}-tooltip-error-label`,
  tooltipError: `${PREFIX}-tooltip-error`,
  durationBadge: `${PREFIX}-duration-badge`,
  durationLabel: `${PREFIX}-duration-label`,
  durationValue: `${PREFIX}-duration-value`,
  statusBadge: `${PREFIX}-status-badge`,
  statusBadgeSuccess: `${PREFIX}-status-badge-success`,
  statusBadgeFail: `${PREFIX}-status-badge-fail`,
  statusBadgeCancelled: `${PREFIX}-status-badge-cancelled`,
  statusBadgeRunning: `${PREFIX}-status-badge-running`,
} as const

const CSS = `
.${styles.container} {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: 8px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #e5e7eb;
}

.${styles.controllerWrapper} {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.${styles.searchWrapper} {
  display: flex;
  gap: 8px;
  flex: 1;
  padding-left: 4px;
  align-items: center;
}

.${styles.input} {
  width: 100%;
  padding: 6px 10px;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  color: #e5e7eb;
  font-size: 14px;
}

.${styles.input}:focus {
  outline: none;
  border-color: #3b82f6;
}

.${styles.input}::placeholder {
  color: #6b7280;
}

.${styles.inputTabular} {
  padding: 6px 10px;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 4px;
  color: #e5e7eb;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  field-sizing: content;
}

.${styles.inputTabular}:focus {
  outline: none;
  border-color: #3b82f6;
}

.${styles.controlsWrapper} {
  display: flex;
  gap: 8px;
  align-items: center;
}

.${styles.button} {
  height: 32px;
  padding: 0 12px;
  background: #3b82f6;
  border: 1px solid #2563eb;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.${styles.button}:hover {
  background: #2563eb;
}

.${styles.contentWrapper} {
  border: 1px solid rgba(55, 65, 81, 0.7);
  padding: 2px;
  background: #111827;
  overflow-y: auto;
  overflow-x: hidden;
  height: 0;
  flex-grow: 1;
}

.${styles.grid} {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px;
}

.${styles.gridRow} {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: span 2;
  grid-row: span 1;
  gap: 2px;
}

.${styles.gridContents} {
  display: contents;
}

.${styles.namesColumn} {
  display: grid;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
  grid-row-start: 2;
}

.${styles.barsColumn} {
  display: grid;
  position: relative;
  grid-template-columns: subgrid;
  grid-template-rows: subgrid;
  grid-row-start: 2;
  border: 1px solid rgba(55, 65, 81, 0.7);
  background: #000;
}

.${styles.transitionName} {
  cursor: pointer;
  padding: 4px 12px;
  font-size: 14px;
  border: 1px solid rgba(55, 65, 81, 0.7);
  background: #000;
  color: #9ca3af;
}

.${styles.sorterHeader} {
  display: flex;
  justify-content: center;
  position: relative;
  margin-bottom: 16px;
  padding: 4px;
  border: 1px solid rgba(55, 65, 81, 0.7);
  text-align: center;
  background: #000;
  font-weight: 600;
  user-select: none;
  cursor: pointer;
}

.${styles.sorterSpacer} {
  min-width: 0;
  flex-shrink: 999;
  max-width: 30px;
  width: 100%;
}

.${styles.sorterLabel} {
  flex-shrink: 0;
}

.${styles.sorterIconWrapper} {
  min-width: 30px;
  flex-shrink: 0;
  max-width: 30px;
  width: 100%;
}

.${styles.chevronWrapper} {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.${styles.chevronIcon} {
  transition: all 0.2s ease;
}

.${styles.chevronAscending} {
  transform: rotate(180deg);
}

.${styles.chevronDescending} {
  transform: rotate(0deg);
}

.${styles.chevronDefault} {
  opacity: 0;
}

.${styles.barWrapper} {
  width: 100%;
  display: flex;
  padding: 2px;
  overflow: hidden;
}

.${styles.barContainer} {
  position: relative;
  width: 100%;
  height: 100%;
}

.${styles.bar} {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  position: absolute;
  cursor: pointer;
}

.${styles.barRunning} {
  background: #0284c7;
  color: #bae6fd;
}

.${styles.barSuccess} {
  background: #16a34a;
  color: #dcfce7;
}

.${styles.barFail} {
  background: #dc2626;
  color: #fee2e2;
}

.${styles.barCancelled} {
  background: #d97706;
  color: #fcd34d;
}

.${styles.barHoveringRunning} {
  box-shadow: 0 0 0 2px #7dd3fc;
}

.${styles.barHoveringSuccess} {
  box-shadow: 0 0 0 2px #4ade80;
}

.${styles.barHoveringFail} {
  box-shadow: 0 0 0 2px #f87171;
}

.${styles.barHoveringCancelled} {
  box-shadow: 0 0 0 2px #fbbf24;
}

.${styles.barMuted} {
  opacity: 0.6;
}

.${styles.line} {
  position: absolute;
  width: 1px;
  bottom: 0;
  top: 0;
  background: #111827;
}

.${styles.lineText} {
  position: absolute;
  bottom: 100%;
  font-size: 10px;
  color: #9ca3af;
}

.${styles.lineTextLeft} {
  transform: translateX(-100%);
}

.${styles.lineTextOverlay} {
  background: #111827;
  line-height: 10px;
  margin-bottom: 5px;
  z-index: 10;
  padding-left: 16px;
}

.${styles.tooltipPortal} {
  position: absolute;
  z-index: 10000;
  left: 0;
  top: 0;
  pointer-events: none;
}

.${styles.tooltip} {
  transform: translate(-50%, -100%);
  background: #111827;
  color: #fff;
  border-radius: 6px;
  border: 1px solid #374151;
}

.${styles.tooltipContent} {
  padding: 8px;
}

.${styles.tooltipLabel} {
  padding-left: 4px;
  font-size: 18px;
  letter-spacing: 0.025em;
  font-weight: 600;
  margin: 0;
}

.${styles.tooltipSpacer} {
  padding: 6px 0;
}

.${styles.tooltipSmallSpacer} {
  padding: 2px 0;
}

.${styles.tooltipStatusRow} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.${styles.tooltipTransitionRow} {
  display: flex;
  align-items: center;
  gap: 4px;
}

.${styles.tooltipTransitionList} {
  display: flex;
  align-items: center;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.${styles.tooltipTransitionPart} {
  background: #4b5563;
  border: 1px solid #374151;
  color: #e5e7eb;
  padding: 0 4px;
}

.${styles.tooltipDivider} {
  border-bottom: 1px solid #374151;
  width: 100%;
}

.${styles.tooltipErrorSection} {
  padding: 0 8px 8px;
}

.${styles.tooltipErrorLabel} {
  font-size: 14px;
  line-height: 1;
  padding: 2px 0 8px;
  display: block;
}

.${styles.tooltipError} {
  padding: 8px;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  border: 1px solid;
  background: rgba(127, 29, 29, 0.5);
  border-color: #991b1b;
  color: #fca5a5;
  max-width: 256px;
}

.${styles.durationBadge} {
  border: 1px solid #374151;
  padding: 0 8px;
  font-size: 14px;
  line-height: 1;
  height: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.${styles.durationLabel} {
  font-size: 12px;
}

.${styles.durationValue} {
  font-weight: 600;
}

.${styles.statusBadge} {
  border: 1px solid;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1;
  height: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.${styles.statusBadgeSuccess} {
  background: #16a34a;
  color: #dcfce7;
  border-color: #22c55e;
}

.${styles.statusBadgeFail} {
  background: #dc2626;
  color: #fee2e2;
  border-color: #ef4444;
}

.${styles.statusBadgeCancelled} {
  background: #d97706;
  color: #fcd34d;
  border-color: #f59e0b;
}

.${styles.statusBadgeRunning} {
  background: #0284c7;
  color: #bae6fd;
  border-color: #38bdf8;
}
`

let injected = false

export function injectStyles() {
  if (injected) return
  if (typeof document === "undefined") return

  const styleId = "saphyra-waterfall-styles"
  if (document.getElementById(styleId)) {
    injected = true
    return
  }

  const styleEl = document.createElement("style")
  styleEl.id = styleId
  styleEl.textContent = CSS
  document.head.appendChild(styleEl)
  injected = true
}

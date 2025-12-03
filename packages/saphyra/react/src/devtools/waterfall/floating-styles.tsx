"use client"

const FLOATING_PREFIX = "saphyra-wf-floating"

export const floatingStyles = {
  button: `${FLOATING_PREFIX}-button`,
  panel: `${FLOATING_PREFIX}-panel`,
  panelGhost: `${FLOATING_PREFIX}-panel-ghost`,
  resizeHandle: `${FLOATING_PREFIX}-resize-handle`,
  resizeHandleVisible: `${FLOATING_PREFIX}-resize-handle-visible`,
  header: `${FLOATING_PREFIX}-header`,
  headerButtons: `${FLOATING_PREFIX}-header-buttons`,
  title: `${FLOATING_PREFIX}-title`,
  titleBadge: `${FLOATING_PREFIX}-title-badge`,
  ghostButton: `${FLOATING_PREFIX}-ghost-button`,
  ghostButtonActive: `${FLOATING_PREFIX}-ghost-button-active`,
  closeButton: `${FLOATING_PREFIX}-close-button`,
  content: `${FLOATING_PREFIX}-content`,
  logo: `${FLOATING_PREFIX}-logo`,
} as const

const FLOATING_CSS = `
.${floatingStyles.button} {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9998;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #000000;
  border: 2px solid #000000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 0;
  overflow: hidden;
}

.${floatingStyles.button}:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.${floatingStyles.button}:active {
  transform: scale(0.95);
}

.${floatingStyles.logo} {
  --logo-margin: 0px;
  width: calc(100% - var(--logo-margin) * 2);
  height: calc(100% - var(--logo-margin) * 2);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  overflow: hidden;
  position: relative;
}

.${floatingStyles.logo}::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.1) 30%, transparent 60%);
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
}

.${floatingStyles.logo} img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.${floatingStyles.panel} {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #1f2937;
  border-top: 1px solid #374151;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
  transition: opacity 0.2s ease;
}

.${floatingStyles.panelGhost} {
  opacity: 0.5;
  pointer-events: none;
}

.${floatingStyles.panelGhost} .${floatingStyles.header} {
  pointer-events: auto;
}

.${floatingStyles.resizeHandle} {
  position: absolute;
  top: -6px;
  left: 0;
  right: 0;
  height: 12px;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.${floatingStyles.resizeHandle}::before {
  content: '';
  width: 40px;
  height: 4px;
  background: #4b5563;
  border-radius: 2px;
}

.${floatingStyles.resizeHandle}:hover,
.${floatingStyles.resizeHandleVisible} {
  opacity: 1;
}

.${floatingStyles.header} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #374151;
  background: #111827;
  flex-shrink: 0;
}

.${floatingStyles.title} {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #e5e7eb;
  margin: 0;
}

.${floatingStyles.titleBadge} {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 4px 12px;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

.${floatingStyles.headerButtons} {
  display: flex;
  align-items: center;
  gap: 8px;
}

.${floatingStyles.ghostButton} {
  height: 28px;
  padding: 0 12px;
  border-radius: 4px;
  background: #374151;
  border: 1px solid #4b5563;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;
}

.${floatingStyles.ghostButton}:hover {
  background: #4b5563;
}

.${floatingStyles.ghostButtonActive} {
  background: #3b82f6;
  border-color: #2563eb;
  color: #fff;
}

.${floatingStyles.ghostButtonActive}:hover {
  background: #2563eb;
}

.${floatingStyles.closeButton} {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid #374151;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  transition: background 0.2s ease, color 0.2s ease;
}

.${floatingStyles.closeButton}:hover {
  background: #374151;
  color: #e5e7eb;
}

.${floatingStyles.content} {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
`

let floatingInjected = false

export function injectFloatingStyles() {
  if (floatingInjected) return
  if (typeof document === "undefined") return

  const styleId = "saphyra-waterfall-floating-styles"
  if (document.getElementById(styleId)) {
    floatingInjected = true
    return
  }

  const styleEl = document.createElement("style")
  styleEl.id = styleId
  styleEl.textContent = FLOATING_CSS
  document.head.appendChild(styleEl)
  floatingInjected = true
}

export function DefaultLogo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

import { EventEmitter } from "./create-store/event-emitter"

type Events = {
  navigated_through_navlink: [url: string]
}

export const globalEvents = new EventEmitter<Events>()

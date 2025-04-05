import { EventEmitter } from "saphyra"

type Events = {
  navigated_through_navlink: [url: string]
}

export const globalEvents = new EventEmitter<Events>()

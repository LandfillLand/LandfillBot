declare module 'event-source-polyfill' {
  export class EventSourcePolyfill extends EventSource {
    constructor(url: string, eventSourceInitDict?: any)
  }
}

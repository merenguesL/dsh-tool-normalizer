export interface Config {
  autoWrapRunCode?: boolean
  autoBridgeDirectTools?: boolean
  autoObserveFiles?: boolean
  autoClampRanges?: boolean
  injectPrompt?: boolean
}

export declare const name: string
export declare const inject: {
  required: string[]
  optional: string[]
}
export declare function apply(ctx: any, config?: Config): void
declare const _default: {
  name: string
  inject: {
    required: string[]
    optional: string[]
  }
  apply: typeof apply
}
export default _default

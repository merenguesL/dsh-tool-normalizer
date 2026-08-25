import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

export declare const inject: string[]
export declare function apply(ctx: ClientContext): void
declare const _default: {
  name: string
  inject: string[]
  apply: typeof apply
}
export default _default

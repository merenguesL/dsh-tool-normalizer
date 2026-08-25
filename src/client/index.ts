/**
 * Client entry point for tool-normalizer statistics UI.
 * Registers the Tool Normalizer section in the Settings panel.
 *
 * @module dsh-tool-normalizer/client
 */

import { NormalizerSection, type NormalizerSectionInjected } from './NormalizerSection.tsx'
import { NormalizerStore } from './store.ts'
import { zh, en, type NormalizerKey } from './locales.ts'

export type { NormalizerSectionInjected, NormalizerSectionProps } from './NormalizerSection.tsx'
export type { NormalizerKey } from './locales.ts'
export type { NormalizerState, NormalizerStore } from './store.ts'

const NS = 'settings.tool-normalizer'

export const inject = ['slots', 'locale']

/**
 * Register the Tool Normalizer statistics section in the Settings navigation.
 *
 * @param ctx - Client root context.
 */
export function apply(ctx: any): void {
  // Register localization dictionaries
  ctx.effect?.(() => ctx.locale?.register(NS, { zh, en }), 'tool-normalizer: copy dictionaries')

  const controller = new NormalizerStore()
  const t = (ctx.locale?.bind?.(NS) ?? ((k: NormalizerKey) => zh[k] || k)) as NormalizerSectionInjected['t']

  const injected = (): NormalizerSectionInjected => ({
    controller,
    t,
  })

  ctx.slots?.inject?.('settings.section', () => ctx.slots?.register?.({
    name: 'settings.section',
    id: 'tool-normalizer',
    order: 25,
    label: () => t('nav'),
    inject: injected,
  }, NormalizerSection))
}

export default { name: 'tool-normalizer-client', inject, apply }

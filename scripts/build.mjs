import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const packageRoot = resolve(import.meta.dirname, '..')
const packageName = 'dsh-tool-normalizer'
const packageVersion = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf-8')).version

let build
try {
  const esbuild = await import('esbuild')
  build = esbuild.build
} catch {
  const require = createRequire(import.meta.url)
  const fallbackPath = resolve(import.meta.dirname, '../../dsh-usage-atlas/node_modules/esbuild/lib/main.js')
  const esbuild = require(fallbackPath)
  build = esbuild.build
}

await mkdir(resolve(packageRoot, 'lib/types/client'), { recursive: true })
await mkdir(resolve(packageRoot, 'lib/normalizers'), { recursive: true })

// 1. Bundle Host Plugin (ESM)
await build({
  entryPoints: {
    index: resolve(packageRoot, 'src/index.ts'),
  },
  outdir: resolve(packageRoot, 'lib'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  packages: 'external',
  sourcemap: false,
})

// 2. Simple CSS Module processor for Browser Client
async function inlineCssModulePlugin() {
  return {
    name: 'inline-css-modules',
    setup(buildApi) {
      buildApi.onLoad({ filter: /\.module\.css$/ }, async (args) => {
        const cssContent = await readFile(args.path, 'utf-8')
        // Match only class selectors: .className (not decimals like 0.04 or 1.5rem)
        const classNames = {}
        const matches = cssContent.match(/(?<=(?:^|[^\w.-]))\.([a-zA-Z][a-zA-Z0-9_-]*)/g) || []
        for (const m of matches) {
          const name = m.slice(1)
          if (!classNames[name]) {
            classNames[name] = `dsh_tn_${name}`
          }
        }
        
        // Scope CSS
        let scopedCss = cssContent
        for (const [k, v] of Object.entries(classNames)) {
          const regex = new RegExp(`(?<=(?:^|[^\\w.-]))\\.${k}(?=[^\\w.-]|$)`, 'g')
          scopedCss = scopedCss.replace(regex, `.${v}`)
        }

        const js = `
const css = ${JSON.stringify(scopedCss)};
if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin="${packageName}"]')) {
  const tag = document.createElement('style');
  tag.dataset.plugin = "${packageName}";
  tag.textContent = css;
  document.head.appendChild(tag);
}
export default ${JSON.stringify(classNames)};
`
        return { contents: js, loader: 'js' }
      })
    }
  }
}

// 3. Bundle Client Plugin (CJS for DSH Browser ModuleLoader)
await build({
  entryPoints: [resolve(packageRoot, 'src/client/index.ts')],
  outfile: resolve(packageRoot, 'lib/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  packages: 'external',
  sourcemap: false,
  define: {
    __DSH_TOOL_NORMALIZER_VERSION__: JSON.stringify(packageVersion),
  },
  plugins: [await inlineCssModulePlugin()],
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

// 4. Emit type declarations
const indexDts = `export interface Config {
  autoWrapRunCode?: boolean
  autoBridgeDirectTools?: boolean
  autoObserveFiles?: boolean
  autoClampRanges?: boolean
  injectPrompt?: boolean
  estimatedRetryTokenCost?: number
  persistPassthrough?: boolean
}

export declare const name: string
export declare const inject: string[]
export declare function apply(ctx: any, config?: Config): void
declare const _default: {
  name: string
  inject: string[]
  apply: typeof apply
}
export default _default
`
await writeFile(resolve(packageRoot, 'lib/types/index.d.ts'), indexDts, 'utf-8')

const clientDts = `export declare const inject: string[]
export declare function apply(ctx: any): void
declare const _default: {
  name: string
  inject: string[]
  apply: typeof apply
}
export default _default
`
await writeFile(resolve(packageRoot, 'lib/types/client/index.d.ts'), clientDts, 'utf-8')

console.log('Build completed successfully: lib/index.js and lib/client.js generated.')

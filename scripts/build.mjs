import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const packageRoot = resolve(import.meta.dirname, '..')
const packageName = 'dsh-tool-normalizer'

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
        // Simple CSS module class mapper
        const classNames = {}
        const matches = cssContent.match(/\.([a-zA-Z0-9_-]+)/g) || []
        for (const m of matches) {
          const name = m.slice(1)
          classNames[name] = `dsh_tn_${name}`
        }
        
        // Scope CSS
        let scopedCss = cssContent
        for (const [k, v] of Object.entries(classNames)) {
          scopedCss = scopedCss.replaceAll(`.${k}`, `.${v}`)
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
  plugins: [await inlineCssModulePlugin()],
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => {`,
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

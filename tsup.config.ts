import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/collect.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react'],
})

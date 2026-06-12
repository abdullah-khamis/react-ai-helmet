import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/collect.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react'],
})

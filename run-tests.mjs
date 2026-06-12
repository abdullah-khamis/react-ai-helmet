// Native, dependency-free test runner. Runs each *.test.mjs file in its own
// process, streams its output, and aggregates pass/fail across all of them.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const files = readdirSync(new URL('.', import.meta.url))
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()

let failed = 0
for (const file of files) {
  console.log(`\n\x1b[1m▶ ${file}\x1b[0m`)
  const res = spawnSync(process.execPath, [file], { stdio: 'inherit' })
  if (res.status !== 0) failed++
}

console.log(
  `\n\x1b[1m${files.length - failed}/${files.length} test files passed\x1b[0m`
)
process.exit(failed ? 1 : 0)

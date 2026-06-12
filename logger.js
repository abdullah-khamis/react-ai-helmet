// Minimal ANSI console logger for the CLI. Zero dependencies.

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

export const logger = {
  blank() {
    console.log('')
  },
  section(title) {
    console.log(`${C.bold}${C.cyan}${title}${C.reset}`)
  },
  info(message) {
    console.log(`  ${message}`)
  },
  success(message) {
    console.log(`  ${C.green}✓${C.reset} ${message}`)
  },
  warn(message) {
    console.warn(`  ${C.yellow}⚠${C.reset} ${message}`)
  },
  error(message) {
    console.error(`  ${C.red}✗${C.reset} ${message}`)
  },
  dim(message) {
    console.log(`  ${C.dim}${message}${C.reset}`)
  },
}

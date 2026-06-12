#!/usr/bin/env node

/**
 * react-ai-helmet CLI
 * Usage:
 *   npx react-ai-helmet generate           — scan project, output llms.txt + robots.txt
 *   npx react-ai-helmet generate --dry-run — preview output without writing files
 *   npx react-ai-helmet validate           — check existing llms.txt for issues
 *   npx react-ai-helmet init               — scaffold a starter config file
 */

import { generate } from './commands/generate.js'
import { validate } from './commands/validate.js'
import { init }     from './commands/init.js'
import { logger }   from './logger.js'

const args    = process.argv.slice(2)
const command = args[0]
const flags   = parseFlags(args.slice(1))

function parseFlags(rawArgs) {
  const flags = {}
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = rawArgs[i + 1]
      // boolean flag if no next value, or next is also a flag
      if (!next || next.startsWith('--')) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    }
  }
  return flags
}

function printHelp() {
  console.log(`
  \x1b[1mreact-ai-helmet\x1b[0m — AI readability toolkit for React

  \x1b[2mUsage:\x1b[0m
    npx react-ai-helmet <command> [options]

  \x1b[2mCommands:\x1b[0m
    generate     Scan your project and output llms.txt, llms-full.txt, robots.txt
    validate     Check your existing llms.txt for issues
    init         Create a starter react-ai-helmet.config.js

  \x1b[2mOptions for generate:\x1b[0m
    --root       Project root directory (default: current directory)
    --out        Output directory (default: ./public)
    --config     Path to config file (default: ./react-ai-helmet.config.js)
    --dry-run    Preview output without writing files
    --verbose    Show detailed scan logs

  \x1b[2mExamples:\x1b[0m
    npx react-ai-helmet init
    npx react-ai-helmet generate
    npx react-ai-helmet generate --dry-run
    npx react-ai-helmet generate --root ./my-app --out ./my-app/public
    npx react-ai-helmet validate
`)
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp()
    process.exit(0)
  }

  try {
    switch (command) {
      case 'generate':
        await generate(flags)
        break
      case 'validate':
        await validate(flags)
        break
      case 'init':
        await init(flags)
        break
      default:
        logger.error(`Unknown command: "${command}"`)
        printHelp()
        process.exit(1)
    }
  } catch (err) {
    logger.error(err.message)
    if (flags.verbose) console.error(err)
    process.exit(1)
  }
}

main()

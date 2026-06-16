/**
 * Compile Electron TypeScript files to JS before packaging.
 * Run: node electron/build.js
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.join(__dirname, '..')
const outDir = path.join(root, 'electron')

console.log('Compiling Electron TypeScript...')
execSync(
  `npx tsc --project ${path.join(__dirname, 'tsconfig.json')} --outDir ${outDir}`,
  { stdio: 'inherit', cwd: root }
)
console.log('Done: electron/main.js, electron/preload.js created')

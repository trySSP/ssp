---
description: Always use Bun as the package manager and runtime
---

# Bun Usage Rules

Always use **Bun** instead of npm, yarn, or pnpm for all JavaScript/TypeScript operations.

## Package Management

- **Install dependencies**: Use `bun install` instead of `npm install`
- **Add packages**: Use `bun add <package>` instead of `npm install <package>`
- **Add dev dependencies**: Use `bun add -d <package>` instead of `npm install -D <package>`
- **Remove packages**: Use `bun remove <package>` instead of `npm uninstall <package>`

## Running Scripts

- **Run scripts**: Use `bun run <script>` instead of `npm run <script>`
- **Dev server**: Use `bun run dev` instead of `npm run dev`
- **Build**: Use `bun run build` instead of `npm run build`
- **Tests**: Use `bun test` instead of `npm test`

## Executing Packages

- **Run packages**: Use `bunx <package>` instead of `npx <package>`
- **Create apps**: Use `bunx create-<framework>` instead of `npx create-<framework>`

## TypeScript/JavaScript Execution

- **Run TS/JS files directly**: Use `bun <file.ts>` or `bun <file.js>`
- Bun has native TypeScript support—no compilation step needed

## Lock Files

- Use `bun.lockb` (Bun's binary lockfile)
- Do not generate or use `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`

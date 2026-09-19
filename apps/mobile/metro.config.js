const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Enable package exports resolution for Tailwind v4
config.resolver.unstable_enablePackageExports = true;

// Monorepo support: watch the entire monorepo root so Metro can resolve
// pnpm symlinks that point into node_modules/.pnpm/...
config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 支持 tsconfig.json 中的 @/ 路径别名（用于 require 静态资源等场景）
config.resolver.extraNodeModules = {
  "@": projectRoot,
};

module.exports = config;

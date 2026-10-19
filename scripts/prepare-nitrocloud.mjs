import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// 1. Sync apps/mcp/dist to root dist/
const mcpDist = path.join(root, 'apps', 'mcp', 'dist');
const rootDist = path.join(root, 'dist');

if (fs.existsSync(mcpDist)) {
  fs.mkdirSync(rootDist, { recursive: true });
  fs.cpSync(mcpDist, rootDist, { recursive: true });
  console.log('✓ Synced apps/mcp/dist to ./dist');
} else {
  console.warn('⚠️ apps/mcp/dist not found during prepare-nitrocloud');
}

// 2. Sync apps/mcp/src/widgets to root src/widgets
const mcpWidgets = path.join(root, 'apps', 'mcp', 'src', 'widgets');
const rootWidgets = path.join(root, 'src', 'widgets');

if (fs.existsSync(mcpWidgets)) {
  fs.mkdirSync(rootWidgets, { recursive: true });
  fs.cpSync(mcpWidgets, rootWidgets, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('.next'),
  });
  console.log('✓ Synced apps/mcp/src/widgets to ./src/widgets');
}

// 3. Sync apps/mcp/package.json nitrostack config if present
console.log('✓ Root NitroStack environment ready for start');

import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom compile-time HTML include plugin to support separate files without breaking the app
function htmlIncludePlugin() {
  return {
    name: 'html-include',
    transformIndexHtml(html) {
      const includeRegex = /<!--\s*#include\s+"([^"]+)"\s*-->|<include\s+src="([^"]+)"\s*\/>/g;
      let matched = true;
      let processedHtml = html;
      
      while (matched) {
        matched = false;
        processedHtml = processedHtml.replace(includeRegex, (match, p1, p2) => {
          matched = true;
          const fileName = p1 || p2;
          const filePath = path.resolve(process.cwd(), fileName);
          if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
          } else {
            console.warn(`[html-include] File not found: ${filePath}`);
            return `<!-- Error: ${fileName} not found -->`;
          }
        });
      }
      return processedHtml;
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [htmlIncludePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

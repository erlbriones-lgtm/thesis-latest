import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function htmlIncludePlugin() {
  return {
    name: 'vite-plugin-html-include',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const includeRegex = /<!--\s*#include\s*["']([^"']+)["']\s*-->/g;
        let processedHtml = html;
        let hasMatches = true;
        let passes = 0;

        while (hasMatches && passes < 10) {
          hasMatches = false;
          passes++;
          processedHtml = processedHtml.replace(includeRegex, (match, filePath) => {
            hasMatches = true;
            const cleanPath = filePath.replace(/^\//, '');
            const resolvedPath = path.resolve(__dirname, cleanPath);
            if (fs.existsSync(resolvedPath)) {
              return fs.readFileSync(resolvedPath, 'utf-8');
            }
            console.warn(`[html-include] Component file not found: ${resolvedPath}`);
            return match;
          });
        }
        return processedHtml;
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/components/')) {
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    }
  };
}

export default defineConfig({
  plugins: [htmlIncludePlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});

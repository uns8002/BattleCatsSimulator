import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
function serveProjectImages(server) {
  server.middlewares.use(async (req, res, next) => {
    const pathname = (req.url ?? '').split('?')[0];
    if (!pathname.startsWith('/images/')) return next();
    // 公開画像のディレクトリ・ファイル名だけを許可。入力スクリーンショットは公開しない。
    if (
      !/^\/images\/(allies|abilities|effect_targets|effects|materials)\/[A-Za-z0-9_-]+\.png$/.test(
        pathname,
      )
    ) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      return res.end();
    }
    try {
      const bytes = await readFile(new URL('..' + pathname, import.meta.url));
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', bytes.length);
      res.setHeader('Cache-Control', 'no-cache');
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
}

export default defineConfig({
  publicDir: false,
  server: {
    proxy: { '/api': 'http://127.0.0.1:5001' },
  },
  plugins: [
    {
      name: 'project-images',
      configureServer: serveProjectImages,
      configurePreviewServer: serveProjectImages,
    },
  ],
});

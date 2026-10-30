import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

// Only explicitly published assets are served; PoC input screenshots stay private.
const imagePaths = JSON.parse(
  await readFile(new URL('./src/shared/images/imagePaths.json', import.meta.url), 'utf8'),
);
const imageFiles = new Map(
  Object.values(imagePaths).map((path) => [
    '/images/' + path,
    new URL('../images/' + path, import.meta.url),
  ]),
);

function serveProjectImages(server) {
  server.middlewares.use(async (req, res, next) => {
    const pathname = (req.url ?? '').split('?')[0];
    if (!pathname.startsWith('/images/')) return next();
    const file = imageFiles.get(pathname);
    if (!file) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      return res.end();
    }
    try {
      const bytes = await readFile(file);
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
  plugins: [
    {
      name: 'project-images',
      configureServer: serveProjectImages,
      configurePreviewServer: serveProjectImages,
    },
  ],
});

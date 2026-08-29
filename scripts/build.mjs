import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/client/src', { recursive: true });
await cp('index.html', 'dist/client/index.html');
await cp('start-v30.html', 'dist/client/start-v30.html');
await cp('.nojekyll', 'dist/client/.nojekyll');
await cp('src/game-v35.js', 'dist/client/src/game-v35.js');
await cp('src/game-engine.js', 'dist/client/src/game-engine.js');
await cp('src/game-storage.js', 'dist/client/src/game-storage.js');
await cp('src/slice-data.js', 'dist/client/src/slice-data.js');
await cp('src/style-v35.css', 'dist/client/src/style-v35.css');
await cp('public/characters-v2.png', 'dist/client/characters-v2.png');
await cp('public/locations.png', 'dist/client/locations.png');
await cp('public/items-v2.png', 'dist/client/items-v2.png');
await cp('public/shop-items-v1.png', 'dist/client/shop-items-v1.png');

// Service worker: deixa o app abrir offline e instalável no celular.
// Estratégia: responde do cache e atualiza em segundo plano.
const CACHE = 'politigotchi-v1';
const ARQUIVOS = [
  './', 'index.html', 'style.css', 'sprites.js', 'game.js', 'manifest.webmanifest',
  'assets/ovo-lula.webp', 'assets/ovo-bolso.webp', 'assets/icon-192.png', 'assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const chave = req.mode === 'navigate' ? 'index.html' : req;
      const cache = await c.match(chave, { ignoreSearch: true });
      const rede = fetch(req).then((r) => { if (r.ok) c.put(chave, r.clone()); return r; }).catch(() => cache);
      return cache || rede;
    })
  );
});

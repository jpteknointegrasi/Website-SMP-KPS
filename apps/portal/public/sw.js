/* Satu Sekolah App service worker. Caches ONLY static, non-personal files (build assets, icons).
   Pages, API responses and files are always fetched from the network and never stored. */
const CACHE = 'sekolahku-static-v1'
const STATIC = /^\/portal\/(_next\/static\/|icon\.svg$|manifest\.webmanifest$)/

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !STATIC.test(url.pathname)) return // network only
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request)
      if (hit) return hit
      const res = await fetch(e.request)
      if (res.ok) c.put(e.request, res.clone())
      return res
    }),
  )
})

/* On sign-out the page posts {type:'clear'}: drop every cache (shared-device safety). */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'clear') e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
})

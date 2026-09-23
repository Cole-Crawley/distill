/// <reference lib="webworker" />
// `__WB_MANIFEST` is rewritten into the real precache list at build time by the Vite PWA plugin, so it only needs a type here.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Downloads and caches every built asset the first time the app is opened, so it works offline on the next visit.
precacheAndRoute(self.__WB_MANIFEST)

// Clears out old cached files left over from a previous deploy.
cleanupOutdatedCaches()

self.addEventListener('install', () => {
  self.skipWaiting() // activate a newly-installed SW immediately, don't wait for all tabs to close
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim()) // ...and take control of any already-open tabs right away too
})

// Every app route is client-rendered from index.html, so offline navigation always falls back to that one cached shell file, not the requested path.
const appShellFallback = createHandlerBoundToURL('/index.html')

// Last resort if there's no cached app shell either (e.g. the very first offline visit).
const offlineFallback = createHandlerBoundToURL('/offline.html')

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return

  const url = new URL(event.request.url)
  const handlerArgs = { event, request: event.request, url }

  event.respondWith(
    // Try the network first so a new deploy is picked up promptly; fall back to the cached shell, then offline.html.
    fetch(event.request).catch(() =>
      appShellFallback(handlerArgs).catch(() => offlineFallback(handlerArgs))
    )
  )
})

// Everything else (JS/CSS/fonts/icons) is safe to serve straight from cache since Vite fingerprints filenames with a content hash.
registerRoute(
  ({ request }) => ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'distill-assets',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
)

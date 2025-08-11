// Service worker version
const CACHE_NAME = 'mondo-cucina-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/offline.html',
    '/static/css/main.css',
    '/static/js/main.js',
    '/icons/MONDO CUCINA.png',
    '/manifest.json'
];

// Install event - caching core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Handle API requests differently
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return a generic offline response for API calls
                    return new Response(JSON.stringify({
                        error: "You're offline. Data will sync when connection is restored."
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Cache new responses
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(error => {
                        // If offline and not cached, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                    });
            })
    );
});

// Background sync for form submissions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-forms') {
        event.waitUntil(syncPendingForms());
    }
});

async function syncPendingForms() {
    // Get pending forms from IndexedDB
    const pendingForms = await getPendingFormsFromDB();

    for (const form of pendingForms) {
        try {
            // Attempt to submit form to server
            const response = await fetch('/api/submit-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (response.ok) {
                // Remove from local DB if successful
                await removeFormFromDB(form.id);
            }
        } catch (error) {
            console.error('Sync failed for form:', form.id, error);
        }
    }
}
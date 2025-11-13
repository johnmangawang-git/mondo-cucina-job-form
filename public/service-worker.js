// Service worker version
const CACHE_NAME = 'mondo-cucina-v1.3';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use - only cache local assets
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    // Local icons
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/favicon.ico'
];

// Install event - caching core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Only cache local assets during install
                return cache.addAll(PRECACHE_URLS);
            })
            .catch(error => {
                console.error('Failed to cache URLs during install:', error);
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
            .then(() => {
                // Claim clients to ensure the new service worker takes control immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // For navigation requests (page loads), serve cached content or offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Try to serve from cache first
                    return caches.match(event.request)
                        .then(response => {
                            return response || caches.match('/')
                                .then(indexResponse => {
                                    return indexResponse || caches.match(OFFLINE_URL);
                                });
                        });
                })
        );
        return;
    }

    // Handle API requests differently
    if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Return a generic offline response for API calls
                    return new Response(JSON.stringify({
                        error: "You're offline. Data will sync when connection is restored."
                    }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 200
                    });
                })
        );
        return;
    }

    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }

                // For requests to our own domain, try to cache them
                const url = new URL(event.request.url);
                if (url.origin === self.location.origin) {
                    // Otherwise fetch from network
                    return fetch(event.request)
                        .then(response => {
                            // Cache new responses that are valid and from our domain
                            if (response && response.status === 200 && response.type === 'basic') {
                                const responseToCache = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                            return response;
                        })
                        .catch(error => {
                            // For assets that fail to load, return a fallback if available
                            console.log('Fetch failed for:', event.request.url, error);
                            return new Response('', { status: 404 });
                        });
                } else {
                    // For external requests, just fetch them (don't cache)
                    return fetch(event.request)
                        .catch(error => {
                            console.log('External fetch failed for:', event.request.url, error);
                            return new Response('', { status: 404 });
                        });
                }
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

// Helper function to get pending forms from IndexedDB (stub implementation)
async function getPendingFormsFromDB() {
    // This would connect to IndexedDB to get pending forms
    return [];
}

// Helper function to remove form from IndexedDB (stub implementation)
async function removeFormFromDB(formId) {
    // This would remove a form from IndexedDB
}
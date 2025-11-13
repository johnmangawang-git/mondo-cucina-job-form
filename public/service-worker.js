// Service worker version
const CACHE_NAME = 'mondo-cucina-v1.1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use - expanded to include all necessary assets
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    // CSS files
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
    // JS files
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    // Icons
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
                return cache.addAll(PRECACHE_URLS)
                    .catch(error => {
                        console.error('Failed to cache some URLs:', error);
                        // Continue with the ones that succeeded
                        return Promise.resolve();
                    });
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

                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Cache new responses that are valid
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
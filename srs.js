const VERSION = "v1";

//offline resource list
const APP_STATIC__RESOURCES = [
    "index.html",
    "style.css",
    "app.js",
    "vacationtracker.json",
    "assets/icons/icon-512x512.png",
];

const CACHE_NAME = `vacation-tracker-${VERSION}`;

//handle install event and retrieve adn store the files listed for the cache

self.addEventListener("install", (event)=>{
    event.waitUntil(
        (async ()=>{
            const cache = await caches.open(CACHE_NAME);
            cache.addAll(APP_STATIC__RESOURCES);
        })
    );

});

/*activate event to delete old caches so we don't run out of space
delete all but current cache
set service worker as the controller for app*/

self.addEventListener("activate", (event)=>{
    event.waitUntil(
        (async ()=>{
            //get names of existing caches
            const names = await caches.keys();

            //iterate through list and find current cache
            await Promise.all(
                names.map((name) =>{
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );//promiseAll

            //enable service worker as controller
            await clients.claim();
        })
    );//waitUntil
});

/*use fetch to intercept server requests 
so we can serve up cached pages or respond with error 404*/
self.addEventListener("fetch", (event)=>{
    event.respondWith((async () => {
        //get resources from cache
        const cachedResponse = await cache.match(event.request);
        if(cachedResponse) {
            return cachedResponse;
        }
        //if not cached, access from network
        try {
            const networkResponse = await fetch(event.request);

            //cache possible response
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
        } catch(error) {
            console.error("Fetch failed... returning offline page", error);

            //if request is for page, return index.html as fallback
            if(event.request.mode === "navigate") {
                return cache.match("/index.html");
            }

            //else throw error, return offline asset
            throw error;
        }
    }));//respondWith
});//eventListener fetch


//send a message to the client every 10 seconds
function sendMessageToPWA(message) {
    self.clients.matchAll().then((clients) => {
        clients.forEach((client) =>{
            client.postMessage(message);
        });
    });//matchAll
};

setInterval(()=>{
    sendMessageToPWA({type: "update", data: "New data available"});
}, 10000);

//listen for messages from app
self.addEventListener("message", (event)=>{
    console.log("Service worker received a message", event.data);

    //option to respond back
    event.source.postMessage({
        type: "response",
        data: "Message received by service worker",
    })
});

//open+create the database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1); //(file to open, version)

request.onerror = function (event) {
    console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Database opened successfully in serviceWorker");
};
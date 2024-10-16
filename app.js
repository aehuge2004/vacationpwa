//form const ad form controls

const newVacationElement = document.getElementsByTagName("form")[0];
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const pastVacationCont = document.getElementById("past-vacations")

//form submissions
newVacationElement.addEventListener("submit", (event)=>{
    //prevent form from submitting on server
    event.preventDefault();

    //get the dates from the form
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    //check for date validitity
    if(checkDatesInvalid) {
        return;
    }

    //store vacation in visual dataset
    storeNewVacation(startDate, endDate);

    //refresh UI
    renderPastVacations();
    //form reset
    newVacationElement.reset();

    //we will use my DB in the future
});


function checkDatesInvalid(startDate, endDate) {
    if (!startDate || !endDate || startDate > endDate){
        newVacationElement.reset();
        return true; //inavalid results
        
    }else{
        return false; //valid results
    }
};

const STORAGE_KEY = "vaca_trakcer";

function storeNewVacation(startDate, endDate) {
    //get data from storage
    const vacations = getAllStoredVacations(); //array of strings from previously stofed
    //add new vacation at end of array
    vacations.push(startDate, endDate);

    //sort array from newest to oldest
    vacations.sort((a,b)=>{
        return new Date(b.startDate) - new Date(a.startDatee)
    });

    //store new array
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vacations));

};//StoreNewVacation

function getAllStoredVacations(){
    //get the string of vacation from localStorage
    const data = window.localStorage.getItem(STORAGE_KEY);

    //if vacations are empty, default empty array
    //otherwise return stored data as JSON string as parsed
    const vacations = data ? JSON.parse(data) : [];
    //does data exist? if it does, parse the data, else return empty array

    return vacations;
}; //getAllStoredVacations

//render list of vacations to the HTML with heading

function renderPastVacations() {
    //get parsed JSON string of vacations
    const vacations = getAllStoredVacations();

    //exit if there aren't any vacations
    if (vacations.length === 0) {
        return; 
    };

    //re-render past vacations because we can't guaruntee that the last added vacation is the newest
    pastVacationCont.innerHTML = "";

    // <h2>Past Vacations</h2>
    // <ul>
    //     <li>

    //     </li>
    // </ul>

    const pastVacationHeader = document.createElement("h2");
    pastVacationHeader.textContent = "Past Vacations";

    const pastVacationList = document.createElement("ul");
    
    //loop through vacations and render li
    vacations.forEach((vacation)=>{
        const vacationElement = document.createElement("li");
        vacationElement.textContent = `From ${formatDate(vacation.startDate)} to ${formatDate(vacation.endDate)}`;
        pastVacationList.appendChild(vacationElement);
    });

    //put them into container
    pastVacationCont.appendChild(pastVacationHeader);
    pastVacationCont.appendChild(pastVacationList);


};//renderPastVacations

function formatDate(dateString) {
    
    //create date OBJECT from String
    const date = new Date(dateString);
    
    //format as string
    return date.toLocaleDateString("en-US", {timeZone: "UTC"});
};//formatDate

//start app by rendering past vacations on load, if any
renderPastVacations();

//register service worker with app
if ("serviceWork" in navigator) {
    navigator.serviceWorker.register("srs.js").then((registration)=>{
        console.log("Service worker registered with scope.", registration.scope);
    }).catch((error)=>{
        console.log("Service worker registration failed.", error);
    });
};

//listen for messages from service worker
navigator.serviceWorker.addEventListener("message", (event)=>{
    console.log("Received message from service worker:", event.data);

    //handle different message types
    if (event.data.type === "update") {
        console.log("Update received: ", event.data.data);
    }
});

// //send a message to service worker
// function sendMessageToServiceWorker(message) {
//     if (navigator.serviceWorker.controller) {
//         navigator.serviceWorker.controller.postMessage(message);
//     };
// };


// document.getElementById("sendButton").addEventListener("click", ()=>{
//     sendMessageToServiceWorker({type: "action", data: "Button clicked"});
// });

//create a broadcast channel - name here needs to match sw name
const channel = new BroadcastChannel("pwa_channel");

//listen for messages
channel.onmessage = (event) => {
    console.log("received a message in pwa:", event.data);
    document.getElementById("messages").insertAdjacentHTML("beforeend", `<p>Received: ${event.data}</p>`);
    

};

//send message when button is clicked
document.getElementById("sendButton").addEventListener("click", ()=>{
    const message = "Hello from PWA";
    channel.postMessage(message);
    console.log("Send messages from PWA:", message);
})


channel.onmessage = (event) => {
    console.log("received a message in Service Worker:", event.data);
    
    //echo message back to pwa
    channel.postMessage("service wroker received message:" + event.data);

};

//open+create the database
let db;
const dbName = "SyncDatabase";
const request = indexedDB.open(dbName, 1); //(file to open, version)

request.onerror = function (event) {
    console.error("Database error: " + event.target.error);
};

request.onsuccess = function (event) {
    db = event.target.result;
    console.log("Database opened successfully");
};

request.onupgradeneeded = function (event) {
    db = event.target.result;

    //create any new object stores for db
    //or delete any old object stores from previous versions
    const objectStore = db.createObjectStore("pendingData",
        {
            keyPath:"id",
            autoIncrement: true
        });

};

//add data to db, we need a transaction
function addDataToIndexedDB(data) {
    return new Promise((resolve, reject)=>{
        const transaction = db.transaction(["pendingData"], "readwrite");
        const objectStore = transaction.objectStore("pendingData");
        const request = objectStore.add({data: data});

        request.onsuccess = function (event) {
            resolve();
        };
        request.onerror = function (event) {
            reject("Error with storing data" + event.target.error);
        };
    });//promise
};

//handle form submission
document.getElementById("dataForm").addEventListener("submit", function(event){
    event.preventDefault();//don't send data to server because we want it to work offline

    //get data
    const data = document.getElementById("dataInput").value;

    //check for service worker and syncManager
    if ("serveWorker" in navigator && "SyncManager" in window) {
        //add data to db
        addDataToIndexedDB(data).then(()=> navigator.serviceWorker.ready).then((registration) =>{
            //register sync event for when device is online
            return registration.sync.register("send-data");
        }).then(()=>{
            //update UI for successful registration
            document.getElementById("status").textContent = "Sync registered. Data will be sent when online.";
        }).catch((error)=>{
            console.error("error: ", error);
        });
    } else {
        //background sync not supported
        //attempt to send immediately
        sendData(data).then((result)=>{
            //update UI
            document.getElementById("status").textContent = result;
        }).catch((error) => {
            document.getElementById("status").textContent = error.message;
        });
    }//else
});//eventListener

//simulate sending data
function sendData(data) {
    console.log("Attempting to send data:", data);

    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            if(Math.random() > 0.5) {
                resolve("data sent successfully");
            } else {
                reject(new Error("Failed to send data"));
            }
        }, 1000);
    });
}
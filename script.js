
// ==========================================
// GREENCARE - PARK MAINTENANCE TRACKER
// COMPLETE SCRIPT.JS
// ==========================================


// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyD9g3fxSL4-UAytQr8mvo6loEYkQkgzT04",
    authDomain: "green-care-13570.firebaseapp.com",
    projectId: "green-care-13570",
    storageBucket: "green-care-13570.firebasestorage.app",
    messagingSenderId: "225982031628",
    appId: "1:225982031628:web:e22506d91140db1d8c4b29",
    measurementId: "G-80NT5DTBXC"
};

// Enter the administrator Gmail registered in Firebase.
const ADMIN_ALLOWED_EMAIL = "vikas@gmail.com";

const STORAGE_KEY = "greencare_complaints";

let auth = null;
let isAdminLoggedIn = false;
let firebaseConfigured = false;

let complaints = [];

let parkMap = null;
let parkMarker = null;

let selectedPhoto = "";


// ==========================================
// 2. HTML ELEMENT REFERENCES
// ==========================================

const parkLocation = document.getElementById("parkLocation");
const parkLatitude = document.getElementById("parkLatitude");
const parkLongitude = document.getElementById("parkLongitude");
const mapMessage = document.getElementById("mapMessage");

const parkSearch = document.getElementById("parkSearch");
const searchParkButton = document.getElementById("searchParkButton");
const searchMessage = document.getElementById("searchMessage");

const issuePhoto = document.getElementById("issuePhoto");
const photoPreview = document.getElementById("photoPreview");

const complaintForm = document.getElementById("complaintForm");

const complaintTable = document.getElementById("complaintTable");
const publicComplaintTable = document.getElementById("publicComplaintTable");

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const photoModal = document.getElementById("photoModal");
const enlargedPhoto = document.getElementById("enlargedPhoto");
const closePhotoModal = document.getElementById("closePhotoModal");


// ==========================================
// 3. FIREBASE INITIALIZATION
// ==========================================

function initializeFirebase() {

    if (typeof firebase === "undefined") {
        console.error("Firebase scripts are missing from index.html.");
        return;
    }

    try {

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        auth = firebase.auth();
        firebaseConfigured = true;

        auth.onAuthStateChanged(async function (user) {

            const authorizedUser =
                user &&
                user.email &&
                user.email.toLowerCase() ===
                ADMIN_ALLOWED_EMAIL.toLowerCase();

            isAdminLoggedIn = Boolean(authorizedUser);

            if (user && !authorizedUser) {

                isAdminLoggedIn = false;

                try {
                    await auth.signOut();
                } catch (error) {
                    console.error("Sign-out error:", error);
                }

                updateAdminDisplay();
                return;
            }

            updateAdminDisplay();

            if (isAdminLoggedIn) {
                renderDashboard();
            }
        });

    } catch (error) {

        console.error("Firebase initialization error:", error);
        firebaseConfigured = false;
    }
}


// ==========================================
// 4. UPDATE ADMINISTRATOR DISPLAY
// ==========================================

function updateAdminDisplay() {

    const loginPanel =
        document.getElementById("adminLoginPanel");

    const adminContent =
        document.getElementById("adminContent");

    if (loginPanel) {
        loginPanel.style.display =
            isAdminLoggedIn ? "none" : "block";
    }

    if (adminContent) {
        adminContent.style.display =
            isAdminLoggedIn ? "block" : "none";
    }
}


// ==========================================
// 5. LOAD AND SAVE COMPLAINTS
// ==========================================

try {

    const savedComplaints =
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    complaints = Array.isArray(savedComplaints)
        ? savedComplaints
        : [];

} catch (error) {

    console.error("Complaint loading error:", error);
    complaints = [];
}


function saveComplaints() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(complaints)
    );
}


function generateID() {

    return "GC" + Date.now().toString().slice(-8);
}


// ==========================================
// 6. INITIALIZE PARK MAP
// ==========================================

function initializeParkMap() {

    const mapContainer =
        document.getElementById("parkMap");

    if (!mapContainer) {
        console.error("Map container #parkMap is missing.");
        return;
    }

    if (typeof L === "undefined") {

        console.error("Leaflet library is missing.");

        if (mapMessage) {
            mapMessage.textContent =
                "Map could not load. Check your internet connection.";
        }

        return;
    }

    if (parkMap) {
        return;
    }

    // Default location: Bengaluru

    parkMap = L.map("parkMap").setView(
        [12.9716, 77.5946],
        12
    );

    // OpenStreetMap tiles

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(parkMap);

    // Click map to select park location

    parkMap.on("click", async function (event) {

        const latitude = event.latlng.lat;
        const longitude = event.latlng.lng;

        await selectParkLocation(latitude, longitude);
    });
}


// ==========================================
// 7. SELECT LOCATION BY CLICKING MAP
// ==========================================

async function selectParkLocation(latitude, longitude) {

    if (!parkMap) return;

    parkLatitude.value = latitude;
    parkLongitude.value = longitude;

    // Remove previous marker

    if (parkMarker) {
        parkMap.removeLayer(parkMarker);
    }

    // Add new marker

    parkMarker = L.marker([
        latitude,
        longitude
    ]).addTo(parkMap);

    parkLocation.value = "";

    if (mapMessage) {
        mapMessage.textContent =
            "Getting the selected park address...";
    }

    parkMarker.bindPopup(
        "Selected park location"
    ).openPopup();

    try {

        const url =
            "https://nominatim.openstreetmap.org/reverse" +
            "?format=jsonv2" +
            "&lat=" + encodeURIComponent(latitude) +
            "&lon=" + encodeURIComponent(longitude);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Address lookup failed.");
        }

        const data = await response.json();

        const address =
            data.display_name ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        parkLocation.value = address;

        parkMarker.bindPopup(
            "Selected Park Location<br>" + address
        ).openPopup();

        if (mapMessage) {
            mapMessage.textContent =
                "Park location selected successfully.";
        }

    } catch (error) {

        console.error("Address lookup error:", error);

        const coordinates =
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        parkLocation.value = coordinates;

        if (mapMessage) {
            mapMessage.textContent =
                "Address unavailable. Coordinates have been saved.";
        }

        parkMarker.bindPopup(
            "Selected coordinates: " + coordinates
        ).openPopup();
    }
}


// ==========================================
// 8. SEARCH PARK BY NAME
// ==========================================

async function searchPark() {

    const searchText = parkSearch.value.trim();

    if (!searchText) {

        searchMessage.textContent =
            "Please enter a park or garden name.";

        return;
    }

    if (!parkMap) {
        initializeParkMap();
    }

    if (!parkMap) {

        searchMessage.textContent =
            "Map is unavailable. Please check your internet connection.";

        return;
    }

    searchParkButton.disabled = true;

    searchMessage.textContent =
        "Searching for park...";

    try {

        const url =
            "https://nominatim.openstreetmap.org/search" +
            "?format=jsonv2" +
            "&limit=5" +
            "&q=" + encodeURIComponent(searchText);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Park search failed.");
        }

        const results = await response.json();

        if (!results || results.length === 0) {

            searchMessage.textContent =
                "Park not found. Try another name or include the city.";

            return;
        }

        // Use the first matching result

        const park = results[0];

        const latitude = Number(park.lat);
        const longitude = Number(park.lon);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            throw new Error("Invalid park coordinates.");
        }

        // Move map to searched park

        parkMap.setView(
            [latitude, longitude],
            16
        );

        // Save park details

        parkLocation.value = park.display_name;
        parkLatitude.value = latitude;
        parkLongitude.value = longitude;

        // Remove previous marker

        if (parkMarker) {
            parkMap.removeLayer(parkMarker);
        }

        // Add new marker

        parkMarker = L.marker([
            latitude,
            longitude
        ]).addTo(parkMap);

        parkMarker.bindPopup(
            "Selected Park Location<br>" + park.display_name
        ).openPopup();

        searchMessage.textContent =
            "Park found! Location selected successfully.";

        if (mapMessage) {
            mapMessage.textContent =
                "You can click another point on the map to adjust the location.";
        }

    } catch (error) {

        console.error("Park search error:", error);

        searchMessage.textContent =
            "Unable to search right now. Please try again later.";

    } finally {

        searchParkButton.disabled = false;
    }
}


// Search button event

if (searchParkButton && parkSearch) {

    searchParkButton.addEventListener(
        "click",
        searchPark
    );

    parkSearch.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();
                searchPark();
            }
        }
    );
}


// ==========================================
// 9. CLEAR SELECTED PARK LOCATION
// ==========================================

function clearParkSelection() {

    parkLocation.value = "";
    parkLatitude.value = "";
    parkLongitude.value = "";

    if (parkMarker && parkMap) {

        parkMap.removeLayer(parkMarker);
        parkMarker = null;
    }

    if (mapMessage) {
        mapMessage.textContent =
            "Search for a park or click on the map to select its location.";
    }

    if (searchMessage) {
        searchMessage.textContent = "";
    }

    if (parkSearch) {
        parkSearch.value = "";
    }
}


// ==========================================
// 10. REFRESH MAP WHEN PUBLIC DASHBOARD OPENS
// ==========================================

function refreshParkMap() {

    if (parkMap) {

        requestAnimationFrame(function () {
            parkMap.invalidateSize();
        });
    }
}


// ==========================================
// 11. PHOTO UPLOAD AND PREVIEW
// ==========================================

if (issuePhoto && photoPreview) {

    issuePhoto.addEventListener("change", function () {

        const file = this.files[0];

        photoPreview.replaceChildren();
        selectedPhoto = "";

        if (!file) return;

        if (![
            "image/jpeg",
            "image/png",
            "image/webp"
        ].includes(file.type)) {

            alert("Please select a JPG, PNG or WEBP image.");

            this.value = "";
            return;
        }

        // Maximum file size: 2 MB

        if (file.size > 2 * 1024 * 1024) {

            alert("Image must be smaller than 2 MB.");

            this.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {

            selectedPhoto = event.target.result;

            const img = document.createElement("img");

            img.src = selectedPhoto;
            img.alt = "Uploaded complaint photo";

            photoPreview.appendChild(img);
        };

        reader.onerror = function () {

            alert("Unable to read the selected image.");

            selectedPhoto = "";
        };

        reader.readAsDataURL(file);
    });
}


// ==========================================
// 12. CREATE TABLE CELL
// ==========================================

function createCell(value) {

    const cell = document.createElement("td");

    cell.textContent = value || "";

    return cell;
}


// ==========================================
// 13. SUBMIT PUBLIC COMPLAINT
// ==========================================

if (complaintForm) {

    complaintForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            // Validate park location

            if (
                !parkLocation.value.trim() ||
                !parkLatitude.value ||
                !parkLongitude.value
            ) {

                alert(
                    "Please search for a park or select its location on the map."
                );

                refreshParkMap();
                return;
            }

            if (!selectedPhoto) {

                alert("Please upload a complaint photo.");
                return;
            }

            const complaint = {

                id: generateID(),

                name:
                    document.getElementById("citizenName").value.trim(),

                email:
                    document.getElementById("citizenEmail").value.trim(),

                park:
                    parkLocation.value.trim(),

                latitude:
                    Number(parkLatitude.value),

                longitude:
                    Number(parkLongitude.value),

                category:
                    document.getElementById("category").value,

                description:
                    document.getElementById("description").value.trim(),

                photo:
                    selectedPhoto,

                date:
                    new Date().toLocaleDateString(),

                status:
                    "Pending"
            };

            complaints.push(complaint);

            try {

                saveComplaints();

            } catch (error) {

                complaints.pop();

                alert(
                    "Unable to save complaint. Browser storage may be full. Try a smaller photo."
                );

                return;
            }

            renderPublicHistory();

            if (isAdminLoggedIn) {
                renderDashboard();
            }

            const submitMessage =
                document.getElementById("submitMessage");

            if (submitMessage) {

                submitMessage.textContent =
                    "Complaint submitted successfully! Your Complaint ID is " +
                    complaint.id;
            }

            // Reset form

            complaintForm.reset();

            selectedPhoto = "";

            if (issuePhoto) {
                issuePhoto.value = "";
            }

            if (photoPreview) {
                photoPreview.replaceChildren();
            }

            clearParkSelection();
        }
    );
}


// ==========================================
// 14. PUBLIC COMPLAINT HISTORY
// READ-ONLY
// ==========================================

function renderPublicHistory() {

    if (!publicComplaintTable) return;

    publicComplaintTable.replaceChildren();

    if (complaints.length === 0) {

        const row = document.createElement("tr");

        const cell = createCell(
            "No complaints submitted yet."
        );

        cell.colSpan = 6;

        row.appendChild(cell);
        publicComplaintTable.appendChild(row);

        return;
    }

    complaints.forEach(function (complaint) {

        const row = document.createElement("tr");

        row.appendChild(createCell(complaint.id));
        row.appendChild(createCell(complaint.park));
        row.appendChild(createCell(complaint.category));
        row.appendChild(createCell(complaint.date));
        row.appendChild(createCell(complaint.status));

        const photoCell = document.createElement("td");

        if (complaint.photo) {

            const img = document.createElement("img");

            img.src = complaint.photo;
            img.alt = "Complaint photo";

            img.style.width = "90px";
            img.style.height = "65px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "8px";

            photoCell.appendChild(img);

        } else {

            photoCell.textContent = "No photo";
        }

        row.appendChild(photoCell);

        // No editing controls in public history

        publicComplaintTable.appendChild(row);
    });
}


// ==========================================
// 15. ADMINISTRATOR DASHBOARD
// ==========================================

function renderDashboard() {

    if (!isAdminLoggedIn || !complaintTable) {
        return;
    }

    complaintTable.replaceChildren();

    const totalCount =
        document.getElementById("totalCount");

    const pendingCount =
        document.getElementById("pendingCount");

    const progressCount =
        document.getElementById("progressCount");

    const resolvedCount =
        document.getElementById("resolvedCount");

    // Statistics

    totalCount.textContent = complaints.length;

    pendingCount.textContent =
        complaints.filter(c => c.status === "Pending").length;

    progressCount.textContent =
        complaints.filter(c => c.status === "In Progress").length;

    resolvedCount.textContent =
        complaints.filter(c => c.status === "Resolved").length;

    if (complaints.length === 0) {

        const row = document.createElement("tr");

        const cell = createCell(
            "No complaints submitted yet."
        );

        cell.colSpan = 7;

        row.appendChild(cell);
        complaintTable.appendChild(row);

        return;
    }

    complaints.forEach(function (complaint) {

        const row = document.createElement("tr");

        row.appendChild(createCell(complaint.id));
        row.appendChild(createCell(complaint.name));
        row.appendChild(createCell(complaint.park));
        row.appendChild(createCell(complaint.category));
        row.appendChild(createCell(complaint.status));

        // Complaint photo

        const photoCell = document.createElement("td");

        if (complaint.photo) {

            const img = document.createElement("img");

            img.src = complaint.photo;
            img.alt = "Uploaded garden issue photo";
            img.className = "zoomable-photo";
            img.title = "Click to enlarge photo";

            photoCell.appendChild(img);

        } else {

            photoCell.textContent = "No photo uploaded";
        }

        row.appendChild(photoCell);

        // Status update dropdown

        const statusCell = document.createElement("td");

        const select = document.createElement("select");

        ["Pending", "In Progress", "Resolved"].forEach(
            function (status) {

                const option = document.createElement("option");

                option.value = status;
                option.textContent = status;

                select.appendChild(option);
            }
        );

        select.value = complaint.status;

        select.addEventListener("change", function () {

            const previousStatus = complaint.status;

            complaint.status = select.value;

            try {

                saveComplaints();

                renderDashboard();
                renderPublicHistory();

            } catch (error) {

                complaint.status = previousStatus;

                alert("Unable to save status update.");

                renderDashboard();
            }
        });

        statusCell.appendChild(select);
        row.appendChild(statusCell);

        complaintTable.appendChild(row);
    });
}


// ==========================================
// 16. ADMINISTRATOR LOGIN
// ==========================================

if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                document.getElementById("adminEmail").value.trim();

            const password =
                document.getElementById("adminPassword").value;

            const message =
                document.getElementById("adminLoginMessage");

            if (!firebaseConfigured || !auth) {

                message.textContent =
                    "Firebase is not configured. Check your Firebase settings.";

                message.style.color = "red";
                return;
            }

            if (
                email.toLowerCase() !==
                ADMIN_ALLOWED_EMAIL.toLowerCase()
            ) {

                message.textContent =
                    "This Gmail address is not authorized as administrator.";

                message.style.color = "red";
                return;
            }

            message.textContent = "Logging in...";
            message.style.color = "blue";

            try {

                await auth.signInWithEmailAndPassword(
                    email,
                    password
                );

                message.textContent = "";

                adminLoginForm.reset();

            } catch (error) {

                console.error("Login error:", error);

                message.style.color = "red";

                if (
                    error.code === "auth/invalid-credential" ||
                    error.code === "auth/wrong-password" ||
                    error.code === "auth/user-not-found"
                ) {

                    message.textContent =
                        "Incorrect Gmail or password. Please try again.";

                } else if (error.code === "auth/invalid-email") {

                    message.textContent =
                        "Please enter a valid Gmail address.";

                } else if (error.code === "auth/too-many-requests") {

                    message.textContent =
                        "Too many attempts. Please try again later.";

                } else {

                    message.textContent =
                        "Login failed. Check your Firebase configuration.";
                }
            }
        }
    );
}


// ==========================================
// 17. ADMINISTRATOR LOGOUT
// ==========================================

if (adminLogoutButton) {

    adminLogoutButton.addEventListener(
        "click",
        async function () {

            if (auth) {

                try {

                    await auth.signOut();

                } catch (error) {

                    alert("Unable to log out. Please try again.");
                    return;
                }
            }

            isAdminLoggedIn = false;

            updateAdminDisplay();

            if (adminLoginForm) {
                adminLoginForm.reset();
            }

            const loginMessage =
                document.getElementById("adminLoginMessage");

            if (loginMessage) {
                loginMessage.textContent = "";
            }

            showView("home");
        }
    );
}


// ==========================================
// 18. TRACK COMPLAINT BY ID
// ADMINISTRATOR ONLY
// ==========================================

const trackButton =
    document.getElementById("trackButton");

if (trackButton) {

    trackButton.addEventListener("click", function () {

        if (!isAdminLoggedIn) return;

        const trackInput =
            document.getElementById("trackId");

        const enteredID =
            trackInput.value.trim().toUpperCase();

        const result =
            document.getElementById("trackResult");

        result.replaceChildren();

        if (!enteredID) {

            result.textContent =
                "Please enter your complaint ID.";

            return;
        }

        const complaint = complaints.find(
            c => String(c.id).toUpperCase() === enteredID
        );

        if (!complaint) {

            result.textContent =
                "Complaint not found. Please check your complaint ID.";

            return;
        }

        const card = document.createElement("div");

        card.className = "result-card";

        const details = [

            ["Complaint ID", complaint.id],
            ["Citizen Name", complaint.name],
            ["Park Name", complaint.park],
            ["Latitude", complaint.latitude ?? "Not available"],
            ["Longitude", complaint.longitude ?? "Not available"],
            ["Category", complaint.category],
            ["Description", complaint.description],
            ["Date Submitted", complaint.date],
            ["Current Status", complaint.status]
        ];

        details.forEach(function ([label, value]) {

            const line = document.createElement("p");

            const strong = document.createElement("strong");

            strong.textContent = label + ": ";

            line.appendChild(strong);

            line.appendChild(
                document.createTextNode(String(value ?? ""))
            );

            card.appendChild(line);
        });

        if (
            Number.isFinite(Number(complaint.latitude)) &&
            Number.isFinite(Number(complaint.longitude))
        ) {

            const mapLink = document.createElement("a");

            mapLink.href =
                `https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`;

            mapLink.target = "_blank";
            mapLink.rel = "noopener noreferrer";

            mapLink.textContent =
                "View Park Location on Map";

            card.appendChild(mapLink);
        }

        result.appendChild(card);
    });
}


// ==========================================
// 19. PHOTO ZOOM MODAL
// ==========================================

function openPhotoModal(photoSource) {

    if (!photoModal || !enlargedPhoto) return;

    enlargedPhoto.src = photoSource;

    photoModal.style.display = "flex";

    document.body.style.overflow = "hidden";
}


function closePhotoViewer() {

    if (!photoModal || !enlargedPhoto) return;

    photoModal.style.display = "none";

    enlargedPhoto.src = "";

    document.body.style.overflow = "";
}


// Click administrator complaint photo

if (complaintTable) {

    complaintTable.addEventListener("click", function (event) {

        const clickedImage =
            event.target.closest(".zoomable-photo");

        if (clickedImage) {
            openPhotoModal(clickedImage.src);
        }
    });
}


// Close photo modal button

if (closePhotoModal) {

    closePhotoModal.addEventListener(
        "click",
        closePhotoViewer
    );
}


// Close by clicking outside the image

if (photoModal) {

    photoModal.addEventListener("click", function (event) {

        if (event.target === photoModal) {
            closePhotoViewer();
        }
    });
}


// Close using Escape key

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        closePhotoViewer();
    }
});


// ==========================================
// 20. SWITCH BETWEEN DASHBOARDS
// ==========================================

function showView(viewID) {

    const home =
        document.getElementById("home");

    if (home) {
        home.style.display = "none";
    }

    document.querySelectorAll(".dashboard-view").forEach(
        function (view) {
            view.style.display = "none";
        }
    );

    if (viewID === "home") {

        if (home) {
            home.style.display = "block";
        }
    }

    else if (viewID === "publicView") {

        const publicView =
            document.getElementById("publicView");

        if (publicView) {
            publicView.style.display = "block";
        }

        renderPublicHistory();

        refreshParkMap();
    }

    else if (viewID === "adminView") {

        const adminView =
            document.getElementById("adminView");

        if (adminView) {
            adminView.style.display = "block";
        }

        updateAdminDisplay();

        if (isAdminLoggedIn) {
            renderDashboard();
        }
    }

    window.scrollTo(0, 0);
}


// ==========================================
// 21. INITIALIZE WEBSITE
// ==========================================

initializeFirebase();

initializeParkMap();

renderPublicHistory();

showView("home");

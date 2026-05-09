/**
 * Script for sender.html (Nominatim API autocomplete & validation)
 * Location restricted to the Mangaluru–Karkala region.
 */

// Bounding box for the Mangaluru–Karkala region (SW corner, NE corner)
const REGION_BOUNDS = {
    minLat: 12.80,
    maxLat: 13.35,
    minLon: 74.70,
    maxLon: 75.15,
    // Nominatim viewbox format: left,top,right,bottom (lon,lat,lon,lat)
    viewbox: '74.70,13.35,75.15,12.80'
};

function isWithinRegion(lat, lon) {
    return (
        lat >= REGION_BOUNDS.minLat && lat <= REGION_BOUNDS.maxLat &&
        lon >= REGION_BOUNDS.minLon && lon <= REGION_BOUNDS.maxLon
    );
}

class AddressInput {
    constructor(inputId, suggestionsId, statusId) {
        this.input = document.getElementById(inputId);
        this.suggestionsBox = document.getElementById(suggestionsId);
        this.statusBadge = document.getElementById(statusId);
        
        this.debounceTimeout = null;
        this.selectedValue = "";
        this.isValid = false;

        this.init();
    }

    init() {
        if (!this.input) return;

        this.input.addEventListener('input', (e) => {
            this.setInvalid();
            clearTimeout(this.debounceTimeout);
            if (document.getElementById('sender-form')) checkFormValidity();
            if (document.getElementById('traveller-form')) checkTravellerFormValidity();
            
            const query = e.target.value.trim();
            if (query.length < 3) {
                this.suggestionsBox.classList.add('hidden');
                return;
            }

            this.statusBadge.textContent = "Loading...";
            this.debounceTimeout = setTimeout(() => this.fetchSuggestions(query), 500);
        });

        // Hide suggestions on outside click
        document.addEventListener('click', (e) => {
            if (e.target !== this.input && !this.suggestionsBox.contains(e.target)) {
                this.suggestionsBox.classList.add('hidden');
            }
        });
    }

    async fetchSuggestions(query) {
        try {
            // Use Photon API for robust autocomplete in the Mangaluru-Karkala region
            const bbox = `${REGION_BOUNDS.minLon},${REGION_BOUNDS.minLat},${REGION_BOUNDS.maxLon},${REGION_BOUNDS.maxLat}`;
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&bbox=${bbox}&limit=10`;
            const res = await fetch(url);
            const rawData = await res.json();
            
            // Format Photon results to match the expected structure
            const data = (rawData.features || []).map(f => {
                const p = f.properties;
                const parts = [p.name, p.street, p.city, p.county, p.state].filter(Boolean);
                return {
                    display_name: Array.from(new Set(parts)).join(', '),
                    lat: f.geometry.coordinates[1],
                    lon: f.geometry.coordinates[0]
                };
            });

            this.suggestionsBox.innerHTML = '';

            // Secondary client-side filter: discard results outside the bounding box
            const filtered = data.filter(item =>
                isWithinRegion(parseFloat(item.lat), parseFloat(item.lon))
            );
            
            if (filtered.length > 0) {
                filtered.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = item.display_name;
                    div.addEventListener('click', () => this.selectItem(item));
                    this.suggestionsBox.appendChild(div);
                });
                this.suggestionsBox.classList.remove('hidden');
                this.statusBadge.textContent = "Select from list";
            } else {
                this.suggestionsBox.classList.add('hidden');
                this.statusBadge.textContent = "Outside service area";
            }
        } catch (e) {
            console.error("Autocomplete error", e);
            this.statusBadge.textContent = "Error";
        }
    }

    selectItem(item) {
        this.input.value = item.display_name;
        this.selectedValue = item.display_name;
        this.lat = parseFloat(item.lat);
        this.lon = parseFloat(item.lon);
        this.isValid = true;
        this.suggestionsBox.classList.add('hidden');
        
        this.statusBadge.textContent = "Verified ✓";
        this.statusBadge.className = "status-badge valid";
        if (document.getElementById('sender-form')) checkFormValidity();
        if (document.getElementById('traveller-form')) checkTravellerFormValidity();
    }

    setInvalid() {
        this.isValid = false;
        this.selectedValue = "";
        this.statusBadge.textContent = "Unverified";
        this.statusBadge.className = "status-badge invalid";
    }
}

let pickupAddress, destAddress;

function initApp() {
    // 1. Sender Flow
    const senderForm = document.getElementById('sender-form');
    if (senderForm) {
        pickupAddress = new AddressInput('pickup-addr', 'pickup-suggestions', 'pickup-status');
        destAddress = new AddressInput('dest-addr', 'dest-suggestions', 'dest-status');

        senderForm.addEventListener('submit', handleFormSubmit);
        
        const inputs = senderForm.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', checkFormValidity);
        });
    }

    // 2. Traveller Flow
    const travellerForm = document.getElementById('traveller-form');
    if (travellerForm) {
        pickupAddress = new AddressInput('start-point', 'start-suggestions', 'start-status');
        destAddress = new AddressInput('end-point', 'end-suggestions', 'end-status');

        travellerForm.addEventListener('submit', handleTravellerSubmit);
        
        const inputs = travellerForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', checkTravellerFormValidity);
        });
    }

    // 3. Receiver Flow
    const receiverForm = document.getElementById('receiver-form');
    if (receiverForm) {
        receiverForm.addEventListener('submit', handleReceiverCheck);
        checkReceiverLoggedIn();
    }
}

function checkReceiverLoggedIn() {
    const userJson = localStorage.getItem('hopdrop_user');
    if (userJson) {
        const user = JSON.parse(userJson);
        const input = document.getElementById('receiver-id-check');
        const welcome = document.getElementById('receiver-welcome');
        if (input) {
            input.value = user.email;
            welcome.textContent = `Welcome back, ${user.name}! Seeing packages for ${user.email}`;
            handleReceiverCheck(new Event('submit'));
        }
    }
}

// --- Sender Actions ---
function checkFormValidity() {
    const btn = document.getElementById('submit-btn');
    if (!btn) return;

    const item = document.getElementById('item').value.trim();
    const payment = document.getElementById('payment').value.trim();
    const desc = document.getElementById('description').value.trim();

    if (pickupAddress.isValid && destAddress.isValid && item && payment && desc) {
        btn.disabled = false;
        btn.textContent = "Confirm Package Drop";
    } else {
        btn.disabled = true;
        if (!pickupAddress.isValid || !destAddress.isValid) {
            btn.textContent = "Please verify addresses first";
        } else {
            btn.textContent = "Fill all fields";
        }
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('form-msg');
    
    btn.disabled = true;
    btn.textContent = "Processing...";
    
    const payload = {
        sender_id: "Sender-Test-" + Math.floor(Math.random() * 1000),
        pickup_location: pickupAddress.selectedValue,
        dropoff_location: destAddress.selectedValue,
        pickup_lat: pickupAddress.lat,
        pickup_lng: pickupAddress.lon,
        dropoff_lat: destAddress.lat,
        dropoff_lng: destAddress.lon,
        reward_amount: parseFloat(document.getElementById('payment').value.trim()),
        receiver_id: document.getElementById('receiver-id').value.trim()
    };

    try {
        const res = await fetch('/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            msg.textContent = `Success! Package registered securely. ID: ${data.package_id}`;
            msg.className = "form-message success";
            document.getElementById('sender-form').reset();
            pickupAddress.setInvalid();
            destAddress.setInvalid();
        } else {
            msg.textContent = data.detail || "Error creating package.";
            msg.className = "form-message error";
        }
    } catch (err) {
        msg.textContent = "Network error connecting to API.";
        msg.className = "form-message error";
    }

    msg.classList.remove('hidden');
    btn.textContent = "Confirm Package Drop";
    btn.disabled = false;
}

// --- Traveller Actions ---
function checkTravellerFormValidity() {
    const btn = document.getElementById('search-btn');
    if (!btn) return;

    if (pickupAddress.isValid && destAddress.isValid) {
        btn.disabled = false;
        btn.textContent = "Search Packages on Route";
    } else {
        btn.disabled = true;
        btn.textContent = "Please verify addresses first";
    }
}

async function handleTravellerSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('search-btn');
    const msg = document.getElementById('search-msg');
    const results = document.getElementById('results-area');
    const list = document.getElementById('packages-list');
    
    btn.disabled = true;
    btn.textContent = "Searching for packages...";
    msg.classList.add('hidden');
    results.classList.add('hidden');
    
    const routePayload = {
        traveller_id: "Traveller-Test-" + Math.floor(Math.random() * 1000),
        start_point: pickupAddress.selectedValue,
        end_point: destAddress.selectedValue,
        start_lat: pickupAddress.lat,
        start_lng: pickupAddress.lon,
        end_lat: destAddress.lat,
        end_lng: destAddress.lon
    };

    try {
        const routeRes = await fetch('/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routePayload)
        });
        
        if (!routeRes.ok) throw new Error("Failed to register route");
        const routeData = await routeRes.json();
        const route_id = routeData.route_id;

        const matchRes = await fetch(`http://127.0.0.1:8001/matches/${route_id}`);
        const matches = await matchRes.json();

        if (matches.length > 0) {
            list.innerHTML = matches.map(m => `
                <div class="package-card">
                    <div class="package-details">
                        <h4>Package ID: ${m.id}</h4>
                        <div class="package-route">
                            <span style="display:block; margin-bottom:4px;">📍 Pick up: <span style="color:#f8fafc">${m.pickup_meeting_point.lat}, ${m.pickup_meeting_point.lng}</span> <a href="${m.pickup_meeting_point.osm_url}" target="_blank" style="color:var(--secondary); text-decoration:none;">(Map)</a></span>
                            <span style="display:block;">🎯 Drop-off: <span style="color:#f8fafc">${m.dropoff_meeting_point.lat}, ${m.dropoff_meeting_point.lng}</span> <a href="${m.dropoff_meeting_point.osm_url}" target="_blank" style="color:var(--secondary); text-decoration:none;">(Map)</a></span>
                        </div>
                        <span class="package-reward">Reward: ₹ ${m.reward_amount.toFixed(2)}</span>
                    </div>
                    <button class="accept-btn" onclick="alert('Accepted Match!')">Accept Handover</button>
                </div>
            `).join('');
            results.classList.remove('hidden');
        } else {
            msg.textContent = "No packages found along this route.";
            msg.className = "form-message error";
            msg.classList.remove('hidden');
        }
    } catch (err) {
        msg.textContent = "Network error connecting to API.";
        msg.className = "form-message error";
        msg.classList.remove('hidden');
    }

    btn.textContent = "Search Packages on Route";
    btn.disabled = false;
}

async function handleReceiverCheck(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('check-btn');
    const msg = document.getElementById('check-msg');
    const results = document.getElementById('receiver-results');
    const list = document.getElementById('receiver-packages-list');
    const countBadge = document.getElementById('package-count');
    const statusLabel = document.getElementById('receiver-status');
    
    const receiverId = document.getElementById('receiver-id-check').value.trim();
    if (!receiverId) return;

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Updating Dropbox...";
    }
    if (statusLabel) statusLabel.textContent = "Fetching...";
    
    msg.classList.add('hidden');

    try {
        const res = await fetch(`http://127.0.0.1:8001/packages/receiver/${encodeURIComponent(receiverId)}`);
        const packages = await res.json();

        if (packages.length > 0) {
            if (countBadge) countBadge.textContent = `${packages.length} Found`;
            list.innerHTML = packages.map(p => `
                <div class="package-card" data-id="${p.id}">
                    <div class="package-details">
                        <h4>${p.pickup_location} → ${p.dropoff_location}</h4>
                        <div class="package-route">
                            <span>ID: ${p.id}</span> • <span>Sender: ${p.sender_id}</span>
                        </div>
                        <p>Status: <span class="status-badge ${p.status.toLowerCase()}">${p.status}</span></p>
                    </div>
                    ${p.status === 'Pending' ? `
                        <button class="accept-btn" onclick="updatePkgStatus('${p.id}', 'Cancelled')">Cancel</button>
                    ` : p.status === 'Handover Complete' ? `
                        <button class="accept-btn" style="border-color:var(--success); color:var(--success);" onclick="updatePkgStatus('${p.id}', 'Received')">Confirm Receipt</button>
                    ` : ``}
                </div>
            `).join('');
            results.classList.remove('hidden');
            if (statusLabel) {
                statusLabel.textContent = "Updated ✓";
                statusLabel.className = "status-badge valid";
            }
        } else {
            if (countBadge) countBadge.textContent = `0 Found`;
            list.innerHTML = '';
            results.classList.add('hidden');
            msg.textContent = "No packages found for this ID.";
            msg.className = "form-message error";
            msg.classList.remove('hidden');
            if (statusLabel) {
                statusLabel.textContent = "No packages";
                statusLabel.className = "status-badge invalid";
            }
        }
    } catch (err) {
        msg.textContent = "Network error connecting to API.";
        msg.className = "form-message error";
        msg.classList.remove('hidden');
    }

    if (btn) {
        btn.textContent = "Refresh My Dropbox";
        btn.disabled = false;
    }
}

async function updatePkgStatus(pkgId, newStatus) {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

    try {
        const res = await fetch('/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_id: pkgId, new_status: newStatus })
        });
        
        if (res.ok) {
            handleReceiverCheck();
        } else {
            alert("Failed to update status.");
        }
    } catch (err) {
        alert("Error connecting to server.");
    }
}

document.addEventListener('DOMContentLoaded', initApp);

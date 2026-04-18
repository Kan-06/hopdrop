/**
 * Script for sender.html (Nominatim API autocomplete & validation)
 */

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
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
            const data = await res.json();

            this.suggestionsBox.innerHTML = '';
            
            if (data.length > 0) {
                data.forEach(item => {
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
                this.statusBadge.textContent = "No results";
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
        reward_amount: parseFloat(document.getElementById('payment').value.trim())
    };

    try {
        const res = await fetch('http://127.0.0.1:8000/packages', {
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
        const routeRes = await fetch('http://127.0.0.1:8000/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routePayload)
        });
        
        if (!routeRes.ok) throw new Error("Failed to register route");
        const routeData = await routeRes.json();
        const route_id = routeData.route_id;

        const matchRes = await fetch(`http://127.0.0.1:8000/matches/${route_id}`);
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

document.addEventListener('DOMContentLoaded', initApp);

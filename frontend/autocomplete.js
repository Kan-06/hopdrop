/**
 * HopDrop — Shared Utilities
 *   1. AddressAutoComplete  — Photon API autocomplete for Mangaluru–Karkala region
 *   2. initPhotoCapture     — camera / file-picker photo capture with preview
 */

const REGION = { minLat: 12.80, maxLat: 13.35, minLon: 74.70, maxLon: 75.15 };

function inRegion(lat, lon) {
    return lat >= REGION.minLat && lat <= REGION.maxLat &&
           lon >= REGION.minLon && lon <= REGION.maxLon;
}

/* ─── Address Autocomplete ─────────────────────────────────────────────────── */
class AddressAutoComplete {
    /**
     * @param {string} inputId  - id of the <input> element
     * @param {string} boxId    - id of the suggestions <div>
     * @param {Function} [onSelect] - callback(item) when user picks a suggestion
     */
    constructor(inputId, boxId, onSelect) {
        this.el       = document.getElementById(inputId);
        this.box      = document.getElementById(boxId);
        this.onSelect = onSelect || null;
        this.timer    = null;
        this.lat      = null;
        this.lng      = null;
        this.valid    = false;

        if (!this.el) return;

        this.el.addEventListener('input', () => {
            this.valid = false; this.lat = null; this.lng = null;
            this._updateBadge(false);
            clearTimeout(this.timer);
            const q = this.el.value.trim();
            if (q.length < 2) { this.close(); return; }
            this.timer = setTimeout(() => this._search(q), 420);
        });

        document.addEventListener('click', e => {
            if (!this.el.contains(e.target) && !this.box?.contains(e.target)) this.close();
        });
    }

    async _search(q) {
        const bbox = `${REGION.minLon},${REGION.minLat},${REGION.maxLon},${REGION.maxLat}`;
        this._render([{ label: '⏳ Searching…', disabled: true }]);
        try {
            const r = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&bbox=${bbox}&limit=8`
            );
            const d = await r.json();
            const items = (d.features || [])
                .map(f => {
                    const p = f.properties;
                    const parts = [p.name, p.street, p.city, p.county, p.state].filter(Boolean);
                    const label = [...new Set(parts)].join(', ');
                    return { label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
                })
                .filter(f => inRegion(f.lat, f.lon));

            if (items.length) {
                this._render(items);
            } else {
                this._render([{ label: '⚠ No results in service area (Mangaluru–Karkala)', disabled: true }]);
            }
        } catch {
            this._render([{ label: '❌ Network error — check connection', disabled: true }]);
        }
    }

    _render(items) {
        if (!this.box) return;
        this.box.innerHTML = items
            .map((it, i) =>
                `<div class="sug-item${it.disabled ? ' sug-disabled' : ''}" data-idx="${i}">
                    ${it.disabled ? it.label : `<span class="sug-icon">📍</span>${it.label}`}
                </div>`
            )
            .join('');
        this.box.classList.remove('hidden');
        this.box.querySelectorAll('.sug-item[data-idx]').forEach((el, i) => {
            if (!items[i].disabled) el.addEventListener('click', () => this._pick(items[i]));
        });
    }

    _pick(item) {
        this.el.value = item.label;
        this.lat = item.lat; this.lng = item.lon;
        this.valid = true;
        this.close();
        this._updateBadge(true);
        if (this.onSelect) this.onSelect(item);
    }

    _updateBadge(valid) {
        // Look for sibling badge element (optional)
        const badge = document.getElementById(this.el.id + '-badge');
        if (!badge) return;
        if (valid) {
            badge.textContent = '✓ Verified';
            badge.className = 'addr-badge valid';
        } else {
            badge.textContent = 'Type to search';
            badge.className = 'addr-badge';
        }
    }

    close() { this.box?.classList.add('hidden'); }

    /** Returns { address, lat, lng, valid } */
    get() {
        return { address: this.el?.value.trim(), lat: this.lat, lng: this.lng, valid: this.valid };
    }
}


/* ─── Photo Capture ────────────────────────────────────────────────────────── */
/**
 * Wire up a photo capture button + file input + preview image.
 *
 * @param {string}   btnId     - id of the trigger button
 * @param {string}   inputId   - id of <input type="file" ...>
 * @param {string}   previewId - id of <img> for preview
 * @param {Function} onCapture - callback(base64DataUrl)
 */
function initPhotoCapture(btnId, inputId, previewId, onCapture) {
    const btn     = document.getElementById(btnId);
    const input   = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => input.click());

    input.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            const dataUrl = e.target.result;
            if (preview) {
                preview.src = dataUrl;
                preview.classList.remove('hidden');
                preview.style.display = 'block';
            }
            if (onCapture) onCapture(dataUrl);
        };
        reader.readAsDataURL(file);
    });
}

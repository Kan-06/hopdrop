/**
 * HopDrop — Session Management (shared across all pages)
 * Uses localStorage. Call hdRequire('Role') at the top of each role page.
 */

const HD_KEY = 'hopdrop_session';
const HD_PAGES = { Sender: 'sender.html', Traveller: 'traveller.html', Receiver: 'receiver.html' };

function hdGet()   { try { return JSON.parse(localStorage.getItem(HD_KEY)); } catch(e) { return null; } }
function hdSet(u)  { localStorage.setItem(HD_KEY, JSON.stringify(u)); }
function hdClear() { localStorage.removeItem(HD_KEY); window.location.href = 'index.html'; }

/**
 * Require a logged-in session with the given role.
 * Redirects to index.html if not logged in or wrong role.
 * @returns {object|null} session object or null
 */
function hdRequire(role) {
    const s = hdGet();
    if (!s) { window.location.href = 'index.html'; return null; }
    if (role && s.role !== role) { window.location.href = 'index.html'; return null; }
    return s;
}

/**
 * Injects a user info bar + logout button into element with given id.
 * @param {string} containerId
 */
function hdBar(containerId) {
    const s  = hdGet();
    const el = document.getElementById(containerId);
    if (!s || !el) return;

    const colours = {
        Sender:    { bg: 'rgba(236,72,153,.12)',  text: 'var(--primary)'   },
        Traveller: { bg: 'rgba(6,182,212,.12)',   text: 'var(--secondary)' },
        Receiver:  { bg: 'rgba(34,197,94,.12)',   text: 'var(--success)'   },
    };
    const c = colours[s.role] || colours.Traveller;

    el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:.6rem .9rem;border-radius:12px;margin-bottom:1.5rem;
                background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);">
        <span style="font-size:.88rem;">
            👤 <strong style="color:var(--text);">${s.name}</strong>
            &nbsp;<span style="background:${c.bg};color:${c.text};
                               padding:.15rem .55rem;border-radius:99px;
                               font-size:.72rem;font-weight:700;">${s.role}</span>
        </span>
        <button onclick="hdClear()"
            style="background:transparent;border:1px solid rgba(239,68,68,.4);
                   color:var(--danger);padding:.28rem .75rem;border-radius:8px;
                   cursor:pointer;font-size:.79rem;font-weight:600;transition:all .2s;"
            onmouseover="this.style.background='rgba(239,68,68,.1)'"
            onmouseout="this.style.background='transparent'">
            Logout
        </button>
    </div>`;
}

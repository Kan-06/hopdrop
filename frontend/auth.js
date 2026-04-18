const GOOGLE_CLIENT_ID = '152151082369-pmf3e6sl3tgdqj8ku3r5n7rb5anc16cl.apps.googleusercontent.com';
const API_BASE = 'http://127.0.0.1:8000';

// Called by Google Identity Services after user picks an account
async function handleGoogleCredential(response) {
    const msg = document.getElementById('auth-msg');
    msg.classList.add('hidden');

    try {
        showAuthLoading(true);

        // Send Google JWT to our backend for verification
        const res = await fetch(`${API_BASE}/google-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });

        const data = await res.json();

        if (res.ok) {
            // Store user session in localStorage
            localStorage.setItem('hopdrop_user', JSON.stringify({
                name: data.name,
                email: data.email,
                picture: data.picture,
                id: data.id
            }));
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            showError(msg, data.detail || 'Authentication failed. Please try again.');
        }
    } catch (err) {
        console.error('Google auth error:', err);
        showError(msg, 'Could not connect to server. Make sure the backend is running.');
    } finally {
        showAuthLoading(false);
    }
}

function showError(msgEl, text) {
    msgEl.textContent = text;
    msgEl.className = 'form-message error';
    msgEl.classList.remove('hidden');
}

function showAuthLoading(isLoading) {
    const btn = document.getElementById('google-signin-btn');
    if (btn) {
        btn.style.opacity = isLoading ? '0.5' : '1';
        btn.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
}

window.addEventListener('load', () => {
    // If already logged in, skip to dashboard
    const currentUser = localStorage.getItem('hopdrop_user');
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Initialize and render the Google Sign-In button
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: 'popup'
    });

    google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
            type: 'standard',
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 320
        }
    );
});

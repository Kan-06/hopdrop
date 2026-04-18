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

<<<<<<< HEAD
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
=======
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Auto-redirect removed to allow user to see the login page if they choose.
    // Session is now managed via the dashboard's logout button.

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const msg = document.getElementById('login-msg');
            const submitBtn = loginForm.querySelector('button');

            msg.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Authenticating...';

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    const userData = await response.json();
                    localStorage.setItem('hopdrop_user', JSON.stringify(userData));
                    window.location.href = 'dashboard.html';
                } else {
                    const errorData = await response.json();
                    msg.textContent = errorData.detail || 'Invalid email or password.';
                    msg.className = 'form-message error';
                    msg.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                }
            } catch (error) {
                msg.textContent = 'Server connection error. Please try again.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const msg = document.getElementById('register-msg');
            const submitBtn = registerForm.querySelector('button');

            msg.classList.add('hidden');

            if (password !== confirmPassword) {
                msg.textContent = 'Passwords do not match.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name, 
                        email, 
                        password, 
                        phone: "0000000000", // Default phone for now if not in form
                        role: "Both" 
                    })
                });

                if (response.ok) {
                    msg.textContent = 'Account created successfully! Please log in.';
                    msg.className = 'form-message success';
                    msg.classList.remove('hidden');
                    registerForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';

                    setTimeout(() => {
                        switchAuthTab('login');
                        document.getElementById('login-msg').textContent = 'Account created successfully! Please log in.';
                        document.getElementById('login-msg').className = 'form-message success';
                        document.getElementById('login-msg').classList.remove('hidden');
                    }, 1500);
                } else {
                    const errorData = await response.json();
                    msg.textContent = errorData.detail || 'Registration failed.';
                    msg.className = 'form-message error';
                    msg.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                }
            } catch (error) {
                msg.textContent = 'Server connection error. Please try again.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
    }
    // --- Google Auth ---
    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const msg = document.getElementById('login-msg');
            msg.classList.add('hidden');
            
            // Prevent multiple clicks
            if (googleBtn.disabled) return;
            googleBtn.disabled = true;
            const originalText = googleBtn.innerHTML;
            googleBtn.innerHTML = "Opening Google...";

            try {
                // Check if firebase is initialized
                if (typeof firebase === 'undefined') {
                    throw new Error("Firebase SDK not loaded");
                }

                // Firebase Config
                const firebaseConfig = {
                  apiKey: "AIzaSyBrussCBh-WVPb8XLXicYl-1OpavoRtceA",
                  authDomain: "hopdrop-233b2.firebaseapp.com",
                  projectId: "hopdrop-233b2",
                  storageBucket: "hopdrop-233b2.firebasestorage.app",
                  messagingSenderId: "32625711084",
                  appId: "1:32625711084:web:7de3a9418be05ab93112c9"
                };

                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }

                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await firebase.auth().signInWithPopup(provider);
                const user = result.user;

                // Sync with our backend
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email, password: "GOOGLE_AUTH_EXTERNAL" })
                });

                if (response.ok) {
                    const userData = await response.json();
                    localStorage.setItem('hopdrop_user', JSON.stringify(userData));
                    window.location.href = 'dashboard.html';
                } else {
                    // If user doesn't exist in our DB, register them automatically
                    const regRes = await fetch('/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            name: user.displayName, 
                            email: user.email, 
                            password: "GOOGLE_AUTH_EXTERNAL",
                            phone: user.phoneNumber || "0000000000",
                            role: "Both" 
                        })
                    });

                    if (regRes.ok) {
                        localStorage.setItem('hopdrop_user', JSON.stringify({ name: user.displayName, email: user.email }));
                        window.location.href = 'dashboard.html';
                    }
                }
            } catch (error) {
                console.error("Detailed Sign-In Error:", error);
                
                let errorMsg = "Google Sign-In failed.";
                if (error.code === 'auth/operation-not-allowed') {
                    errorMsg = "Google Provider is not enabled in Firebase Console.";
                } else if (error.code === 'auth/unauthorized-domain') {
                    errorMsg = "This domain (127.0.0.1) is not authorized in Firebase.";
                } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
                    errorMsg = "Please open the site via http://127.0.0.1:8001 instead of a local file.";
                } else if (error.code === 'auth/cancelled-popup-request') {
                    errorMsg = "Please finish the sign-in in the Google popup.";
                } else if (error.message.includes("YOUR_API_KEY")) {
                    errorMsg = "Please configure your Firebase API Key in auth.js";
                } else {
                    errorMsg = error.message;
                }

                msg.textContent = errorMsg;
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
            } finally {
                googleBtn.disabled = false;
                googleBtn.innerHTML = originalText;
            }
        });
    }
>>>>>>> faf449f (Complete Firebase integration: Live Firestore, Google Auth, and Session Management)
});

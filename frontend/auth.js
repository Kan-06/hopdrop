// Switch between Login and Register tabs
function switchAuthTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// ----- Google Auth Helper -----
async function signInWithGoogle(msgElementId) {
    const msg = document.getElementById(msgElementId || 'login-msg');
    const googleBtn = document.getElementById('google-login');

    if (googleBtn.disabled) return;
    googleBtn.disabled = true;
    const originalText = googleBtn.innerHTML;
    googleBtn.innerHTML = 'Opening Google...';

    try {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded. Please open the site via http://127.0.0.1:8001');
        }

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
        const idToken = await user.getIdToken();

        const authRes = await fetch('/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken })
        });

        if (authRes.ok) {
            const userData = await authRes.json();
            localStorage.setItem('hopdrop_user', JSON.stringify(userData));
            window.location.href = 'dashboard.html';
        } else {
            const errorText = await authRes.text();
            throw new Error('Google Authentication failed with backend.');
        }
    } catch (error) {
        console.error('Google Sign-In Error:', error);

        let errorMsg = 'Google Sign-In failed. Please try again.';
        if (error.code === 'auth/operation-not-allowed') {
            errorMsg = 'Google Sign-In is not enabled in Firebase Console.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMsg = 'Open the site via http://127.0.0.1:8001 (not as a local file).';
        } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
            errorMsg = 'Please open the site via http://127.0.0.1:8001 instead of a local file.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMsg = 'Please complete sign-in in the Google popup.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMsg = 'Sign-in popup was closed. Please try again.';
        } else {
            errorMsg = error.message;
        }

        if (msg) {
            msg.textContent = errorMsg;
            msg.className = 'form-message error';
            msg.classList.remove('hidden');
        }
    } finally {
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalText;
    }
}

// ----- Page Init -----
document.addEventListener('DOMContentLoaded', () => {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const msg = document.getElementById('login-msg');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

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
                }
            } catch (error) {
                msg.textContent = 'Server connection error. Please try again.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const msg = document.getElementById('register-msg');
            const submitBtn = registerForm.querySelector('button[type="submit"]');

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
                    body: JSON.stringify({ name, email, password, phone: '0000000000', role: 'Both' })
                });

                if (response.ok) {
                    msg.textContent = 'Account created! Please sign in.';
                    msg.className = 'form-message success';
                    msg.classList.remove('hidden');
                    registerForm.reset();
                    setTimeout(() => switchAuthTab('login'), 1500);
                } else {
                    const errorData = await response.json();
                    msg.textContent = errorData.detail || 'Registration failed. Email may already exist.';
                    msg.className = 'form-message error';
                    msg.classList.remove('hidden');
                }
            } catch (error) {
                msg.textContent = 'Server connection error. Please try again.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
    }

    // Google Sign-In buttons (both Login tab and Register tab)
    const googleLoginBtn = document.getElementById('google-login');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => signInWithGoogle('login-msg'));
    }

    const googleRegisterBtn = document.getElementById('google-register');
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', () => signInWithGoogle('register-msg'));
    }
});

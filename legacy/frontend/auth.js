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

document.addEventListener('DOMContentLoaded', () => {

    // ---- Login Form ----
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const msg = document.getElementById('login-msg');
            const submitBtn = document.getElementById('login-submit-btn');

            msg.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';

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
                msg.textContent = 'Cannot connect to server. Make sure it is running.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    // ---- Register Form ----
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const msg = document.getElementById('register-msg');
            const submitBtn = document.getElementById('register-submit-btn');

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
                        phone: '0000000000',
                        role: 'Both'
                    })
                });

                if (response.ok) {
                    msg.textContent = 'Account created successfully! Please sign in.';
                    msg.className = 'form-message success';
                    msg.classList.remove('hidden');
                    registerForm.reset();
                    setTimeout(() => switchAuthTab('login'), 1500);
                } else {
                    const errorData = await response.json();
                    msg.textContent = errorData.detail || 'Registration failed. Email may already be in use.';
                    msg.className = 'form-message error';
                    msg.classList.remove('hidden');
                }
            } catch (error) {
                msg.textContent = 'Cannot connect to server. Make sure it is running.';
                msg.className = 'form-message error';
                msg.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
    }
});

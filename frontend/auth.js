function switchAuthTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        loginForm.classList.add('active');
        registerForm.classList.add('hidden');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        registerForm.classList.add('active');
        loginForm.classList.add('hidden');
        loginForm.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Auto-redirect if already logged in
    const currentUser = localStorage.getItem('hopdrop_user');
    if (currentUser) {
        window.location.href = 'dashboard.html';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const msg = document.getElementById('login-msg');
            const submitBtn = loginForm.querySelector('button');

            msg.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Authenticating...';

            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('hopdrop_users') || '[]');
                const user = users.find(u => u.email === email && u.password === password);

                if (user) {
                    localStorage.setItem('hopdrop_user', JSON.stringify({ name: user.name, email: user.email }));
                    window.location.href = 'dashboard.html';
                } else {
                    msg.textContent = 'Invalid email or password.';
                    msg.className = 'form-message error';
                    msg.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                }
            }, 800);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
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

            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('hopdrop_users') || '[]');
                if (users.find(u => u.email === email)) {
                    msg.textContent = 'User with this email already exists.';
                    msg.className = 'form-message error';
                    msg.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                    return;
                }

                users.push({ name, email, password });
                localStorage.setItem('hopdrop_users', JSON.stringify(users));
                
                // Switch to login tab after success
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

            }, 800);
        });
    }
});

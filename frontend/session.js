/**
 * Common session management for all pages
 */
function initSession() {
    const user = JSON.parse(localStorage.getItem('hopdrop_user'));

    // Protection: Redirect to login if no user found (except for index.html)
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');

    if (!user && !isLoginPage) {
        window.location.href = 'index.html';
        return;
    }

    // Inject User Profile UI if container exists
    const nav = document.querySelector('.top-nav');
    if (nav && user) {
        const profileDiv = document.createElement('div');
        profileDiv.className = 'user-profile';
        profileDiv.innerHTML = `
            <span id="user-greeting">Hi, ${user.name.split(' ')[0]}!</span>
            <button id="logout-btn" style="border:none; background:none; cursor:pointer;">Logout</button>
        `;
        nav.appendChild(profileDiv);

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('hopdrop_user');
            window.location.href = 'index.html';
        });
    }

    // For Dashboard specifically
    const userGreetingEl = document.getElementById('user-greeting');
    if (userGreetingEl && user && !document.querySelector('.top-nav')) {
        userGreetingEl.textContent = `Hello, ${user.name}!`;
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('hopdrop_user');
                window.location.href = 'index.html';
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', initSession);

import { showLoginForm, showSignupForm, resetNavigation, loadProfile } from './dom-utils.js';
import { logout, login, signup, getAccessToken } from './auth.js';
import { refreshAccessToken } from './profile.js';
import { setName } from './globals.js';

document.addEventListener('DOMContentLoaded', () => {
    resetNavigation();
    checkAuthentication();

    document.getElementById('login-button').addEventListener('click', showLoginForm);
    document.getElementById('signup-button').addEventListener('click', showSignupForm);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('profile-button').addEventListener('click', loadProfile);
});

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', login);
const signupForm = document.getElementById('signup-form');
signupForm.addEventListener('submit', signup);

document.getElementById('signup-link').addEventListener('click', function() {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
});
document.getElementById('login-link').addEventListener('click', function() {
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
});

async function checkAuthentication() {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            console.warn("No access token found");
            return;
        }

        const response = await fetch('/user-api/profile/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            setName(data.display_name);
            document.getElementById('sign').classList.remove('active');
            document.getElementById('sign-background').classList.remove('active');
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('signup-button').style.display = 'none';
            document.getElementById('logout-button').style.display = 'inline-block';
            document.getElementById('profile-button').style.display = 'inline-block';
        } else if (response.status === 401) {
            console.warn("Unauthorized: Trying token refresh...");
            const refreshed = await refreshAccessToken();
            if (refreshed) return checkAuthentication();
        } else {
            document.getElementById('sign-background').classList.add('active');
            document.getElementById('sign').classList.add('active');
            document.getElementById('login-form').classList.add('active');
            document.getElementById('login-button').style.display = 'inline-block';
            document.getElementById('signup-button').style.display = 'inline-block';
            document.getElementById('logout-button').style.display = 'none';
            document.getElementById('profile-button').style.display = 'none';
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
    }
}

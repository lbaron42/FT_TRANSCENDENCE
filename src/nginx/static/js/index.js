import { showLoginForm, showSignupForm, resetNavigation, loadProfile } from './dom-utils.js';
import { logout, login, signup, getAccessToken } from './auth.js';
import { refreshAccessToken } from './profile.js';
import { setName } from './globals.js';
import { navigateTo } from './routing.js';

document.getElementById('login-button').addEventListener('click', showLoginForm);
document.getElementById('signup-button').addEventListener('click', showSignupForm);
document.getElementById('logout-button').addEventListener('click', logout);
document.getElementById('profile-button').addEventListener('click', () => navigateTo("/profile"));
document.getElementById('go-back').addEventListener('click', () => navigateTo("/"));
document.getElementById('settings-button').addEventListener('click', () => navigateTo("/update-profile"));

document.addEventListener('DOMContentLoaded', () => {
    resetNavigation();
    checkAuthentication();
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

export async function checkAuthentication() {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            // console.warn("No access token found");
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

        // console.error(`Raw Response: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            setName(data.display_name);
            document.getElementById('sign').classList.remove('active');
            document.getElementById('sign-background').classList.remove('active');
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('signup-button').style.display = 'none';
            document.getElementById('logout-button').style.display = 'flex';
            document.getElementById('settings-button').style.display = 'none';
            document.getElementById('profile-button').style.display = 'flex';
        } else if (response.status === 401) {
            // console.warn("Unauthorized: Trying token refresh...");
            const refreshed = await refreshAccessToken();
            if (refreshed) return checkAuthentication();
            document.getElementById('sign-background').classList.add('active');
            document.getElementById('sign').classList.add('active');
            document.getElementById('login-form').classList.add('active');
            document.getElementById('login-button').style.display = 'flex';
            document.getElementById('logout-button').style.display = 'none';
            document.getElementById('signup-button').style.display = 'flex';
            document.getElementById('profile-button').style.display = 'none';
            document.getElementById('settings-button').style.display = 'none';
        }
    } catch (error) {
        // console.error('Authentication check failed:', error);
    }
}

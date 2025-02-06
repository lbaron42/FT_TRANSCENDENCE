import { login, signup } from './auth.js';
import { getAccessToken} from './auth.js';
import { refreshAccessToken } from './profile.js';

export async function loadProfile() {
    try {
        const accessToken = getAccessToken();
        if (!accessToken) {
            console.warn("No access token found. Redirecting to login.");
            showLoginForm();
            return;
        }

        let response = await fetch('/user-api/profile/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            credentials: 'include',
        });

        if (response.status === 401) {
            console.warn("Unauthorized: Attempting token refresh...");
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                response = await fetch('/user-api/profile/', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAccessToken()}`,
                    },
                    credentials: 'include',
                });

                if (!response.ok) throw new Error("Failed to load profile after refresh.");
            } else {
                alert('Session expired. Please log in again.');
                showLoginForm();
                return;
            }
        }

        if (response.ok) {
            const data = await response.json();
            console.log("Profile Loaded:", data);
            window.location.href = '/profile.html';
        } else {
            console.error('Unexpected error:', response.status);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}


export function showLoginForm() {
    const mainContent = document.querySelector('body');
    mainContent.innerHTML = `
        <h1>Login</h1>
        <form id="login-form">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Log In</button>
        </form>
        <p>Don't have an account? <button id="signup-link">Sign Up</button></p>
    `;

    document.getElementById('signup-link').addEventListener('click', showSignupForm);
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', login);
}

export function showSignupForm() {
    const mainContent = document.querySelector('body');
    mainContent.innerHTML = `
        <h1>Sign Up</h1>
        <form id="signup-form">
            <input type="text" name="username" placeholder="Username" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Sign Up</button>
        </form>
        <p>Already have an account? <button id="login-link">Log In</button></p>
    `;

    document.getElementById('login-link').addEventListener('click', showLoginForm);
    const signupForm = document.getElementById('signup-form');
    signupForm.addEventListener('submit', signup);
}

export function resetNavigation() {
    document.getElementById('login-button').style.display = 'inline-block';
    document.getElementById('signup-button').style.display = 'inline-block';
    document.getElementById('logout-button').style.display = 'none';
    document.getElementById('profile-button').style.display = 'none';
}

import {getCSRFToken, getAccessToken} from './auth.js';
import { customAlert } from './globals.js';
import {refreshAccessToken} from './profile.js';
import { navigateTo } from './routing.js';

export function loadSettings(){
    loadCurrentUserData();

    const form = document.getElementById('update-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        updateUserData();
    });
}

function loadCurrentUserData() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        console.error("No access token found! Redirecting to login.");
        window.location.href = 'index.html';
        return;
    }

    console.log("DEBUG: Access Token Being Sent:", accessToken);

    fetch('/user-api/profile/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
    })
    .then(response => {
        console.log("DEBUG: Raw Response:", response.status);
        if (response.status === 401) {
            console.warn("Unauthorized! Attempting token refresh...");
            return refreshAccessToken().then(success => {
                if (success) return loadCurrentUserData();
                throw new Error('Unauthorized: Could not refresh token');
            });
        }
        if (!response.ok) throw new Error('Failed to load profile data');
        return response.json();
    })
    .then(data => {
        console.log("DEBUG: Profile Data:", data);
        document.getElementById('display-name').value = data.display_name || '';
        document.getElementById('email').value = data.user.email || '';
    })
    .catch(error => console.error('Failed to load user data:', error));
}

function updateUserData() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        alert("Not authenticated. Please log in again.");
        window.location.href = "login.html";
        return;
    }

    const formData = new FormData();
    const displayName = document.getElementById('display-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (!displayName || !email) {
        alert('Display Name and Email are required.');
        return;
    }
    if (password && password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    formData.append('display_name', displayName);
    formData.append('email', email);
    if (password) {
        formData.append('password', password);
    }

    fetch('/user-api/update-profile/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-CSRFToken': getCSRFToken(),
        },
        body: formData,
        credentials: 'include',
    })
    .then(response => {
        if (response.status === 401) {
            console.warn("Unauthorized. Refreshing token...");
            return refreshAccessToken().then(success => {
                if (success) return updateUserData();
                throw new Error("Unauthorized. Redirecting to login.");
            });
        }
        if (!response.ok) return response.json().then(data => { throw new Error(data.error || 'Failed to update profile'); });

        customAlert('Profile updated successfully!');
        navigateTo("/profile");
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        customAlert(error.message || 'Failed to update profile.');
    });
}

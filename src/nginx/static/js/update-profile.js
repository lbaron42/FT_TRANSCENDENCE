import {getCSRFToken} from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    loadCurrentUserData();

    const form = document.getElementById('update-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        updateUserData();
    });
});

document.getElementById('back-button').addEventListener('click', () => {
    window.location.href = 'profile.html';
});

function loadCurrentUserData() {
    fetch('/user-api/profile/', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load profile data');
        return response.json();
    })
    .then(data => {
        document.getElementById('display-name').value = data.display_name || '';
        document.getElementById('email').value = data.user.email || '';
    })
    .catch(error => console.error('Failed to load user data:', error));
}

function updateUserData() {
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
            'X-CSRFToken': getCSRFToken(),
        },
        body: formData,
        credentials: 'include',
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to update profile');
            });
        }
        alert('Profile updated successfully!');
        window.location.href = 'profile.html';
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        alert(error.message || 'Failed to update profile.');
    });
}


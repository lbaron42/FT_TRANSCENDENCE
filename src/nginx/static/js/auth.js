import { showLoginForm } from './dom-utils.js';
import { unsetName } from './globals.js';
import { refreshAccessToken } from './profile.js';

export function getCSRFToken() {
    let csrfToken = null;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        if (cookie.trim().startsWith('csrftoken=')) {
            csrfToken = cookie.trim().substring('csrftoken='.length);
        }
    }
    return csrfToken;
}

export async function postAPI(url, data, authRequired = false) {
    let headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken(),
    };

    if (authRequired) {
        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    console.log("DEBUG: Sending request to", url, "with data:", data);

    let response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
        credentials: 'include',
    });

    if (response.status === 401 && authRequired) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            headers['Authorization'] = `Bearer ${getAccessToken()}`;
            response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data),
                credentials: 'include',
            });
        }
    }

    if (!response.ok) {
        console.error(`ERROR: ${url} failed with status ${response.status}`);
        const errorData = await response.json();
        console.error("ERROR DATA:", errorData);
        throw new Error(`Error: ${response.status}`);
    }

    return response.json();
}

export async function login(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await postAPI('/user-api/login/', data, false);

        if (response.two_fa_required) {
            alert('2FA required. Check your email for the OTP.');
            show2FAForm(response.username);
        } else if (response.tokens) {
            saveTokens(response.tokens);
            window.location.href = '/';
        } else {
            alert(response.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

export async function verify2FA(event, username) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const otp = formData.get('otp');

    console.log("DEBUG: Submitting OTP for verification", otp, "Username:", username);

    try {
        const response = await postAPI('/user-api/2fa/verify/', { otp, username });

        if (response.tokens) {
            saveTokens(response.tokens);
            alert('2FA verification successful!');
            window.location.href = '/';
        } else {
            alert(response.error || '2FA verification failed');
        }
    } catch (error) {
        console.error('2FA verification error:', error);
        alert('2FA verification failed: ' + error.message);
    }
}

export async function resendOTP(event) {
    event.preventDefault();

    const username = localStorage.getItem('pendingUsername');
    if (!username) {
        console.error("🚨 No username found in localStorage for resending OTP.");
        alert("Error: Username not available.");
        return;
    }

    console.log("🛠 DEBUG: Sending OTP request for username:", username);

    try {
        const response = await fetch('/user-api/2fa/resend-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            credentials: 'include',
            body: JSON.stringify({ username })
        });

        console.log("🛠 DEBUG: Resend OTP Response Status:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("🚨 Resend OTP API Error:", errorData);
            throw new Error(errorData.error || 'Failed to resend OTP.');
        }

        alert('✅ A new OTP has been sent to your email.');
    } catch (error) {
        console.error('🚨 Resend OTP error:', error);
        alert(error.message || 'Failed to resend OTP.');
    }
}

export function show2FAForm(username) {
    localStorage.setItem('pendingUsername', username);

    const mainContent = document.querySelector('body');
    mainContent.innerHTML = `
        <h1>Verify OTP</h1>
        <p>Username: <span>${username}</span></p>  <!-- No id needed -->
        <form id="2fa-form">
            <input type="text" name="otp" placeholder="Enter OTP" required>
            <button type="submit">Verify</button>
        </form>
        <button id="resend-otp">Resend OTP</button>
    `;

    const twoFAForm = document.getElementById('2fa-form');
    twoFAForm.addEventListener('submit', (event) => verify2FA(event, username));

    document.getElementById('resend-otp').addEventListener('click', resendOTP);
}

export async function signup(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await postAPI('/user-api/signup/', data, false);
        if (response.message === 'User created successfully') {
            console.log("Sign up success");
            window.location.href = '/';
        } else {
            alert(response.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed: ' + error.message);
    }
}

export async function logout() {
    try {
        await postAPI('/user-api/logout/', {}, true);
        removeTokens();
        unsetName();
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed: ' + error.message);
    }
}


export function saveTokens(tokens) {
    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
}

export function getAccessToken() {
    return localStorage.getItem('accessToken');
}

export function getRefreshToken() {
    return localStorage.getItem('refreshToken');
}

export function removeTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

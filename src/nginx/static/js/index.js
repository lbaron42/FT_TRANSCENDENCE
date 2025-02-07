import { showLoginForm, showSignupForm, resetNavigation, loadProfile } from './dom-utils.js';
import { logout, login, signup } from './auth.js';
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
        const response = await fetch('/user-api/profile/', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        document.getElementById('sign').classList.remove('active');
        document.querySelectorAll('.sign-in').forEach(content => 
            {
              content.classList.remove('active');
            }
          );

          console.error(`Raw Response: ${response.status}`);
          
        if (response.ok) {
            const data = await response.json();
            setName(data.display_name);
            document.getElementById('sign').classList.remove('active');
            document.getElementById('login-button').style.display = 'none';
            document.getElementById('signup-button').style.display = 'none';
            document.getElementById('logout-button').style.display = 'inline-block';
            document.getElementById('profile-button').style.display = 'inline-block';
        } else {
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

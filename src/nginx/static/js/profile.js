import {getCSRFToken, logout, getRefreshToken, getAccessToken, removeTokens} from './auth.js';
import {displayMatchHistory} from './gameHistory.js';
import { navigateTo } from './routing.js';

export function loadProfile() {
	// if (window.location.pathname.includes('profile')) {

	fetchProfileData();
	fetchFriends();
	loadAvatar();
	displayMatchHistory('two-player-pong');
	fetchPendingRequests();

    setInterval(fetchFriends, 10000);

	// }
    // const logoutButton = document.getElementById('logout-button');
    // if (logoutButton) logoutButton.addEventListener('click', logout);
    // const homeButton = document.getElementById('home-button');
    // if (homeButton) homeButton.addEventListener('click', function () {
    //     navigateTo("/");
    // });

    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarUpload = document.getElementById('avatar-upload');
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener('click', function () {
            avatarUpload.click();
        });
        avatarUpload.addEventListener('change', uploadAvatar);
    }

    const addFriendBtn = document.getElementById('add-friend-btn');
    if (addFriendBtn) addFriendBtn.addEventListener('click', addFriend);

    const fetchPendingRequestsBtn = document.getElementById('fetch-pending-requests');
    if (fetchPendingRequestsBtn) fetchPendingRequestsBtn.addEventListener('click', fetchPendingRequests);

    const twoFAToggle = document.getElementById('two-fa-toggle');
    if (twoFAToggle) {
        twoFAToggle.addEventListener('change', toggle2FA);
    }

    const tabs = document.querySelectorAll(".game-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const selectedGameMode = tab.getAttribute("data-game");
            displayMatchHistory(selectedGameMode);
        });
    });
}

export async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        // console.warn("🚨 No refresh token found.");
        return false;
    }

    try {
        const response = await fetch('/user-api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            // console.error("Refresh token invalid or expired.");
            return false;
        }

        const data = await response.json();
        saveTokens(data);
        // console.log("Access token refreshed.");
        return true;
    } catch (error) {
        // console.error("Token refresh failed:", error);
        return false;
    }
}

function fetchProfileData() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.error("No access token found");
        return;
    }

    fetch('/user-api/profile/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
    })
    .then(response => {
        if (response.status === 401) {
            return refreshAccessToken().then((success) => {
                if (success) return fetchProfileData();
                else throw new Error('Unauthorized');
            });
        }
        return response.json();
    })
    .then(data => {
        // console.log("Profile Data:", data);

        document.getElementById('username').textContent = data.username || "Unknown User";
        document.getElementById('display-name').textContent = data.display_name || "No display name set";

        const twoFAToggle = document.getElementById('two-fa-toggle');
        const twoFAStatus = document.getElementById('two-fa-status');

        if (twoFAToggle && twoFAStatus) {
            twoFAToggle.checked = !!data.twoFA_active;
            twoFAStatus.textContent = data.twoFA_active ? "Enabled" : "Disabled";
        }
        const onlineStatusElement = document.getElementById('online-status');
        if (onlineStatusElement) {
            onlineStatusElement.textContent = data.online_status ? "🟢 Online" : "🔴 Offline";
            onlineStatusElement.style.color = data.online_status ? "green" : "red";
        }
        // Game statistics
        const stats = data['stats']
        document.getElementById('games-played').textContent = stats['total']['games-played'] ?? "-";
        document.getElementById('games-losses').textContent = stats['total']['games-losses'] ?? "-";
        document.getElementById('games-wins').textContent = stats['total']['games-wins'] ?? "-";
        document.getElementById('games-draws').textContent = stats['total']['games-draws'] ?? "-";
        document.getElementById('ranking-score').textContent = stats['two-player-pong']['ranking-score'] ?? "-";
    })
    .catch(error => {
        // console.error('Error fetching profile data:', error);
    });
}

async function loadAvatar() {
	const accessToken = getAccessToken();
    if (!accessToken) {
        return;
    }
    try {
		const response = await fetch('/user-api/download-avatar/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
    	});
    	if (!response.ok) throw new Error(`Failed to get avatar: ${response.status}`);
		const avatarBlob = await response.blob();
		const avatarUrl = URL.createObjectURL(avatarBlob);
		document.getElementById('avatar').src = avatarUrl;
    } catch (error){
		document.getElementById('avatar').src = './images/default_avatar.jpg';
	}
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) {
        alert('No file selected.');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const accessToken = getAccessToken();

    try {
        let response = await fetch('/user-api/upload-avatar/', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken()
            }
        });

        if (response.status === 401) {
            // console.warn("Unauthorized. Refreshing token...");
            const refreshed = await refreshAccessToken();
            if (refreshed) return uploadAvatar(event);
        }

        const data = await response.json();

        if (data.message) {
            loadAvatar();
            alert('Avatar uploaded successfully!');
        } else {
            throw new Error(data.error || 'Failed to upload avatar');
        }
    } catch (error) {
        // console.error('Error uploading avatar:', error);
        alert(error.message);
    }
}

async function toggle2FA(event) {
    const enable2FA = event.target.checked;
    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.warn("No access token found.");
        return;
    }

    try {
        const response = await fetch('/user-api/2fa/toggle/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ enable: enable2FA }),
        });

        if (!response.ok) throw new Error(`Failed to update 2FA: ${response.status}`);

        const data = await response.json();
        document.getElementById('two-fa-status').textContent = enable2FA ? "Enabled" : "Disabled";

        if (enable2FA) {
            alert("Two-Factor Authentication Enabled. Check your email for an OTP.");
        } else {
            alert("Two-Factor Authentication Disabled.");
        }
    } catch (error) {
        // console.error(error);
        alert("Error updating 2FA.");
    }
}

async function fetchFriends() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.warn("No access token found.");
        return;
    }

    try {
        let response = await fetch('/user-api/friends/list/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        if (response.status === 401) {
            // console.warn("Unauthorized. Refreshing token...");
            const refreshed = await refreshAccessToken();
            if (refreshed) return fetchFriends();
        }

        if (!response.ok) throw new Error(`Error fetching friends: ${response.status}`);

        const friends = await response.json();

        if (!friends || friends.length === 0) {
            // console.warn("No friends found.");
            document.getElementById('friends').innerHTML = '<p>No friends yet.</p>';
            return;
        }

        displayFriends(friends);
    } catch (error) {
        // console.error(error);
    }
}

function displayFriends(friends) {
    const friendsList = document.getElementById('friends');
    friendsList.innerHTML = '';
    friends.forEach(friend => {
        const friendItem = document.createElement('li');
        friendItem.classList.add('friend-item');
        friendItem.id = `friend-${friend.id}`;

        friendItem.innerHTML = `
            <span class="friend-name">${friend.username}</span>
            <span class="friend-status" id="user-status-${friend.id}" style="color: ${friend.online_status ? 'green' : 'red'};">
                ${friend.online_status ? 'Online' : 'Offline'}
            </span>
            <button class="remove-friend-btn" data-username="${friend.username}">Remove</button>
            <button class="block-friend-btn" data-username="${friend.username}">Block</button>
        `;

        friendsList.appendChild(friendItem);
    });

    document.querySelectorAll('.remove-friend-btn').forEach(button => {
        button.addEventListener('click', function () {
            removeFriend(this.getAttribute('data-username'));
        });
    });

    document.querySelectorAll('.block-friend-btn').forEach(button => {
        button.addEventListener('click', function () {
            blockFriend(this.getAttribute('data-username'));
        });
    });
}

async function addFriend() {
    const friendUsername = document.getElementById('friend-username').value.trim();
    if (!friendUsername) {
        alert('Please enter a username.');
        return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
        return;
    }

    try {
        let response = await fetch(`/user-api/friend-requests/request/${friendUsername}/`, { // FIX: use correct endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) return addFriend();
        }

        const data = await response.json();
        if (response.ok) {
            alert(`Friend request sent to ${friendUsername}.`);
            fetchPendingRequests();
        } else {
            throw new Error(data.message || 'Failed to send friend request.');
        }
    } catch (error) {
        alert(error.message);
    }
}

async function acceptFriendRequest(requestId) {
    const accessToken = getAccessToken();
    if (!accessToken) {
        alert("No access token found.");
        return;
    }

    try {
        const response = await fetch(`/user-api/friend-requests/accept/${requestId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to accept friend request.');

        alert('Friend request accepted.');
        fetchPendingRequests();
    } catch (error) {
        alert(error.message);
    }
}

async function removeFriend(username) {
    if (!confirm(`Are you sure you want to remove ${username} from your friends?`)) return;

    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.warn("No access token found.");
        return;
    }

    try {
        let response = await fetch(`/user-api/friends/remove/${username}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        if (response.status === 401) {
            // console.warn("Unauthorized. Refreshing token...");
            const refreshed = await refreshAccessToken();
            if (refreshed) return removeFriend(username);
        }

        const data = await response.json();
        if (response.ok) {
            alert(`${username} has been removed.`);
            fetchFriends();
        } else {
            throw new Error(data.message || 'Failed to remove friend.');
        }
    } catch (error) {
        // console.error(error);
        alert(error.message);
    }
}

async function blockFriend(username) {
    if (!confirm(`Are you sure you want to block ${username}? This action cannot be undone.`)) return;

    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.warn("No access token found.");
        return;
    }
    try {
        const response = await fetch(`/user-api/block-user/${username}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        const data = await response.json();
        if (response.ok) {
            alert(`${username} has been blocked.`);
            fetchFriends();
        } else {
            throw new Error(data.message || 'Failed to block user.');
        }
    } catch (error) {
        // console.error(error);
        alert(error.message);
    }
}

async function declineFriendRequest(requestId) {
    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.warn("No access token found.");
        return;
    }
    try {
        const response = await fetch(`/user-api/friend-requests/decline/${requestId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to decline friend request.');

        alert('Friend request declined.');
        fetchPendingRequests();
    } catch (error) {
        // console.error(error);
        alert(error.message);
    }
}

async function fetchPendingRequests() {
    const accessToken = getAccessToken();
    if (!accessToken) {
        // console.warn("No access token found.");
        return;
    }

    try {
        let response = await fetch('/user-api/friend-requests/pending/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'X-CSRFToken': getCSRFToken(),
            },
            credentials: 'include',
        });

        if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) return fetchPendingRequests();
        }

        if (!response.ok) throw new Error('Failed to fetch pending requests.');

        const data = await response.json();
        if (!data.pending_requests || data.pending_requests.length === 0) {
            document.getElementById('pending-requests').innerHTML = '<p>No pending requests.</p>';
            return;
        }

        displayPendingRequests(data.pending_requests);
    } catch (error) {
        // console.error(error);
    }
}

function displayPendingRequests(requests) {
    const requestsList = document.getElementById('pending-requests');
    requestsList.innerHTML = '';

    if (requests.length === 0) {
        requestsList.innerHTML = '<p>No pending friend requests.</p>';
        return;
    }

    requests.forEach(request => {
        const requestItem = document.createElement('li');
        requestItem.innerHTML = `
            ${request.from_user}
            <button class="accept-btn" data-id="${request.id}">Accept</button>
            <button class="decline-btn" data-id="${request.id}">Decline</button>
        `;
        requestsList.appendChild(requestItem);
    });

    document.querySelectorAll('.accept-btn').forEach(button => {
        button.addEventListener('click', function () {
            const requestId = this.getAttribute('data-id');
            acceptFriendRequest(requestId);
        });
    });

    document.querySelectorAll('.decline-btn').forEach(button => {
        button.addEventListener('click', function () {
            const requestId = this.getAttribute('data-id');
            declineFriendRequest(requestId);
        });
    });
}

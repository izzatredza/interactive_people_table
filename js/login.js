// Function to handle the successful login response
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);

    // Store the token in localStorage
    localStorage.setItem('googleToken', response.credential);

    // Redirect to the main application page
    window.location.href = 'index.html';
}

// Check if the user is already logged in
window.onload = function () {
    if (localStorage.getItem('googleToken')) {
        // If a token exists, skip login and go to the main page
        window.location.href = 'index.html';
    }
};
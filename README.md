# Oni Register API
*Note: ( WIP: Still building )*

Oni Register API is a simple node/mongo backend service for handling user access and management.

Below is an outline of services offered:

---

**User Account**
- Sign Up (Create a new user account)
- Archive a user account
- Edit a user account

**Log in**
- Log an existing user in with name/password
- Log in via google
- Log in via facebook

**Security**
- Sign out
- Forgot password

**Wishlist**
- 2FA or two-factor authentication

## Startup
- TODO: Write startup<br/>*Note: Will be adding once inital app is complete*

## What if port already listening
lsof -i :3000
kill PID#


Follow up on CSRF

// Fetching data from the server with CSRF token
const csrfToken = '...'; // Replace with your actual way of getting the CSRF token
const url = '/api/data';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken, // Include the CSRF token in the header
  },
  body: JSON.stringify({ /* Your request data */ }),
})
  .then((response) => response.json())
  .then((data) => {
    // Process the response data
  })
  .catch((error) => {
    // Handle errors
  });

 // .redirect(`${redirect}?_csrf=${encodeURIComponent(csrfToken)}`);

// How to get it from req to pass onto sendToken payload
// csrfToken: req.csrfToken(),





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


const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Route for Google OAuth2.0 authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route for Google OAuth2.0 authentication
router.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
  // Generate a JWT token for the authenticated user
  const token = jwt.sign({ userId: req.user._id }, 'YOUR_JWT_SECRET', { expiresIn: '1h' }); // Replace with your actual JWT secret
  res.json({ token });
});

module.exports = router;


module.exports = router;







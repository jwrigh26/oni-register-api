const { env } = require('../constants');
const passport = require('passport');
const User = require('../models/User');
// Google OAuth2.0 strategy
// Configure passport with the JWT strategy and Google strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/v1/auth/google/callback', // Replace with your callback URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            email: profile.emails[0].value,
            googleId: profile.id,
          });
          console.log('User created:', user);
          return done(null, user);
        }
        console.log('User found:', user);
        return done(null, user);
      } catch (err) {
        console.error('Error finding/creating user:', err);
        return done(err, false);
      }
    },
  ),
);

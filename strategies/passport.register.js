const { env } = require('../constants');
const passport = require('passport');
const passportJWT = require('passport-jwt');

const User = require('../models/User');

const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromUrlQueryParameter('token'),
  secretOrKey: env.JWT_SECRET_PUBLIC, // using public secret because the JWT is passed in the URL
  //this will help you to pass request body to passport
  passReqToCallback: true,
};

passport.use(
  'register',
  new JwtStrategy(jwtOptions, async (req, payload, done) => {
    try {
      // Extract the token from the URL query parameter
      const token = ExtractJwt.fromUrlQueryParameter('token')(req);
      console.log(Object.keys(payload));

      // Find the user based on the payload's userID (you may need to adjust the field name depending on your User model)
      const user = await User.findOne({ email: payload.email });

      if (!user) {
        // If the user was not found
        // Send back null for error and false for user
        // To indicate that the authentication process failed
        console.log('User not found');
        return done(null, false);
      }

      // Check if the user has a registration object and registration is true
      if (!user.registration.registered) {
        console.log('User is not registered foo');
        return done(null, false);
      }

      // Compare the token from the URL query parameter with the token from the database
      // If they match, then the user is authenticated
      // If they don't match, then the user is not authenticated
      if (token !== user?.registration?.token) {
        console.log('Token does not match');
        return done(null, false);
      }

      // Remove the token from the user registration object
      user.registration.token = undefined;
      // Save the user
      await user.save();

      /// If successful, send the user object
      return done(null, user);
    } catch (err) {
      console.log('Error authenticating user:', err);
      return done(err, false);
    }
  }),
);

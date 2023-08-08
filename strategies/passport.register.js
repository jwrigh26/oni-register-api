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

      // Find the user based on the payload's userID (you may need to adjust the field name depending on your User model)
      const user = await User.findOne({ 'registration.token': token });

      if (!user) {
        // If the user was not found
        // Send back null for error and false for user
        // To indicate that the authentication process failed
        return done(null, false);
      }

      // Check if the user has a registration object and if the status is approved
      if (user.registration.status === 'approved') {
        console.log('User is already registered');
      }

      // Check if the user has a registration object and if the status is denied
      if (user.registration.status === 'denied') {
        console.log('User is denied registration');
      }

      // Check if the user has a registration object and registration is not pending
      if (user.registration.status !== 'pending') {
        console.log('User is not currently pending registration', user.registration.status);
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

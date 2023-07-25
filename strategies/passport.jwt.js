const { env } = require('../constants');
const passport = require('passport');
const passportJWT = require('passport-jwt');

const User = require('../models/User');

// Configure passport with the JWT strategy
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;

const cookieExtractor = (req) => {
  let token = null;

  if (req && req.cookies) {
    token = req.cookies['oni-token'];
  }

  return token;
};

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    cookieExtractor,
  ]),
  secretOrKey: env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // Find the user based on the payload's userID (you may need to adjust the field name depending on your User model)
      const user = await User.findOne({ email: payload.email });

      if (!user) {
        // If the user was not found
        // Send back null for error and false for user
        // To indicate that the authentication process failed
        console.log('User not found');
        return done(null, false);
      }

      // If successful, send the user object
      return done(null, user);
    } catch (err) {
      console.log('Error authenticating user:', err);
      return done(err, false);
    }
  }),
);

const { env } = require('../constants');
const { isDate } = require('../helpers/utils');
const argon2 = require('argon2');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    archived: {
      type: Date,
      min: '2000-01-01',
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
      default:
        '$argon2id$v=19$m=65536,t=3,p=4$eK8Eysrk0HjvzaB1sm6mUQ$bWTuPJJKhEVTG+e4e+f8ZAmil1FldYMNawcFL1d9MrI', //   P@ssw0rd123
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // only add if it exists
    },
    // JWT Token of type resetpassword
    resetPasswordToken: String,
    // Used to check if user has registered. If registered is false, user has not registered
    // and cannot access the app. They need to wait for a confirmation email.
    registration: {
      date: {
        type: Date,
        default: null,
        min: '2000-01-01',
      },
      status: {
        type: String,
        values: ['approved', 'denied', 'pending', null],
        default: null,
      },
      registered: {
        type: Boolean,
        default: false,
      },
      token: String,
    },
    role: {
      type: String,
      values: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true },
);
// ------------ UserSchema Hooks ------------ //

// Pre save hook to hash password
UserSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    return next();
  }

  console.log('Time to hash password');
  // Hash password with argon2 for security
  const passwordHashed = await argon2.hash(this.password);
  this.password = passwordHashed;
});

// ------------ UserSchema Methods ------------ //

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // const enteredPasswordHashed = await argon2.hash(enteredPassword);
  // console.log('enteredPasswordHashed', enteredPasswordHashed);
  const isPasswordValid = await argon2.verify(
    this.password,
    enteredPassword,
  );
  return isPasswordValid;
};

// Sign JWT and return
// This method generates a signed json web token and returns it.
// using the JWT_SECRET and JWT_EXPIRE values from the .env file.
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, email: this.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE,
  });
};

// Sign Public JWT and return
// This method generates a public signed json web token and returns it.
// using the JWT_SECRET_PUBLIC and JWT_EXPIRE values from the .env file.
UserSchema.methods.getPublicSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      registered: this.registered,
      role: this.role,
      type: 'public',
    },
    env.JWT_SECRET_PUBLIC,
    {
      expiresIn: env.JWT_EXPIRE,
    },
  );
};

// Sign a PUBLI JWT with a short expiration time
// Used for inside an email to confirm registration
// User clicks link in email, and is redirected to the app
// This JWT is then checked to see if the user has registered
// And if the registered token matches what is saved in the DB
UserSchema.methods.getRegisteredJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      type: 'registration',
    },
    env.JWT_SECRET_PUBLIC,
    {
      expiresIn: env.JWT_EXPIRE_REGISTRATION,
    },
  );
};

// Sign a PUBLI JWT with a short expiration time
// Used for inside an email to confirm registration
// User clicks link in email, and is redirected to the app
// This JWT is then checked to see if the user has registered
// And if the registered token matches what is saved in the DB
UserSchema.methods.getResetPasswordJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      type: 'resetpassword',
    },
    env.JWT_SECRET_PUBLIC,
    {
      expiresIn: env.JWT_EXPIRE_REGISTRATION,
    },
  );
};


// Check if registered is set
UserSchema.methods.isRegistered = (user) => {
  return user.registered !== null && isDate(user.registered);
};

module.exports = mongoose.model('User', UserSchema);

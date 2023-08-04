const mongoose = require('mongoose');

const WhitelistAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    domain: {
      type: String,
      required: false,
      unique: true,
    },
  },
  { timestamps: true },
);

// ------------ UserSchema Methods ------------ //

// Find out if the following string parameter matches the WhiltelistAccount email or includes the domain as a substring
WhitelistAccountSchema.statics.isWhitelisted = async function (string) {
  const whitelistAccount = await this.model('WhitelistAccount').findOne({
    $or: [
      { email: string }, // Match exact email
      {
        domain: {
          $exists: true,
          $ne: null,
          $regex: new RegExp(`^${string.split('@')[1]}$`, 'i'), // Match domain exactly
        },
      },
      {
        domain: {
          $exists: true,
          $ne: null,
          $regex: new RegExp(`@${string.split('@')[1]}`, 'i'), // Match domain as substring
        },
      },
    ],
  });

  return !!whitelistAccount;
};

module.exports = mongoose.model('WhitelistAccount', WhitelistAccountSchema);

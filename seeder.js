const fs = require('fs');
const colors = require('colors');
const connectDB = require('./config/db');
const User = require('./models/User');
const WhitelistAccount = require('./models/WhitelistAccount');

// Connect to database
connectDB();

const users = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8'),
);

const whilteList = JSON.parse(
  fs.readFileSync(`${__dirname}/_data/whitelist.json`, 'utf-8'),
);

// Delete data
const deleteData = async () => {
  await User.deleteMany();
  await WhitelistAccount.deleteMany();
  console.log('Data Destroyed...'.red.inverse);
};

const importBasicData = async () => {
  await User.create(users);
  await WhitelistAccount.create(whilteList);
  console.log('Basic Data Imported...'.green.inverse);
};

const seedData = async () => {
  try {
    await deleteData();
    await importBasicData();
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (process.argv[2] === '-s') {
  seedData();
} else {
  console.log('Please use -s to seed data'.red.inverse);
  process.exit();
}

const mongoose = require('mongoose');
const { env } = require('../constants');

const connectDB = async () => {
  mongoose.set("strictQuery", true);
  const connect = await mongoose.connect(env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`MongoDB Connected: ${connect.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;

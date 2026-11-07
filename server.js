require("dotenv").config();
const app = require("./src/app");
const Dbconnect = require("./src/config/dbcon.config");
const redis = require('./src/config/redis.config')

const port = process.env.PORT;
const startserver = async () => {
  await Dbconnect();
  await redis.ping();
  // app.listen(port, () => {
  //   console.log(`Run this application in ${port} port`);
  // });
};

startserver();

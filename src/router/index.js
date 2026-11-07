const express = require('express');
const router = express.Router();
const userRouter = require("./apis/userRouter")
const movieRouter = require("./apis/movieRouter");
const theaterRouter = require("./apis/theaterRouter");
const bookingRouter = require("./apis/bookingRouter")
const reportRouter = require("./apis/reportRouter")

router.use("/v1/api",userRouter);
router.use("/v2/api",movieRouter);
router.use("/v3/api",theaterRouter);
router.use("/v4/api",bookingRouter);
router.use("/v5/api",reportRouter);

module.exports=router
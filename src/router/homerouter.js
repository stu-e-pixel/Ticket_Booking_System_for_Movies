const express = require('express');
const router = express.Router();
const HomeController=require('../controller/HomeController');


router.use("/",HomeController.home)

module.exports=router
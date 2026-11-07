const express = require('express');
const app = express();
const path = require('path');
const helmet = require('helmet');
const limiter = require('./utils/RateLimit');
const morgan = require('morgan');
const logger = require('./utils/logger');
const cookieParser = require('cookie-parser')

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(helmet())
app.use(limiter)
app.use(morgan('dev'))
app.use(cookieParser())

app.set("view engine",'ejs');
app.set("views",path.join(__dirname,"views"));

const indexrouter = require('./router/index');
app.use(indexrouter);

const homerouter = require('./router/homerouter');
app.use(homerouter);


module.exports=app


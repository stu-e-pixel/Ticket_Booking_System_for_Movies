const RateLimit = require('express-rate-limit')


const limiter = RateLimit({
    windowMs:1*60*1000,
    limit:10000,
    standardHeaders:'draft-8',
    legacyHeaders:false,
    ipv6Subnet:56,
    message:"Too many requests from this IP, please try again after a minute"

})

module.exports=limiter
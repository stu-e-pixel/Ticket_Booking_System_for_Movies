const redis = require('redis');

const client = redis.createClient({
    url:process.env.REDIS_URL,
    RESP:2
})

client.on("Error",err=>console.log("Redis Error",err));

(
    async()=>{
       await client.connect();
       console.log("redis is conneted succesfully");
       
    }
)()

module.exports=client
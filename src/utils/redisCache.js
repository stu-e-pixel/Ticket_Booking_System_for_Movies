

const redisClient = require('../config/redis.config');


const getCache = async(key)=>{
    try {
        const data = await redisClient.get(key);
        if(!data) return null
        return JSON.parse(data)
    } catch (error) {
        console.log("Redis get Error", error);
        return false
        
    }
}


const setCache =async(key,data,expiry=300)=>{
    try {
        await redisClient.set(key,JSON.stringify(data),{EX:expiry})
        return true
        
    } catch (error) {
        console.log("Redis set Error",error);
        return false
        
    }
}

const delCache = async(key)=>{
    try {
        await redisClient.del(key)
        return true
        
    } catch (error) {
        console.log("Redis delete Error",error);
        return false
        
    }
}

const deleteCacheByPattern = async(pattern)=>{
    try {
        let cursor = "0"

        do {
            const reply = await redisClient.scan(cursor,{
            MATCH:pattern,
            COUNT:100
        })

        cursor=reply.cursor;
        const keys = reply.keys || []

        if(keys.length){
            await redisClient.unlink(keys)
        }
        } while (cursor !=="0");

        return true
    } catch (error) {
        console.log("Redis delete Error by pattern",error);
        return false
    }
}

module.exports={getCache,setCache,delCache,deleteCacheByPattern}
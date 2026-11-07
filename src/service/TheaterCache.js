const { getCache, setCache, deleteCacheByPattern } = require("../utils/redisCache")

const THEATER_CACHE_PREFIX="Theater:list:"

const getTheaterCache = async(key)=>{
    return await getCache(key)
}
const setTheaterCache = async(key,data,expiry=300)=>{
    return await setCache(key,data,expiry)
}
const deleteTheaterCache = async(key)=>{
    return await deleteCacheByPattern(`${THEATER_CACHE_PREFIX}*`)
}


module.exports={getTheaterCache,setTheaterCache,deleteTheaterCache};
const { getCache, setCache, deleteCacheByPattern } = require("../utils/redisCache")

const USER_CACHE_PREFIX="User:list:"

const getUserCache = async(key)=>{
    return await getCache(key)
}
const setUserCache = async(key,data,expiry=300)=>{
    return await setCache(key,data,expiry)
}
const deleteUserCache = async(key)=>{
    return await deleteCacheByPattern(`${USER_CACHE_PREFIX}*`)
}


module.exports={getUserCache,setUserCache,deleteUserCache}
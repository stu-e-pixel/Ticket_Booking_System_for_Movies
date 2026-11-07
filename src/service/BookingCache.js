const { getCache, setCache, deleteCacheByPattern } = require("../utils/redisCache")

const BOOKING_CACHE_PREFIX="Booking:list:"

const getBookingCache = async(key)=>{
    return await getCache(key)
}
const setBookingCache = async(key,data,expiry=300)=>{
    return await setCache(key,data,expiry)
}
const deleteBookingCache = async(key)=>{
    return await deleteCacheByPattern(`${BOOKING_CACHE_PREFIX}*`)
}


module.exports={getBookingCache,setBookingCache,deleteBookingCache};
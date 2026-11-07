const { getCache, setCache, deleteCacheByPattern } = require("../utils/redisCache")

const MOVIE_CACHE_PREFIX="Movie:list:"

const getMovieCache = async(key)=>{
    return await getCache(key)
}
const setMovieCache = async(key,data,expiry=300)=>{
    return await setCache(key,data,expiry)
}
const deleteMovieCache = async(key)=>{
    return await deleteCacheByPattern(`${MOVIE_CACHE_PREFIX}*`)
}


module.exports={getMovieCache,setMovieCache,deleteMovieCache}
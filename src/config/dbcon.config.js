const mongoose = require('mongoose');

const Dbconnect = async()=>{
    try {
        const connection = mongoose.connect(process.env.MONGO_URL);
        if(connection){
            console.log("MongoDb is connected succesfully");
            
        }else{
            console.log("MongoDb is not connected");
            
        }
        
    } catch (error) {
        console.log(error.message);
        
    }

}

module.exports=Dbconnect
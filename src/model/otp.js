const mongoose = require('mongoose');
const Schema = mongoose.Schema

const OtpSchema = new Schema({
    userId:{
        type:mongoose.Schema.ObjectId,
        ref:"User",
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now(),
        expires:900
    }
})

const OtpModel = mongoose.model("Otp",OtpSchema);
module.exports=OtpModel
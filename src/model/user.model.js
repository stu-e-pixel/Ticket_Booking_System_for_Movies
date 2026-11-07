const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcryptjs = require('bcryptjs')

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
  },
  phone: {
    type: Number,
    required: [true, "Phone number is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    trim: true,
  },
  role:{
    type:String,
    required:[true,"Role is required"],
    enum:["admin","user"],
  },
  image: {
    type: String,
    required: [true, "url is required"],
    default: "hello.jpg",
  },
  public_id:{
    type:String,
    required:[true,"public_id is required"]
  },
  is_Deleted:{
    type:Boolean,
    default:false
  },
  is_Verified:{
    type:Boolean,
    default:false
  },
  isActive:{
    type:Boolean,
    default:true
  },
  refreshToken:{
    type:String,
    default:null
  },
  status:{
    type:String,
    enum:["active","inactive"],
  },
  secretKey:{
    type:String,
    default:null
  }

});

UserSchema.methods.comparePassword= async function (password){
   return await bcryptjs.compare(password,this.password)
}

const UserModel = mongoose.model('User',UserSchema);
module.exports= UserModel 

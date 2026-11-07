const cloudinary = require('../config/cloudinary.config');
const {createCloudinaryStorage} = require('multer-storage-cloudinary');
const multer = require('multer');


const storage = new createCloudinaryStorage({
    cloudinary:cloudinary,
    params:{
        folder:"uploads",
        allowedformat:["jpg","jpeg","png","gif"],
        public_id:(req,file)=>{
            return `${Date.now}-${file.originalname.split(".")[0]}`
        }
    }
})

const upload = multer({storage:storage});
module.exports=upload
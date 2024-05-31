const mongoose=require("mongoose");

 const userSchema= new mongoose.Schema({

    firstName: {
        type: String,
        required: true,
    },
    secondName: {
        type: String,
        required: true,
    },
    email:{
      type: String,
       required: true,
    },
    mobile:{
        type:Number,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    is_admin:{
        type:Number,
        default:0
    },
    is_verified: {
        type: Number,
        default: 0,
    },
    is_blocked: {
        type: Boolean,
        default: false
    },
    wallet: {
        walletAmount: {
            type: Number,
            default: 0
        },
        walletHistory: [
            {
                type: {
                    type: String

                },
                amount: {
                    type: Number
                },

                date: {
                    type: Date,
                    default: Date.now,
                    required: true
                },
                reason: {
                    type: String
                }
            }
        ]
   }
    
    
 });
 
module.exports=mongoose.model("user",userSchema);

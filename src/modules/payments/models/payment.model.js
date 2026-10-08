import mongoose from "mongoose";

 
 const payment= new mongoose.Schema(
  {
    wallet:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
        required: true,
    },
    razorpay_order_id:{
        type:String,
        required:true
    },
    razorpay_payment_id:{
    type:String,
     default:null
    },
    amount:{
        type:Number,
        required:true,
    },
    status:{
        type:String,
        enum:["pending","success","failed","reversed"],
        default:"pending"
    },
    paymentMethod:{
        type:String,
        enum:["razorpay","upi","netbanking","card"],
        required:true
    },

})
export default mongoose.model("Payment",payment)
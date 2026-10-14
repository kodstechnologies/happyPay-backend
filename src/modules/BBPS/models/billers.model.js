import mongoose from "mongoose";

const biller=new mongoose.Schema({
id:{
    type:String,
    required:true
},
service_name:{
    type:String,
    required:true
},
opcode:{
    type:String,
    required:true
},
service_type:{
    type:String,
    required:true
},
CUSTNO:{
    type:String,
    required:true
},
AMT:{
    type:String,
    required:true
},
REFMOBILENO:{
    type:String,
    required:true
}
})

export default mongoose.model("Biller",biller)
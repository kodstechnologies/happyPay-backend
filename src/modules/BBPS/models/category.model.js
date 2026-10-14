import mongoose  from "mongoose";

const category = new mongoose.Schema({
id:{
    type:String,
    required:true
},
service_name:{
    type:String,
    required:true
},
icon:{
    type:String,
    default:null
}
},{timestamps:true})
 
export default mongoose.model("Category",category)
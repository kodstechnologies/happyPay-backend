import { billercategories, billers } from "../external/services/provider.service";
// this is dummmy file
async function sync(){
    // billers
    // billercategories
    const category=await billercategories()
    console.log("categories",category)

     const biller=await billers()
    console.log("billers",biller)

}
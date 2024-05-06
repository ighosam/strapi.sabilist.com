 module.exports = {
//BEFORE CREATE
  beforeCreate: async ({params})=>{

    const ctx = strapi.requestContext.get()

    //get ctx instance

    //add author before create
    //the if condition is necessary because of admin ui
    if(params.data.author = undefined){
       params.data.author = ctx.state.user.id
    }
  
   
  },
  //END OF BEFORE CREATE
  //=====================

//BEFORE DELETE
  beforeDelete: async({params})=>{
    
 //get ctx instance
 const ctx = strapi.requestContext.get()

 //fetch images associated with the file 
 //that is about to be deleted and removed all
 //images from upload file.
 let {model,id} = ctx.params 

//properly defined model
if(model == undefined){
  let handler = ctx.state.route.handler
  model = handler.substring(0, handler.lastIndexOf("."));
}
 //properly defined file id
/*
if(id == undefined){
  id = ctx.request.params.id
}
*/
//fetch file from server with the images using the file id
    const res = await strapi.entityService.findMany(model,{
      filters:{
      id: id
    },
     populate:['photo']
})

let images = res[0].photo
  //delete all images

  images?.map(item=>{
    strapi.plugins['upload'].services.upload.remove(item)
  })

  },

  //END OF BEFORE DELETE
  //=====================

  //BEFORE UPDATE
  beforeUpdate: async ({params})=>{
    const ctx = strapi.requestContext.get()
    let {model,id} = ctx.params 

//properly defined model
if(model == undefined){
  let handler = ctx.state.route.handler
  model = handler.substring(0, handler.lastIndexOf("."));
}

 //properly defined file id
/*
if(id == undefined){
  id = ctx.request.params.id
}
*/
//fetch file from server with the images using the file id
    const res = await strapi.entityService.findMany(model,{
      filters:{
      id: id
    },
     populate:['photo']
})

let server_images = res[0].photo

let currentImages = params.data['currentImages'] != undefined ? params.data['currentImages'] : params.data['photo']

//modify params remove currentImages, which was added 
//as control data to help delete images from server that is not needed
  if(params.data['currentImages'] != undefined)
  {
    const {currentImages,...rest} = params.data
    params.data = rest
  }

//get all names of images to save in server after update
const imageNames = currentImages?.map(item=>item.name)

//delete all other files in the server that the name 
//cannot be found in imageNames array.
server_images?.map(item=>{

  if(!imageNames?.includes(item.name)){
    //delete item from upload folder
    strapi.plugins['upload'].services.upload.remove(item)
  }
})   
  }
  //END OF BEFORE UPDATE
  //====================
}


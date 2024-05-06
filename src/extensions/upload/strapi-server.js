const koaStatic = require("koa-static");
const { defaultsDeep } = require("lodash/fp");
//const { getService } = require("@strapi/plugin-users-permissions/server/utils");
const defaults = {
  maxAge: 60000,
  defaultIndex: true,
};

//const { toPlainObject } = require('lodash/fp');

module.exports = (plugin, config) => {

  //File id followed by the product id is provided in the params section.
  const { defaultIndex, maxAge } = defaultsDeep(defaults, config);


 let file = ''

  plugin.controllers['content-api'].destroy = async (ctx) =>{ 
    file = await strapi.plugins['upload'].services.upload.findMany({
      filters:{
            id:ctx.params.id
       },
       //populate: ['related']
     })
     /*
     if(file[0].related.length < 1){
      ctx.throw(400,"Can't associted file that the image is attached to")
    }
    //store the content type and content type id in variables
    const user_type = 'plugin::users-permissions.user' 
    const content_type = file[0].related[0].__type
    const content_id = file[0].related[0].id
    */
    //=======================
  

    //use the content_type service to delete the file.
    strapi.plugins['upload'].services.upload.remove(file[0])
    return
  }

  ///////////////////

  strapi.server.routes([
    {
      method: "POST",
      path: '/api/upload',
      handler: koaStatic(strapi.dirs.static.public,  {
        
        maxage: maxAge,
        defer: true,
      }),
      config: {
        auth: false,
        middlewares: [
          async (ctx, next) => {

            //console.log(ctx.request.body)
            /*
            By declearing userData and contentData up here

            */

  //user's information owned by user only allowed one avatar pic
  //cover is the table name the picture is stored in the database
           const userData = {
             //owner: 'user',
             owner: '', //no content to own, this is the loggedin user info
             cover: 'avatar',
             maxUpload: 1
           }

//content information owned by author allowed only 4 pics, cover is photo
//cover is the key word that the picture is stored in the data base
           const contentData ={
             owner: 'author',
             cover: 'photo',
             maxUpload: 4
           }
            //========================
            //get the content owner infor based on the ref from the data base
            //if ref 'plugin::users-permissions.user' or other (content type)
           const getContentOwner = (ref)=>{
            return ref === 'plugin::users-permissions.user' ? userData : contentData
           }
            //========================
         

            //get the content id from the upload input
          const content_id = ctx.request.body.refId
          
         
            //get the token from the upload input 
          const content_type = ctx.request.body.ref 
           const token = ctx.request.header.authorization

          
            //separate the Bearer from the token
           const jwt = token.split(" ")
           //get id (user_id) from the code line below.
           let {id:user_id} = await strapi.plugins["users-permissions"].services.jwt.verify(jwt[1]);

           
         /*
         get data owner information based on the content_type
         if content type is: "plugin::userpermissions.user",
         there is no content to be owned, this is the loggedin user info
        */
          const ownerInfo = getContentOwner(content_type)

        
           const entity = await strapi.db.query(content_type).findOne({
            where: { id: content_id },
            populate: [ownerInfo.owner,ownerInfo.cover] ,

          });
             if(!entity){
               ctx.throw(400,"Can't find file to adde image")
             }


          
     //check if images attached to file is null, replace null with zero          
    const existingImages = entity[ownerInfo.cover] === null ? 0 : entity[ownerInfo.cover].length

    console.log("I prove you wrong: ",existingImages)
//if existing images is maxed throw error else continue through the code
         existingImages >= ownerInfo.maxUpload && ctx.throw(400,"Your upload is maxed")
          /*
          //you can also use eval in this manner
          return eval(`entity.${ownerInfo.owner}.id`) === user_id ? next(): ctx.throw(400,"permission denied again");
          */
           //logged in user = user_id, content owner = entity[ownerInfo.owner].id

            /*
           if the data owner is '', it means it is just the user info return entity
           if the data owner is not '', therefore it is a content_type owner
           entity[ownerInfo.owner] should return author information.
          */
          const dataOwner = ownerInfo.owner === '' ? entity : entity[ownerInfo.owner]

          /*
          return entity[ownerInfo.owner].id === user_id ? next(): ctx.throw(400,"permission denied")
           */
         
          return dataOwner.id === user_id ? next(): ctx.throw(400,"permission denied")
          
          },
          
        ]
      },
    },

    {
      method: "DELETE",
      path: '/api/upload/files/:id',
      handler: koaStatic(strapi.dirs.static.public,  {
        maxage: maxAge,
        defer: true,
      }),
      config: {
        auth: false,
        
        middlewares: [
           
          async (ctx, next) => {

            
       
            //=======================
            //search upload files with related content type
            //use findMany and populate related. findOne will work as well.
           
            file = await strapi.plugins['upload'].services.upload.findMany({
             filters:{
                   id:ctx.params.id
              },
              populate: ['related']
            })
             
            if(!file[0]['related'][0]){
              ctx.throw(400,"Can't associted file that the image is attached to")
            }
           
            
            //store the content type and content type id in variables
            const user_type = 'plugin::users-permissions.user' 
            const content_type = file[0]['related'][0].__type
            const content_id = file[0]['related'][0].id
            //=======================
            

         
         
          //get the token from the upload input        
         const token = ctx.request.header.authorization
          //separate the Bearer from the token
         const jwt = token.split(" ")
         //get id (user_id) from the code line below.
          let {id:user_id} = await strapi.plugins["users-permissions"].services.jwt.verify(jwt[1]);
         //search for upload based on product id.
         
         /*
          if the content_type is of type user_type
          the data is same as user info
          no need to search for content owner,
          the content is of the owner.
          else the content owner has to be author.
         */
         let owner = ''

         if(content_type == user_type){
         return user_id === content_id ? next(): ctx.throw(400,"permission denied")
         } else{
           owner = 'author'
         }

    

         const entity = await strapi.db.query(content_type).findOne({
          where: { id: content_id },
          populate: [owner],
        }); 

          if(!entity){
            ctx.throw(400,"Unable to find file the image is attached to")
          }

        return entity[owner].id === user_id ? next(): ctx.throw(400,"permission denied");
        
          }
          
          
        ]
        
      }
    },
    //// START OF GET ////////////
  /*
    {
     //////////
     method: "GET",
      path: '/api/upload/files/:id',
      handler: koaStatic(strapi.dirs.static.public,  {
        maxage: maxAge,
        defer: true,
      }),
      config: {
        auth: false,
        
        middlewares: [
           
          async (ctx, next) => {
            file = await strapi.plugins['upload'].services.upload.findMany({
              filters:{
                    id:ctx.params.id
               },
               populate: ['related']
             })

             //check if no ctx or place this code below in try and catch
             let user_id
          try{
          const token = ctx.request.header.authorization
          const jwt = token.split(" ")
         //get id (user_id) from the code line below.
         const {id} = await strapi.plugins["users-permissions"].services.jwt.verify(jwt[1]);
            user_id = id
         //search for upload based on product id.
          }catch{
            ctx.badRequest("there was an error")
          }

          if(!file[0]['related'][0]){
            ctx.throw(400,"Can't find associted file that the image is attached to")
          }
          
          const owner_id = file[0]['related'][0].id

          return owner_id === user_id ? next(): ctx.throw(400,"permission denied");
             
            
          }
        ]
      }
     ///////////////
    }
    */
    /////////////End of GET ///////////////
  ]);


  //////////////////////


return plugin

}
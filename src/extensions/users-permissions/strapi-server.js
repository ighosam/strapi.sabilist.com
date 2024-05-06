'use strict';
//const crypto = require('crypto');
const _ = require("lodash");
//generate refreshtoken
const generateRefreshToken = async (user) => {
  //get unsanitized user
  const users = await strapi.query('plugin::users-permissions.user').findOne({ where: {email: user.email} }) 
 return strapi.plugins["users-permissions"].services.jwt.issue(
    {
      tkv: users.tokenVersion, // Token Version
    },
    {
      subject: users.id.toString(),
      expiresIn: "1d",
    }
  );
  
}
//===============================
module.exports = (plugin) => {

  const sanitizeOutput = (user) => {
    const {
    password, resetPasswordToken, confirmationToken,tokenVersion,provider, ...sanitizedUser
    } = user; // be careful, you need to omit other private attributes yourself
    return sanitizedUser;
    };

  //save old controller before overwirte
const old_resetPassword = plugin.controllers.auth.resetPassword
const old_register = plugin.controllers.auth.register
const old_callback = plugin.controllers.auth.callback
const old_emailConfirmation = plugin.controllers.auth.emailConfirmation
const old_me = plugin.controllers.user.me


  plugin.controllers.auth.refreshToken = async (ctx) => {
   //const params =  _.assign(ctx.request.body)
   const params = ctx.request.body

   let refreshCookie = await ctx.cookies.get("refreshToken")
   let refreshToken = ctx.request.body.token


 if (!refreshCookie && !refreshToken) {
  return ctx.badRequest("No Authorization");
}
 if (!refreshCookie) {
  if (refreshToken) {
      refreshCookie = refreshToken
  }
  else {
      return ctx.badRequest("No Authorization");
  }
 }

  // Params should consist of:
  // * token - string - jwt refresh token
  // * renew - boolean - if true, also return an updated refresh token.
  // Parse Token
  try {
    // Unpack refresh token
    const {tkv, iat, exp, sub} = await strapi.plugins["users-permissions"].services.jwt.verify(refreshToken);

   
    // Check if refresh token has expired
    if (Date.now() / 1000 > exp) return ctx.badRequest(null, "Expired refresh token");
    // fetch user based on subject
    const user = await strapi.query('plugin::users-permissions.user').findOne({ where: {id:sub} });
    // Check here if user token version is the same as in refresh token
    // This will ensure that the refresh token hasn't been made invalid by a password change or similar.

   
    
    if (tkv !== user.tokenVersion){
      //it means someone with invalid token trying
      //to refresh for an access token; invalidate present token
      await strapi.query('plugin::users-permissions.user').update({ where: {id:sub}, data: {tokenVersion:  user.tokenVersion + 1  } } );
      return ctx.badRequest(null, "Refresh token is invalid");
    } 


    // Otherwise we are good to go.

    /*
    invalidate old refresh token before creating a new one
    */
    
    // Update the token version for the user.
    //prior to creating a refresh to invalidate old
    // refresh token
    await strapi.query('plugin::users-permissions.user').update({ where: {id:sub}, data: {tokenVersion:  user.tokenVersion + 1  } } );
   //////////////////////////////////////////////

   const refresh = await generateRefreshToken(user)
/*
   ctx.cookies.set('refreshToken',refresh,{
    httpOnly:true,
    secure:false,
    signed:true,
    overwrite:true
   })
*/
    ctx.send({
      //issue a jwt access token
      jwt: strapi.plugins["users-permissions"].services.jwt.issue({
        id: user.id,
      }),
      //issue a refresh token needed by login user to request an access token
      //refresh: params.renew ? generateRefreshToken(user) : null
      refresh
    });
  } catch (e) {
    return ctx.badRequest(null, "Invalid token");
  }
  
};

//code to revoke token
//=====================
plugin.controllers.auth.revokeToken = async (ctx) => {

  const params = _.assign(ctx.request.body);

  let refreshCookie = await ctx.cookies.get("refreshToken")
  let {token:refreshToken} = ctx.request.body

if (!refreshCookie && !refreshToken) {
 return ctx.badRequest("No Authorization");
}
if (!refreshCookie) {
 if (refreshToken) {
     refreshCookie = refreshToken
 }
 else {
     return ctx.badRequest("No Authorization");
 }
}

  // Params should consist of:
  // * token - string - jwt refresh token
  // Parse Token
  try {
    // Unpack refresh token
    const {tkv, iat, exp, sub} = await strapi.plugins["users-permissions"].services.jwt.verify(refreshToken);

    
    // Check if refresh token has expired
    if (Date.now() / 1000 > exp) return ctx.badRequest(null, "Expired refresh token");
    // fetch user based on subject
    //const user = await strapi.query("user", "users-permissions").findOne({ id: sub });
    const user = await strapi.query('plugin::users-permissions.user').findOne({ where: {id:sub} });
    // Check here if user token version is the same as in refresh token
    // This will ensure that the refresh token hasn't been made invalid by a password change or similar.
   
    if (tkv !== user.tokenVersion){
      //if the token version deffers from the user token version
      //invalidate the user token version.
      await strapi.query('plugin::users-permissions.user').update({ where: {id:sub}, data: {tokenVersion:  user.tokenVersion + 1  } } );
      return ctx.badRequest(null, "Refresh token is invalid");
    } 
    // Update the token version for the user.
    await strapi.query('plugin::users-permissions.user').update({ where: {id:sub}, data: {tokenVersion:  user.tokenVersion + 1  } } );
    // Otherwise we are good to go.
    ctx.send({
      confirmed: true,
    });
  } catch (e) {
    return ctx.badRequest(null, "Invalid token");
  }
  };
  //End of Revoke
  //=================
  //Call back function.

  plugin.controllers.auth.callback = async (ctx) =>{
  
    //const refreshToken = await ctx.cookies.get("refreshToken")
    //call old callback
    await old_callback(ctx)
    //change the output, some how the output still get change
      const { jwt,user } = ctx.body   
    const refresh = await generateRefreshToken(user)
   
    /*
     ctx.cookies.set('refreshToken',refresh,{
      httpOnly:true,
      secure:false,
      signed:true,
      overwrite:true
     })
*/
     
      ctx.body = {
        jwt,
        user,
        refresh
      }  
      
      
} 
//End of Callback
//code to reset password
plugin.controllers.auth.resetPassword = async (ctx) =>{
  const params = _.assign(ctx.request.body);

  let refreshCookie = await ctx.cookies.get("refreshToken")
  let {token:refreshToken} = ctx.request.body

  if (!refreshCookie && !refreshToken) {
    return ctx.badRequest("No Authorization");
   }
   if (!refreshCookie) {
    if (refreshToken) {
        refreshCookie = refreshToken
    }
    else {
        return ctx.badRequest("No Authorization");
    }
   }

  await old_resetPassword(ctx)
  try{
    const {tkv, iat, exp, sub} = await strapi.plugins["users-permissions"].services.jwt.verify(refreshCookie);
    ////////////////
    const user = await strapi.query('plugin::users-permissions.user').findOne({ where: {id:sub} });
    ///////////////////

    await strapi.query('plugin::users-permissions.user').update({ where: {id:sub}, data: {tokenVersion:  user.tokenVersion + 1  } } );
  }catch(e){
    return ctx.badRequest(null, "Error");
  }
},
//End of Reset PassWord
//=======================
//Register
//=========
plugin.controllers.auth.register = async (ctx) =>{
  await old_register(ctx)
  const { jwt,user } = ctx.body
  const refresh = await generateRefreshToken(user)

  console.log("Token: ",refresh)

/*
  ctx.cookies.set('refreshToken',refresh,{
    httpOnly:true,
    secure:false,
    signed:true,
    overwrite:true
   })
*/
    ctx.body = {
      jwt,
      user,
      refresh
    }
},
//End of Register
//=================
//Email confirmation
//==================
/*
I DON'T KNOW WHY I AM GENERATING TOKEN AND REFRESH
WHEN THERE IS AN EMAIL CONFIRMATION
*/
plugin.controllers.auth.emailConfirmation = async (ctx, next, returnUser) =>{

     await old_emailConfirmation(ctx)
     const { jwt,user } = ctx.body
  const refresh = generateRefreshToken(user)
 /*
  ctx.cookies.set('refreshToken',refresh,{
    httpOnly:true,
    secure:false,
    signed:true,
    overwrite:true
   })
   */

    ctx.body = {
      jwt,
      user,
      refresh
    }   
},

plugin.controllers.user.updateMe = (ctx) => {
  
  //create params id from ctx.state to use with regular user.update
  ctx.params.id = ctx.state.user.id;

//distructure allowed data to update here
  const {displayName,newsletter} = ctx.request.body

  //hesre we use es6/es7 displayName:displayName,newsletter:newsletter
  //add data variables to object that will be allowed to update
  const updateData = {
    displayName,
    newsletter 
  }

  //remove properties from update object that are undefined
  //(not submitted by the user in the PUT request.)
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key])
  if(Object.keys(updateData).length == 0){
    return ctx.badRequest("No data submitted")
  }
  
  //place updateData now inside ctx.request.body
  ctx.request.body = updateData
 
  //only allow only some area of the data
  return plugin.controllers.user.update(ctx)
}

//This controller was added to give better user expirience
//so we can know if an email already exist during signup.
plugin.controllers.user.emailExist = async (ctx) => {
//console.log(ctx.request.body.email)

  const searchedUser = await strapi.query('plugin::users-permissions.user').findOne({ where: {email: ctx.request.body.email} })

//console.log(searchedUser.email == ctx.request.body.email)

if(searchedUser == undefined){
  return false
}
return true
//return searchedUser.email == ctx.request.body.email
}

//======================================
//This controller was added to give better user expirience
//so we can know if an email already exist during signup.
plugin.controllers.user.usernameExist = async (ctx) => {
  //console.log(ctx.request.body.email)
    const searchedUser = await strapi.query('plugin::users-permissions.user').findOne({ where: {username: ctx.request.body.uname} })
 
  if(searchedUser == undefined){
    return false
  }
  return true
//
  }

//====================================


plugin.controllers.user.me = async (ctx) => {
   
  //return
 //await old_me(ctx)
 const user = await strapi.query('plugin::users-permissions.user').findOne(
  {
  where: {id: ctx.state.user.id },
   populate: ['avatar'] 
  }
 
  )
 
  
  ctx.body = sanitizeOutput(user)
  //console.log(ctx.body)

}
//==========================


//========================================
plugin.routes['content-api'].routes.push(
  {
  method: 'POST',
  path: '/auth/refreshToken',
  handler: 'auth.refreshToken',
  config: { 
    prefix: ''
  }  
},

{
  method: 'POST',
  path: '/auth/revokeToken',
  handler: 'auth.revokeToken',
  config: {
    prefix: ''
  }
},

{
 method: 'PUT',
 path: '/user/updateme',
 handler: 'user.updateMe',
 config: {
  prefix: ''
}
},

{
  method: 'POST',
  path: '/user/emailExist',
  handler: 'user.emailExist',
  config: {
   prefix: ''
 }
 },

 {
  method: 'POST',
  path: '/user/usernameExist',
  handler: 'user.usernameExist',
  config: {
   prefix: ''
 }
 },

)
 
//===================   
 return plugin
}
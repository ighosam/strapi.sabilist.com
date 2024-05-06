'use strict'
// path: .src/api/[api-name]/policies/my-policy.js

module.exports = async (policyContext, config, { strapi }) => {
 
  if (policyContext.type === 'koa') {
    // Do REST validation

      const entity = await strapi.db.query('api::hotel.hotel').findOne({
        where: { id: policyContext.params.id },
        populate: { author: true },
      });    
      return entity.author.id === policyContext.state.user.id; 
 
  }
  // handle GraphQL
  else if (policyContext.type === 'graphql') {
   
    // Do GraphQL validation
      const entity = await strapi.db.query('api::product.product').findOne({
        where: { id: policyContext.args.id },
        populate: { author: true },
      });
      return entity.author.id === policyContext.state.user.id;
  }
  


  // handle other cases
  return false;

}
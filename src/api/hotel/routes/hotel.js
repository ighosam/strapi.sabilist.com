'use strict';

/**
 * hotel router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::hotel.hotel',{
  only: ['update','delete','findOne','find','create'],
  config: {
    update:{
      policies:['is-owner']
    },
    delete:{

      policies:['is-owner']
    },
    find:{},
    findOne:{},
    create:{}, 


  }
  



});

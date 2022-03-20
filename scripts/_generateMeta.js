'use strict';

const fs = require('fs');
const ethers = require('ethers');

let groupIndex = 0;
let supplyCap = 10000;
for(let tokenIndex = 1; tokenIndex <= supplyCap; tokenIndex++){
  let obj = {
    id:`${tokenIndex}`,
    name:`OpShop Test Item ${tokenIndex}`,
    image:"ipfs://QmXKHCtmHxdo1FLYH8UgMXVMQ2WazC8eY3wjEbmCnbTSuS",
    external_url:"https://opshop.pages.dev",
    description:`OpShop Test Item for Rinkeby Test Network`,
    attributes:[
      {
        trait_type:"ID",
        value:`${tokenIndex}`
      },{
        trait_type:"Index",
        value:tokenIndex
      },{
        trait_type:"Network",
        value:"Rinkeby"
      },{
        display_type: "number",
        trait_type: "Test Round",
        value: 1
      }
    ]
  };
  console.log("obj", obj);
  let data = JSON.stringify(obj, null, 2);
  fs.writeFileSync(`art/meta/${tokenIndex}.json`, data);
}

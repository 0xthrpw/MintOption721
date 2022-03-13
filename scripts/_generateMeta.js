'use strict';

const fs = require('fs');
const ethers = require('ethers');

let groupIndex = 0;
let supplyCap = 100;
for(let tokenIndex = 1; tokenIndex <= supplyCap; tokenIndex++){
  // let prepTokenId = ethers.BigNumber.from(groupIndex).add(tokenIndex);
  // let tokenId = ethers.utils.hexConcat(ethers.utils.zeroPad(prepTokenId, 8));

  // let degeneracy = ["Lurking", "All In", "Veteran", "Rekt"];
  // let species = ["Ape", "Sheep", "Snake", "Wolf"];
  // let depth = ["Gone", "Hanging by a thread", "Still there", "Slipping away"];
  // let conviction = ["Radical", "Flimsy", "Absent", "Solid"];

  // let formattedID = ethers.BigNumber.from(tokenId.toString());
  let obj = {
    id:`${tokenIndex}`,
    image:"ipfs://QmNNpHAsGon8T5DnY4x1iKSZj4QiKNQjafdACnKjMHeGmc",
    external_url:"thrpw.eth.link",
    description:`Get equipped with Item 1 `,
    attributes:[
      {
        trait_type:"ID",
        value:`${tokenIndex}`
      },{
        trait_type:"Index",
        value:tokenIndex
      },{
        display_type: "number",
        trait_type: "Item",
        value: 1
      }
    ]
  };
  console.log("obj", obj);
  let data = JSON.stringify(obj, null, 2);
  fs.writeFileSync(`art/meta/${tokenIndex}.json`, data);
}

// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.11;

import '@openzeppelin/contracts/utils/Strings.sol';

library NFTSVG {
  using Strings for uint256;

  struct SVGParams {
    uint256 tokenId;
    uint256 block;
    address owner;
  }

  function generateSVG(SVGParams memory params) internal view returns (string memory svg) {
    return
      string(
        abi.encodePacked(
          '<svg version="1.1" width="1000" height="1000" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
          '<rect width="1000" height="1000" x="0" y="0" fill="black" />',
          _generateSVGPaths(params),
          '</svg>'
        )
      );
  }

  function _generateSVGPaths(SVGParams memory params) private view returns (string memory svgPaths) {
    string memory svgPaths;

    uint256 pos_x;
    uint256 pos_y;
    uint256 w = 20;
    ( , string memory base ) = idToColor(params.tokenId, params.tokenId + 1, params.owner);

    for(uint256 r = 0; r < 8; ++r){
      pos_x = 0;
      for(uint256 c = 0; c < 8; ++c){
        ( uint256 duration, string memory rgb ) = idToColor(params.tokenId, r*c+pos_x*pos_y*pos_y+pos_x+r, params.owner);
        //( uint256 duration2, string memory rgb2 ) = idToColor(params.tokenId, r*c+duration, params.owner);
        string memory pattern = string(abi.encodePacked(base, rgb, base, 'rgb(0,0,0);'));
        svgPaths = string(abi.encodePacked(
          svgPaths,
          '<rect width="20" height="20" x="',
          pos_x.toString(),
          '" y="',
          pos_y.toString(),
          '" style="stroke-width:3;stroke:rgb(0,0,0)">',
          '<animateTransform attributeName="transform" type="scale" from="0.1" to="7.9" dur="',
          (duration + c).toString(),
          's" repeatCount="indefinite" />'
          '<animate attributeName="fill" values="',
          pattern,
          '" dur="',
          (duration + c).toString(),
          's" repeatCount="indefinite" />'
          '</rect>'
        ));
        pos_x = pos_x + w;
      }
      pos_y = pos_y + w;
    }

    return svgPaths;
  }

  function idToColor(uint256 _id, uint256 _cell, address _owner) public view returns (uint256, string memory) {
    uint256 seed = uint256(keccak256(abi.encodePacked(_id, _owner, _cell, address(this))));

    uint256 firstChunk = seed % 256;
    uint256 secondChunk = ((seed - firstChunk) / 256) % 256;
    uint256 thirdChunk = ((((seed- firstChunk) / 256) - secondChunk ) / 256) % 256;

    string memory rgbString = string(abi.encodePacked(
      'rgb(',
      firstChunk.toString(),
      ', ',
      secondChunk.toString(),
      ', ',
      thirdChunk.toString(),
      ');'
    ));

    if(thirdChunk > secondChunk){
      if(thirdChunk - secondChunk < 10){
        rgbString = string(abi.encodePacked('rgb(0,0,255);'));
      }
    }

    firstChunk = 256 - firstChunk;

    return (10 + (firstChunk * firstChunk % 64), rgbString);
   }
}

// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.11;

import '@openzeppelin/contracts/utils/Strings.sol';

library NFTSVG {
  using Strings for uint256;

  struct SVGParams {
    uint256 tokenId;
    uint256 exercisable;
    address owner;
    address item;
    string itemName;
  }

  function generateSVG(SVGParams memory params) internal view returns (string memory svg) {
    return
      string(
        abi.encodePacked(
          '<svg version="1.1" width="1000" height="1000" viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
          _generateSVGPaths(params),
          '</svg>'
        )
      );
  }

  function _parseRemTime(uint256 _timestamp) private view returns (string memory remaining) {
    (_timestamp > block.timestamp) ? (_timestamp - block.timestamp) / 3600 : 0;
    uint256 remainingSec = 0;
    uint256 remainingMin = 0;
    uint256 remainingHour = 0;
    uint256 remainingDay = 0;
    
    if(_timestamp > block.timestamp){
      uint256 diff = _timestamp - block.timestamp;
      remainingSec = diff % 60;
      diff = diff - remainingSec;
      remainingMin = diff % 3600 / 60;
      diff = diff - (diff % 3600);
      remainingHour = diff % 86400 / 3600;
      diff = diff - diff % 86400;
      remainingDay = diff / 86400;
    }

    return string(abi.encodePacked(
      remainingDay.toString(),
      'd ',
      remainingHour.toString(),
      'h ',
      remainingMin.toString(),
      'm ',
      remainingSec.toString(),
      's '
    ));
  }

  function _generateSVGPaths(SVGParams memory params) private view returns (string memory svgPaths) {
    string memory svgPaths;
    string memory remaining = _parseRemTime(params.exercisable);
    uint256 owner = uint256(uint160(params.owner));

    svgPaths = string(abi.encodePacked(
      '<rect width="480" height="480" x="0" y="0" fill="white"  /><rect width="480" height="480" x="0" y="0" fill="url(#back)"  /><rect width="360" height="460" x="60" y="10" fill="black" opacity=".7" /><text x="80" y="40" font-family="monospace" fill="white">Mint Option #',
      params.tokenId.toString(),
      '</text>'
    ));

    svgPaths = string(abi.encodePacked(
      svgPaths,
      '<text x="80" y="55" font-family="monospace" fill="white">Collection: ',
      params.itemName,
      '</text>'
    ));

    svgPaths = string(abi.encodePacked(
      svgPaths,
      '<text x="80" y="90" font-family="monospace" fill="white">Owner: </text><text x="80" y="105" font-family="monospace" fill="white">',
      owner.toHexString(),
      '</text><text x="80" y="135" font-family="monospace" fill="white">Exercisable: </text><text x="80" y="150" font-family="monospace" fill="white">',
      params.exercisable.toString(),
      '</text><text x="80" y="180" font-family="monospace" fill="white">Remaining: </text><text x="80" y="195" font-family="monospace" fill="white">',
      remaining,
      '</text>'
    ));

    svgPaths = string(abi.encodePacked(
      svgPaths,
      '<defs><linearGradient id="back" x1="100%" y1="100%"><stop offset="0%" stop-color="green" stop-opacity=".5"><animate attributeName="stop-color" values="green;blue;red;red;pink;red;red;purple;green" dur="60s" repeatCount="indefinite" /></stop><stop offset="100%" stop-color="lightblue" stop-opacity=".5"><animate attributeName="stop-color" values="orange;purple;purple;orange;purple;purple;blue;lightblue;orange" dur="60s" repeatCount="indefinite" /><animate attributeName="offset" values=".95;.80;.60;.40;.20;0;.20;.40;.60;.80;.95" dur="60s" repeatCount="indefinite" /></stop></linearGradient></defs>'
    ));

    return svgPaths;
  }
}

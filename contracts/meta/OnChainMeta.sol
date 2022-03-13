// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Strings.sol";
import 'base64-sol/base64.sol';
import './NFTSVG.sol';

contract OnChainMeta {
    using Strings for uint256;

    /// @dev A mask for isolating an item's group ID.
    uint256 private constant GROUP_MASK = uint256(type(uint128).max) << 128;

    function _buildMeta(
      uint256 _tokenId,
      uint256 _exercisable,
      address _owner,
      address _itemForOption,
      string memory _itemForOptionName
    ) internal view returns (string memory) {

      NFTSVG.SVGParams memory svgParams =
        NFTSVG.SVGParams({
          tokenId: _tokenId,
          exercisable: _exercisable,
          owner: _owner,
          item: _itemForOption,
          itemName: _itemForOptionName
        });

      string memory imageDat = string(abi.encodePacked(
        '{"name":"',
           _buildName(_tokenId, _itemForOption),
          '",',
          '"description":"',
             _itemForOptionName,
          '",',
          '"image":"',
          'data:image/svg+xml;base64,',
            Base64.encode(bytes(NFTSVG.generateSVG(svgParams))),
          '", "attributes":[',
             _getMetadata(svgParams),
          ']',
        '}')
      );

      string memory image = string(abi.encodePacked(
        'data:application/json;base64,',
        Base64.encode(bytes(imageDat))
      ));

      return image;
    }

    function _buildName(
      uint256 _tokenId,
      address _itemForOption
    ) internal pure returns (string memory) {
      uint256 groupId = (_tokenId & GROUP_MASK) >> 128;
      uint256 id = _tokenId << 128 >> 128;
      uint256 itemContract = uint256(uint160(_itemForOption));
      return string(abi.encodePacked(
        groupId.toString(),
        "-",
        id.toString(),
        "-",
        itemContract.toHexString()
      ));
    }

    function _getMetadata(
      NFTSVG.SVGParams memory _params
      // uint256 _tokenId,
      // uint256 _exercisable,
      // address _itemForOption,
      // string memory _itemForOptionName
    ) internal pure returns (string memory) {
      uint256 groupId = (_params.tokenId & GROUP_MASK) >> 128;
      uint256 id = _params.tokenId << 128 >> 128;
      uint256 itemContract = uint256(uint160(_params.item));
      string memory metadata = string(abi.encodePacked(
        //_wrapTrait("Generation", groupId.toString()),',',
        _wrapTrait("Option ID", id.toString()),',',
        _wrapTrait("Exercisable", _params.exercisable.toString()),',',
        _wrapTrait("Item Name", _params.itemName),',',
        _wrapTrait("Item Contract", itemContract.toHexString())
      ));

      return metadata;
    }

    function _wrapTrait(
      string memory trait,
      string memory value
    ) internal pure returns(string memory) {
        return string(abi.encodePacked(
            '{"trait_type":"',
            trait,
            '","value":"',
            value,
            '"}'
        ));
    }

    // function _generateSVGImage(
    //   NFTSVG.SVGParams memory _params
    // ) internal view returns (string memory svg) {
    //   return NFTSVG.generateSVG(_params);
    // }
}

// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/ITiny721.sol";

error CannotUnderpayForMint();
error RefundTransferFailed();
error ZeroTermConfig();

/**

*/
contract MintOption721 is Ownable, ReentrancyGuard {

  address public paymentReceiver;

  address public option;

  address public item;

  struct Config {
    uint256 startTime;
    uint256 basicPrice;
    uint256 minPrice;
    uint256 discountPerTermUnit;
    uint256 termUnit;
  }

  /// roundId > configuration struct
  mapping(uint256 => Config) public configs;

  /// roundId > tokenId > timestamp
  mapping(uint256 => mapping(uint256 => uint256)) public claimStamps;

  /// roundId > tokenId > claimed flag
  mapping(uint256 => mapping(uint256 => bool)) public claimed;

  constructor(
    address _item,
    address _option,
    address _paymentReceiver
  ) {
    item = _item;
    option = _option;
    paymentReceiver = _paymentReceiver;
  }

  /**

  */
  function setConfig (uint256 _roundId, Config memory _config) external onlyOwner {
    configs[_roundId] = _config;
  }

  /**

  */
  function purchase (
    uint256 _roundId,
    uint256 _termLength,
    uint256 _amount
  ) external payable nonReentrant {
    uint256 price;
    uint256 claimStamp = block.timestamp;

    Config memory config = configs[_roundId];
    if( config.termUnit == 0 ){ revert ZeroTermConfig(); }

    // User is minting with lockup for a discount
    if(_termLength > 0){
      uint256 discount = _termLength * config.termUnit * config.discountPerTermUnit;

      price = (config.minPrice + discount > config.basicPrice)
        ? config.minPrice
        : config.basicPrice - discount ;

      claimStamp = block.timestamp + ( _termLength * config.termUnit );

    // No lock, no discount.
    }else{
      price = config.basicPrice;
    }

    uint256 totalCharge = price * _amount;

    // Reject the purchase if the caller is underpaying.
    if (msg.value < totalCharge) { revert CannotUnderpayForMint(); }

    // Refund the caller's excess payment if they overpaid.
    if (msg.value > totalCharge) {
      uint256 excess = msg.value - totalCharge;
      (bool returned, ) = payable(_msgSender()).call{ value: excess }("");
      if (!returned) { revert RefundTransferFailed(); }
    }

    //set claim

  }

  /**

  */
  function claim () external {

  }

}

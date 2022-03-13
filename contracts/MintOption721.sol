// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/ITiny721.sol";

error AmountGreaterThanRemaining();
error CannotUnderpayForMint();
error RefundTransferFailed();
error NotExercisableYet();
error NotOptionOwner();
error OptionAlreadyExercised();
error SweepingTransferFailed();
error ZeroPriceConfig();
error ZeroPricePurchase();

interface IOption721 {
  function mintOpt( uint256 amount, uint256 claimStamp, address recipient ) external;
  function transferFrom( address from, address to, uint256 tokenId ) external;
  function exercisable( uint256 tokenId ) external returns ( uint256 );
  function ownerOf( uint256 id ) external returns ( address );
}

interface IERC20 {
  function safeTransfer( address _destination, uint256 _amount ) external;
}
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
    bool syncSupply;
  }

  uint256 public sellableCount;

  /// roundId > configuration struct
  mapping(uint256 => Config) public configs;

  /// tokenId > claimed flag
  mapping(uint256 => bool) public exercised;

  constructor(
    address _item,
    address _option,
    address _paymentReceiver,
    uint256 _sellableCount
  ) {
    item = _item;
    option = _option;
    paymentReceiver = _paymentReceiver;
    sellableCount = _sellableCount;
  }

  event Exercised(
    uint256 indexed tokenId,
    address indexed user
  );

  /**

  */
  function setConfig (uint256 _roundId, Config memory _config) external onlyOwner {
    configs[_roundId] = _config;
  }

  /**

  */
  function purchaseOption (
    uint256 _roundId,
    uint256 _termLength,
    uint256 _amount
  ) external payable nonReentrant {
    Config memory config = configs[_roundId];

    if( config.basicPrice == 0 || config.minPrice == 0){ revert ZeroPricePurchase(); }

    // Calculate the option discount.
    uint256 discount = _termLength * config.termUnit * config.discountPerTermUnit;

    // Check if price has broken minimum price threshold.
    uint256 price = (config.minPrice + discount > config.basicPrice)
      ? config.minPrice
      : config.basicPrice - discount ;

    // Calculate the timestamp of when the option becomes exercisable.
    uint256 claimStamp = block.timestamp + ( _termLength * config.termUnit );

    // Calculate the total cost of this purchase.
    uint256 totalCharge = price * _amount;

    //
    if( config.syncSupply ){
      if( _amount > sellableCount ){
        revert AmountGreaterThanRemaining();
      }
      sellableCount -= _amount;
    }

    // Reject the purchase if the caller is underpaying.
    if (msg.value < totalCharge) { revert CannotUnderpayForMint(); }

    // Refund the caller's excess payment if they overpaid.
    if (msg.value > totalCharge) {
      uint256 excess = msg.value - totalCharge;
      (bool returned, ) = payable(_msgSender()).call{ value: excess }("");
      if (!returned) { revert RefundTransferFailed(); }
    }

    // Mint the option.
    IOption721(option).mintOpt(_amount, claimStamp, msg.sender);
  }


  /**

  */
  function purchaseToken (
    uint256 _roundId,
    uint256 _amount
  ) external payable nonReentrant {
    Config memory config = configs[_roundId];
    if( config.basicPrice == 0 ){ revert ZeroPriceConfig(); }

    if( config.syncSupply ){
      if( _amount > sellableCount ){
        revert AmountGreaterThanRemaining();
      }
      sellableCount -= _amount;
    }
    // Calculate the total cost of this purchase.
    uint256 totalCharge = config.basicPrice * _amount;

    // Reject the purchase if the caller is underpaying.
    if (msg.value < totalCharge) { revert CannotUnderpayForMint(); }

    // Refund the caller's excess payment if they overpaid.
    if (msg.value > totalCharge) {
      uint256 excess = msg.value - totalCharge;
      (bool returned, ) = payable(_msgSender()).call{ value: excess }("");
      if (!returned) { revert RefundTransferFailed(); }
    }

    // Mint the item.
    ITiny721(item).mint_Qgo(msg.sender, _amount);
  }

  /**

  */
  function exerciseOption ( uint256 _tokenId ) external nonReentrant {
    // Check the option's claimstamp.
    if( IOption721(option).exercisable(_tokenId) > block.timestamp ){
      revert NotExercisableYet();
    }

    // Double check the option's ownership.
    if( IOption721(option).ownerOf(_tokenId) != msg.sender ){
      revert NotOptionOwner();
    }

    // Check if the option has already been exercised.
    if( exercised[_tokenId] ){
      revert OptionAlreadyExercised();
    }

    // Mark the option as exercised.
    exercised[_tokenId] = true;

    // Deactivate the option by sending it to its contract.
    IOption721(option).transferFrom(msg.sender, option, _tokenId);

    // Mint the item.
    ITiny721(item).mint_Qgo(msg.sender, 1);
    emit Exercised(_tokenId, msg.sender);
  }

  /**
    Allow any caller to send this contract's balance of Ether to the payment
    destination.
  */
  function claim () external nonReentrant {
    (bool success, ) = payable(paymentReceiver).call{
      value: address(this).balance
    }("");
    if (!success) { revert SweepingTransferFailed(); }
  }

  /**
    Allow the owner to sweep either Ether or a particular ERC-20 token from the
    contract and send it to another address. This allows the owner of the shop
    to withdraw their funds after the sale is completed.

    @param _token The token to sweep the balance from; if a zero address is sent
      then the contract's balance of Ether will be swept.
    @param _amount The amount of token to sweep.
    @param _destination The address to send the swept tokens to.
  */
  function sweep (
    address _token,
    address _destination,
    uint256 _amount
  ) external onlyOwner nonReentrant {

    // A zero address means we should attempt to sweep Ether.
    if (_token == address(0)) {
      (bool success, ) = payable(_destination).call{ value: _amount }("");
      if (!success) { revert SweepingTransferFailed(); }

    // Otherwise, we should try to sweep an ERC-20 token.
    } else {
      IERC20(_token).safeTransfer(_destination, _amount);
    }
  }

}

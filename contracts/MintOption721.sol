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
error SaleNotStarted();
error SweepingTransferFailed();
error ZeroBasicPriceConfig();
error ZeroMinPriceConfig();
error ZeroPricePurchase();

interface IOption721 {
  function mintOpt( uint256 amount, uint256 claimStamp, address recipient ) external;
  function transferFrom( address from, address to, uint256 tokenId ) external;
  function exercisable( uint256 tokenId ) external returns ( uint256 );
  function ownerOf( uint256 id ) external returns ( address );
}

interface IERC20 {
  function transfer( address _destination, uint256 _amount ) external;
}

/**
  @title MintOption721
  @author 0xthrpw
  @author Doctor Classic

  This contract, along with the Option721 contract, allows users to purchase an
  option to mint an item at a time-based discount.  Users purchase an option
  token with a capped per term discount, and specify the length of time they are
  willing to wait between paying for the option and exercising the option.  Once
  the term is complete, users can exercise their option and redeem it to mint
  their item. Users with low time preference can choose to forgo the option
  method entirely and purchase their item immediately with no discount.

  Additionally, the system can be configured to allow the number of option
  tokens that can be minted to exceed the corresponding number of items that can
  be minted.  This creates an effect where users that purchase options for
  longer terms may not be able to exercise their options before the actual item
  collection sells out (expiry).  The introduction of this risk creates a
  disincentive to 'game' the system by blindly maxing out the term length for
  the largest discount.  It is recognized that this may not be desirable for all
  projects, so this setting is optional which will allow for guaranteed
  option/item redemption.

  March 13th, 2022
*/
contract MintOption721 is Ownable, ReentrancyGuard {

  address public paymentReceiver;

  address public option;

  address public item;

  uint256 public sellableCount;


  /**
    The settings that govern all option behavior for a given round

    @param startTime the starting time for options calculations
    @param basicPrice
    @param minPrice
    @param discountPerTermUnit
    @param termUnit
    @param syncSupply
  */
  struct Config {
    uint256 startTime;
    uint256 basicPrice;
    uint256 minPrice;
    uint256 discountPerTermUnit;
    uint256 termUnit;
    bool syncSupply;
  }

  /// roundId > configuration struct
  mapping(uint256 => Config) public configs;

  /**
    Construct a new instance of this contract.

    @param _item The contract address of the collection being sold
    @param _option The address of the collection's option contract.
    @param _paymentReceiver The address of the recipient of sale proceeds.
    @param _sellableCount The running number of items this contract can sell.
  */
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
    Set the configuration of a redemption at index 'roundId'.  Each round's
    config consists of a `Config` struct.  See the comments above for the struct
    itself for more detail on the contained parameters.

    @param _roundId The index in the configs array where this config is stored.
    @param _config The configuration data for the specified round.
  */
  function setConfig (uint256 _roundId, Config memory _config) external onlyOwner {
    configs[_roundId] = _config;
  }

  /**
    Purchase and option token that can be redeemed to mint an item from this
    contract once the exercise time is reached and the term is satisfied.

    @param _roundId the index of the configuration for this round
    @param _termLength the number of termUnits the user will wait before exercising
    @param _amount the number of options the user is purchasing
  */
  function purchaseOption (
    uint256 _roundId,
    uint256 _termLength,
    uint256 _amount
  ) external payable nonReentrant {
    Config memory config = configs[_roundId];
    // Make sure sale has started
    if( config.startTime > block.timestamp){ revert SaleNotStarted(); }

    // Make sure config isn't empty
    if( config.basicPrice == 0 ){ revert ZeroBasicPriceConfig(); }
    if( config.minPrice == 0 ){ revert ZeroMinPriceConfig(); }

    // Calculate the option discount.
    uint256 discount = _termLength * config.discountPerTermUnit;

    // Check if price has broken minimum price threshold.
    uint256 price = (config.minPrice + discount > config.basicPrice)
      ? config.minPrice
      : config.basicPrice - discount ;

    // Calculate the timestamp of when the option becomes exercisable.
    uint256 claimStamp = block.timestamp + ( _termLength * config.termUnit );

    // Calculate the total cost of this purchase.
    uint256 totalCharge = price * _amount;

    // If set, check sellable amount of items
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
    Purchase tokens without using the option system, this function will allow
    a user to buy at this configuration's basicPrice.

    @param _roundId the index of the configuration for this round
    @param _amount the number of tokens the user is purchasing
  */
  function purchaseToken (
    uint256 _roundId,
    uint256 _amount
  ) external payable nonReentrant {
    Config memory config = configs[_roundId];
    // Make sure sale has started
    if( config.startTime > block.timestamp){ revert SaleNotStarted(); }

    // Make sure config isn't empty
    if( config.basicPrice == 0 ){ revert ZeroBasicPriceConfig(); }
    if( config.minPrice == 0 ){ revert ZeroMinPriceConfig(); }

    // If set, check sellable amount of items
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
    Exercise an option token once the exercisable time is reached.  Once the
    option is exercised, it is sent to the option contract itself.  This removes
    it from circulation and allows for distinguishing between tokenIds that dont
    exist yet from those that have been exercised.

    @param _tokenId the ID of the option token being exercised
  */
  function exerciseOption ( uint256 _tokenId ) external  {
    // Check the option's claimstamp.
    if( IOption721(option).exercisable(_tokenId) > block.timestamp ){
      revert NotExercisableYet();
    }

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
      IERC20(_token).transfer(_destination, _amount);
    }
  }

}

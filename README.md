# MintOption721  

TLDR: 2 contract system that lets users purchase NFTs at a discount if they are willing to wait to claim their tokens, and also provides optional disincentives to simply seek the maximum discount possible.  

Traditional token sales are typically fixed price and do not allow for organic price discovery at mint.  While limited price discovery can be allowed by a system like a Dutch Auction (allowing for a decaying price over time), participants are unable to set a personal time preference and could be priced out of the sale if strike price never drops to the desired entry level.  Using a time based discount system allows price discovery to be completely decoupled from market consensus, it rewards long term participants and places a premium on short term speculation.  

We have developed a MintOption721 shop contract with a corresponding option token and have created a system for minting NFTs that allows users to purchase an option to mint an item at such a time-based discount.  Users can purchase an option token with a capped per term discount, and specify the length of time they are willing to wait between paying for the option and exercising the option.  Once the term is complete, users can exercise their option and redeem it to mint their item. Buyers with low time preference can choose to forgo the option method entirely and purchase their item immediately with no discount.  

Additionally, the system can be configured to allow the number of option tokens that can be minted to exceed the corresponding number of items that can be minted.  This creates an effect where users that purchase options for longer terms may not be able to exercise their options before the actual item collection sells out (expiry).  The introduction of this risk creates a disincentive to 'game' the system by blindly maxing out the term length for the largest discount.  It is recognized that this may not be desirable for all projects, so this setting is optional which will allow for guaranteed option/item redemption.  

Users pay for the option token upfront, and must wait for the completion of their specified term before they can exercise their option and redeem for an item from the collection.  

No refunds! When configured to allow more options than items, if a user is too greedy and tries to scalp for an (according to market sentiment) unrealistically low price, they may not be able to exercise their option and redeem for an item if there are enough users who are willing to pay a higher price and the collection sells out before the end of their term.  

Options can be bought and sold and speculated on the secondary market before they are exercised.  

The option NFTs use completely on-chain metadata and SVG, the metadata properties contain information about the option including the current owner and when it is exercisable.  This allows for dynamic option metadata and means no extra hosting infrastructure (AWS, image server, IPFS etc) is required outside of original project necessities.  


## Configuration

A token sale is configured with these properties:  

**basicPrice** - the maximum price a user will pay for an item if they wish to purchase immediately  

**minimumPrice** - the minimum price a user will pay for an option to mint if they wait the maximum term length  

**termUnit** - the unit of time a user must wait for the price to be reduced by discountPerTermLimit  

**discountPerTermLimit** - the amount the price of the option decays over a single termUnit  

**syncSupply** - whether to allow the number of item tokens to subceed the number of outstanding options  

The price a user pays for an option is calculated as basicPrice - (termLength * termUnit * discountPerTermLimit) where termLength is the user's specified quantity of termUnits.  The item's price will be the configured minimumPrice if this calculation results in a price lower than minimumPrice.  


## Example  
Green Triangles Project wants to sell 1000 items.  

They setup the mintOption contract with a basic price of 1 eth  
`basicPrice = 1`  

They set the minimum price to .1, this means that the maximum discount a user can receive is .9 eth  
`minimumPrice = .1`  

They set the term unit to 1 day  
`termUnit = 86400 (seconds)`  

They set the discount per term unit to .1 eth, this means that every day the user is willing to wait to claim they will pay .1 eth less for their purchase.  
`discountPerTermUnit = .1`  

With the above configuration a user will be able to purchase an option for .1 eth to mint an from the green triangles collection in 9 days.  If the user doesn't want to wait that long, they could purchase an option for .6 eth, that they can exercise in 4 days.  If the user doesn't want to wait at all, they can purchase the item directly for 1 eth, skipping the option system completely.  


## Install, Compile Contracts and Run Tests  

`npm install`  

`npx hardhat compile`  

`npx hardhat test`  

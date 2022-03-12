'use strict';

const { describe, it } = require('mocha');
const { network, ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { expect } = require('chai');
const { should } = require('chai').should();

/**
  Describe the contract testing suite, retrieve testing wallets, and create
  contract factories from the artifacts we are testing.
*/
describe('/MOTG/ Mint Option Testing General', function () {
  let deployer, alice, bob, carol, dev;
  let addresses, recipients, config;
  let Option721, Token721, MintOption721;
  let option721, token721, mintOption721;


  before(async () => {
    const signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async signer => signer.getAddress()));
    deployer = { provider: signers[0].provider, signer: signers[0], address: addresses[0] };
    alice = { provider: signers[1].provider, signer: signers[1], address: addresses[1] };
    bob = { provider: signers[2].provider, signer: signers[2], address: addresses[2] };
    carol = { provider: signers[3].provider, signer: signers[3], address: addresses[3] };
    dev = { provider: signers[3].provider, signer: signers[3], address: addresses[3] };

    Token721 = await ethers.getContractFactory("Tiny721");
    Option721 = await ethers.getContractFactory("Option721");
    //ERC20 = await ethers.getContractFactory("MockERC20");
    MintOption721 = await ethers.getContractFactory("MintOption721");

  });

  // Deploy a fresh set of smart contracts, using these constants, for testing.
  // These are the constants for the item contract.

  const NAME = 'LOCK ME';
  const SYMBOL = 'LOK';
  const METADATA_URI = '';
  const CAP = 10000;

  // These are the constants for the mint locker contract.

  const START_TIME = '0';
  const START_PRICE = '1';
  const REST_PRICE = '.001';
  const DISCOUNT_PER_TERM = '.01';
  const TERM_UNIT = '4000';

  beforeEach(async () => {
    token721 = await Token721.connect(deployer.signer).deploy(
      NAME,
      SYMBOL,
      METADATA_URI,
      CAP
    );
    await token721.deployed();

    option721 = await Option721.connect(deployer.signer).deploy(
      NAME,
      SYMBOL,
      METADATA_URI,
      CAP
    );
    await option721.deployed();

    config = {
      startTime: START_TIME,
      basicPrice: ethers.utils.parseEther(START_PRICE),
      minPrice: ethers.utils.parseEther(REST_PRICE),
      discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
      termUnit: TERM_UNIT
    }

    mintOption721 = await MintOption721.connect(deployer.signer).deploy(
      token721.address,
      option721.address,
      deployer.address
    );
    await mintOption721.deployed();

    await mintOption721.connect(deployer.signer).setConfig(0, config);

    let configured = await mintOption721.configs(0);
    console.log("config", configured);

    await token721.connect(deployer.signer).setAdmin(
      mintOption721.address,
      true
    );

    await option721.connect(deployer.signer).setAdmin(
      mintOption721.address,
      true
    );
  });

  context('Basic configuration', async function() {
    it('puchase token at basic price', async () => {
      ///early minter
      let amount = '1';
      let totalSpend = config.basicPrice * amount;

      await mintOption721.connect(deployer.signer).purchaseToken(
        0, // round id
        amount, // amount
        { value: totalSpend.toString() }
      );
    });

    it('purchase option', async () => {
      ///early minter
      let amount = '1';

      let termLength = 4;
      let termTime = termLength * config.termUnit;
      let discount = termTime * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;
      console.log("discount", totalSpend, config.basicPrice, discount, amount);
      console.log("uh oh", termTime, config.discountPerTermUnit);
      await mintOption721.connect(deployer.signer).purchaseOption(
        0, // round id
        amount, // amount
        { value: totalSpend.toString() }
      );
    });
  });
});

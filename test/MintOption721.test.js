'use strict';

const { describe, it } = require('mocha');
const { network, ethers } = require('hardhat');
const fs = require('fs');
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
console.log("token721", token721.address);
    option721 = await Option721.connect(deployer.signer).deploy(
      NAME,
      SYMBOL,
      "MINT OPTIONAL",
      CAP,
      token721.address
    );
    await option721.deployed();

    config = {
      startTime: START_TIME,
      basicPrice: ethers.utils.parseEther(START_PRICE),
      minPrice: ethers.utils.parseEther(REST_PRICE),
      discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
      termUnit: TERM_UNIT,
      syncSupply: true
    }

    mintOption721 = await MintOption721.connect(deployer.signer).deploy(
      token721.address,
      option721.address,
      deployer.address,
      CAP
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


    it('purchase option', async () => {
      ///early minter
      let amount = '1';

      let termLength = '20';
      let termTime = termLength * config.termUnit;
      let discount = termLength * config.discountPerTermUnit;

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumBefore);
      const now = block.timestamp;
      console.log("now", now, termTime);

      let totalSpend = (config.basicPrice - discount) * amount;

      let purchase = await mintOption721.connect(deployer.signer).purchaseOption(
        '0', // round id
        termLength,
        amount, // amount
        { value: totalSpend.toString() }
      );

      let purchaseReceipt = await purchase.wait();
      let purchasedOptionId = purchaseReceipt.events[0].topics[3];





      await ethers.provider.send('evm_setNextBlockTimestamp', [
        now + termTime
      ]);
      await ethers.provider.send('evm_mine');

      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const after = blockAfter.timestamp;
      console.log("after", after);

      const exerciseDate = await option721.exercisable(purchasedOptionId);
console.log("exerciseDate", exerciseDate);
      //redeem exercisable token
      await option721.connect(deployer.signer).setApprovalForAll(mintOption721.address, true);

      await mintOption721.connect(deployer.signer).exerciseOption(
        purchasedOptionId
      );


      let metadata = await option721.tokenURI(1);
      let data = metadata.substring(29);
      let buff = new Buffer.from(data, 'base64');

      console.log("metadata", buff.toString('ascii'));

      let meta = JSON.parse(buff.toString('ascii'));
      let imagedata = meta.image.substring(26);

      console.log("imagedata", imagedata.toString('ascii'));
      let imgbuffer = new Buffer.from(imagedata, 'base64');
      fs.writeFileSync('art/token_gen.svg', imgbuffer);

    });
    it('puchase token at basic price', async () => {
      ///early minter
      let amount = '1';
      let totalSpend = config.basicPrice * amount;

      await mintOption721.connect(deployer.signer).purchaseToken(
        '0', // round id
        amount, // amount
        { value: totalSpend.toString() }
      );
    });
  });
});

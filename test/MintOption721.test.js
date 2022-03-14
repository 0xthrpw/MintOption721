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
  const CAP = 5;

  // These are the constants for the mint locker contract.

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
      "MINT OPTIONAL",
      CAP,
      token721.address
    );
    await option721.deployed();


    mintOption721 = await MintOption721.connect(deployer.signer).deploy(
      token721.address,
      option721.address,
      deployer.address,
      CAP
    );
    await mintOption721.deployed();

    await token721.connect(deployer.signer).setAdmin(
      mintOption721.address,
      true
    );

    await option721.connect(deployer.signer).setAdmin(
      mintOption721.address,
      true
    );
  });

  context('synced item supply', async function() {
    beforeEach(async () => {
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const ts = blockAfter.timestamp;

      config = {
        startTime: ts,
        basicPrice: ethers.utils.parseEther(START_PRICE),
        minPrice: ethers.utils.parseEther(REST_PRICE),
        discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
        termUnit: TERM_UNIT,
        syncSupply: true
      }
      await mintOption721.connect(deployer.signer).setConfig(0, config);

    });

    it('purchase option', async () => {
      ///early minter
      let amount = '1';

      let termLength = '20';
      let termTime = termLength * config.termUnit;
      let discount = termLength * config.discountPerTermUnit;

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumBefore);
      const now = block.timestamp;

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

      const exerciseDate = await option721.exercisable(purchasedOptionId);

      //redeem exercisable token
      await option721.connect(deployer.signer).setApprovalForAll(mintOption721.address, true);

      await mintOption721.connect(deployer.signer).exerciseOption(
        purchasedOptionId
      );


      // let metadata = await option721.tokenURI(1);
      // let data = metadata.substring(29);
      // let buff = new Buffer.from(data, 'base64');
      //
      // console.log("metadata", buff.toString('ascii'));
      //
      // let meta = JSON.parse(buff.toString('ascii'));
      // let imagedata = meta.image.substring(26);
      //
      // console.log("imagedata", imagedata.toString('ascii'));
      // let imgbuffer = new Buffer.from(imagedata, 'base64');
      // fs.writeFileSync('art/token_gen.svg', imgbuffer);

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

    it('revert: not exercisable yet', async () => {
      let amount = '1';
      let termLength = '20';
      let discount = termLength * config.discountPerTermUnit;
      let totalSpend = (config.basicPrice - discount) * amount;
      let purchase = await mintOption721.connect(deployer.signer).purchaseOption(
        '0', // round id
        termLength,
        amount, // amount
        { value: totalSpend.toString() }
      );

      let purchaseReceipt = await purchase.wait();
      let purchasedOptionId = purchaseReceipt.events[0].topics[3];
      await option721.connect(deployer.signer).setApprovalForAll(mintOption721.address, true);

      await expect(
        mintOption721.connect(deployer.signer).exerciseOption(purchasedOptionId)
      ).to.be.revertedWith('NotExercisableYet');

    });

    it('revert: not enough eth sent', async () => {
      let amount = '1';
      let termLength = '20';
      let discount = termLength * config.discountPerTermUnit * 1.5;

      let totalSpend = (config.basicPrice - discount) * amount;

      await expect(
        mintOption721.connect(deployer.signer).purchaseOption(
         '0', // round id
         termLength,
         amount, // amount
         { value: totalSpend.toString() }
       )
      ).to.be.revertedWith('CannotUnderpayForMint');

      await expect(
        mintOption721.connect(deployer.signer).purchaseToken(
         '0', // round id
         amount, // amount
         { value: ethers.utils.parseEther(".9") }
       )
      ).to.be.revertedWith('CannotUnderpayForMint');
    });


    it('revert: oversold', async () => {
      let amount = '4';
      let termLength = '20';
      let termTime = termLength * config.termUnit;
      let discount = termLength * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;
      let purchase = await mintOption721.connect(alice.signer).purchaseOption(
        '0', // round id
        termLength,
        amount,
        { value: totalSpend.toString() }
      );

      let purchaseReceipt = await purchase.wait();
      let purchasedOptionId = purchaseReceipt.events[0].topics[3];
      await option721.connect(alice.signer).setApprovalForAll(mintOption721.address, true);

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumBefore);
      const now = block.timestamp;
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        now + termTime
      ]);
      await ethers.provider.send('evm_mine');

      await mintOption721.connect(alice.signer).exerciseOption(purchasedOptionId)

      await expect(
        mintOption721.connect(bob.signer).purchaseToken(
          '0', // round id
          amount, // amount
          { value: (config.basicPrice * amount).toString() }
        )
      ).to.be.revertedWith('AmountGreaterThanRemaining');

      await expect(
        mintOption721.connect(bob.signer).purchaseOption(
          '0', // round id
          termLength,
          amount,
          { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('AmountGreaterThanRemaining');
    });

    it('claims balance to receiver', async () => {
      ///early minter
      let amount = '1';
      let totalSpend = config.basicPrice * amount;

      let purchase = await mintOption721.connect(deployer.signer).purchaseToken(
        '0', // round id
        amount, // amount
        { value: totalSpend.toString() }
      );

      let purchaseReceipt = await purchase.wait();
      let purchasedOptionId = purchaseReceipt.events[0].topics[3];

      // check balance of contract is worth 1 x price
      let balance = await ethers.provider.getBalance(mintOption721.address);

      expect(
        balance.toString()
      ).to.equal((amount * config.basicPrice).toString());

      // send tokens to receiver
      await mintOption721.connect(deployer.signer).claim();

      // check balance of receiver is worth 1 x price
      let receiverBalance = await ethers.provider.getBalance(mintOption721.address);

      expect(
        balance.toString()
      ).to.equal(ethers.utils.parseEther(amount))

    });

    it('revert: sale not started', async () => {
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const ts = blockAfter.timestamp;

      config = {
        startTime: ts + 10,
        basicPrice: ethers.utils.parseEther(START_PRICE),
        minPrice: ethers.utils.parseEther(REST_PRICE),
        discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
        termUnit: TERM_UNIT,
        syncSupply: false
      }
      await mintOption721.connect(deployer.signer).setConfig(0, config);


      let amount = '1';
      let termLength = '20';
      let discount = termLength * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;

      await expect(
        mintOption721.connect(deployer.signer).purchaseOption(
         '0', // round id
         termLength,
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('SaleNotStarted');


      await expect(
        mintOption721.connect(deployer.signer).purchaseToken(
         '0', // round id
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('SaleNotStarted');
    });
  });
  context('un-synced item supply', async function() {
    beforeEach(async () => {
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const ts = blockAfter.timestamp;

      config = {
        startTime: ts,
        basicPrice: ethers.utils.parseEther(START_PRICE),
        minPrice: ethers.utils.parseEther(REST_PRICE),
        discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
        termUnit: TERM_UNIT,
        syncSupply: false
      }
      await mintOption721.connect(deployer.signer).setConfig(0, config);

    });

    it('revert: not owner', async () => {
      let amount = '1';
      let termLength = '20';
      let termTime = termLength * config.termUnit;
      let discount = termLength * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;
      let purchase = await mintOption721.connect(alice.signer).purchaseOption(
        '0', // round id
        termLength,
        amount, // amount
        { value: totalSpend.toString() }
      );

      let purchaseReceipt = await purchase.wait();
      let purchasedOptionId = purchaseReceipt.events[0].topics[3];
      await option721.connect(bob.signer).setApprovalForAll(mintOption721.address, true);

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumBefore);
      const now = block.timestamp;
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        now + termTime
      ]);
      await ethers.provider.send('evm_mine');

      await expect(
        mintOption721.connect(bob.signer).exerciseOption(purchasedOptionId)
      ).to.be.revertedWith('NotOptionOwner');
    });

    it('revert: already exercised', async () => {
      let amount = '1';
      let termLength = '20';
      let termTime = termLength * config.termUnit;
      let discount = termLength * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;
      let purchase = await mintOption721.connect(alice.signer).purchaseOption(
        '0', // round id
        termLength,
        amount, // amount
        { value: totalSpend.toString() }
      );

      let purchaseReceipt = await purchase.wait();
      let purchasedOptionId = purchaseReceipt.events[0].topics[3];
      await option721.connect(alice.signer).setApprovalForAll(mintOption721.address, true);

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumBefore);
      let metadata = await option721.tokenURI(purchasedOptionId);
      
      const now = block.timestamp;
      await ethers.provider.send('evm_setNextBlockTimestamp', [
        now + termTime + 1000
      ]);
      await ethers.provider.send('evm_mine');

      await mintOption721.connect(alice.signer).exerciseOption(purchasedOptionId)

      let exercisedMetadata = await option721.tokenURI(purchasedOptionId);
      await expect(
        mintOption721.connect(alice.signer).exerciseOption(purchasedOptionId)
      ).to.be.revertedWith('NotOptionOwner');

      expect(
         await option721.connect(alice.signer).ownerOf(purchasedOptionId)
      ).to.equal(option721.address);
    });


    it('overpay and receive change', async () => {
      let amount = '1';
      let termLength = '20';
      let termTime = termLength * config.termUnit;
      let discount = termLength * config.discountPerTermUnit;

      let aliceBalanceBefore = await ethers.provider.getBalance(alice.address);

      let totalSpend = (config.basicPrice - discount) * amount;
      let purchase = await mintOption721.connect(alice.signer).purchaseOption(
        '0', // round id
        termLength,
        amount, // amount
        { value: (totalSpend * 3).toString() }
      );

      let receipt = await purchase.wait();
      let gasCost = receipt.gasUsed;
      let gasFormatted = ethers.utils.formatUnits(gasCost.toString(), "gwei")
      let aliceBalanceAfter = await ethers.provider.getBalance(alice.address);

      expect(
        aliceBalanceAfter.toString()
      ).to.equal(aliceBalanceBefore.sub(totalSpend.toString()).sub(gasCost.toString()));

      let purchaseToken = await mintOption721.connect(alice.signer).purchaseToken(
        '0', // round id
        amount,
        { value: (totalSpend * 3).toString() }
      );

    });
  });

  context('bad configurations', async function() {

    it('revert: zero basic price', async () => {
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const ts = blockAfter.timestamp;

      config = {
        startTime: ts,
        basicPrice: 0,
        minPrice: ethers.utils.parseEther(REST_PRICE),
        discountPerTermUnit: 0,
        termUnit: TERM_UNIT,
        syncSupply: false
      }
      await mintOption721.connect(deployer.signer).setConfig(0, config);


      let amount = '1';
      let termLength = '20';
      let discount = termLength * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;

      await expect(
        mintOption721.connect(deployer.signer).purchaseOption(
         '0', // round id
         termLength,
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('ZeroBasicPriceConfig');

      await expect(
        mintOption721.connect(deployer.signer).purchaseToken(
         '0', // round id
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('ZeroBasicPriceConfig');

      await expect(
        mintOption721.connect(deployer.signer).purchaseToken(
         '1', // round id
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('ZeroBasicPriceConfig');
    });

    it('revert: zero min price', async () => {
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      const ts = blockAfter.timestamp;

      config = {
        startTime: ts,
        basicPrice: ethers.utils.parseEther(START_PRICE),
        minPrice: 0,
        discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
        termUnit: TERM_UNIT,
        syncSupply: false
      }
      await mintOption721.connect(deployer.signer).setConfig(0, config);


      let amount = '1';
      let termLength = '20';
      let discount = termLength * config.discountPerTermUnit;

      let totalSpend = (config.basicPrice - discount) * amount;

      await expect(
        mintOption721.connect(deployer.signer).purchaseOption(
         '0', // round id
         termLength,
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('ZeroMinPriceConfig');

      await expect(
        mintOption721.connect(deployer.signer).purchaseToken(
         '0', // round id
         amount,
         { value: totalSpend.toString() }
        )
      ).to.be.revertedWith('ZeroMinPriceConfig');
    });
  });

  context('sweeps', async function() {
    it('sweep erc20 tokens', async () => {
      let NotWETH = await ethers.getContractFactory("MockERC20");
      let notWETH = await NotWETH.connect(deployer.signer).deploy(
        'NotWETH',
        'nwETH',
        ethers.utils.parseEther("1000000")
      );
      await notWETH.deployed();

      //transfer some 'royalties' to mintoption contract
      let royaltiesAmount = "10"
      await notWETH.connect(deployer.signer).transfer(
        mintOption721.address,
        ethers.utils.parseEther(royaltiesAmount)
      );

      let optContractERC20Balance = await notWETH.balanceOf(mintOption721.address);
      expect(
        optContractERC20Balance
      ).to.equal(ethers.utils.parseEther(royaltiesAmount));

      await mintOption721.connect(deployer.signer).sweep(
        notWETH.address,
        alice.address,
        ethers.utils.parseEther(royaltiesAmount)
      );

      let aliceERC20Balance = await notWETH.balanceOf(alice.address);
      expect(
        aliceERC20Balance
      ).to.equal(ethers.utils.parseEther(royaltiesAmount));

    });
  });
});

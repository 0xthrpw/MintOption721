const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const currentDate = new Date().getTime()

  // item collection params
  const ITEM_COLLECTION_NAME = `OpShop Test Items`;
  const METADATA_URI = 'https://ipfs.io/ipfs/QmWH431LYwiFu57t1ru561t6fmTp36fNLqSb6XBrj7Snfk/';
  const ITEM_SYMBOL = 'OPSHOP_ITEM';
  const CAP = '10000';

  // option params
  const OPT_COLLECTION_NAME = `OPTION DEMO - ${currentDate}`;
  const OPT_SYMBOL = 'OPT';
  const OPT_DESC = 'Testing OpShop Option Minting';

  // mint shop params
  const START_TIME = Math.floor(currentDate / 1000);
  const BASIC_PRICE = '.05';
  const MIN_PRICE =   '.0049999';
  const DISCOUNT_PER_TERM = '.005';
  const TERM_UNIT = '7200';

  const signers = await ethers.getSigners();
  const addresses = await Promise.all(signers.map(async signer => signer.getAddress()));

  const deployer = { provider: signers[0].provider, signer: signers[0], address: addresses[0] };
  console.log(`Deploying contracts from: ${deployer.address}`);

  let Tiny721 = await ethers.getContractFactory("Tiny721");
  let tiny721 = await Tiny721.connect(deployer.signer).deploy(
    ITEM_COLLECTION_NAME,
    ITEM_SYMBOL,
    METADATA_URI,
    CAP
  );

  await tiny721.deployed();
  console.log(`* tiny721 deployed to: ${tiny721.address}`);
  console.log(`[$]: npx hardhat verify --network rinkeby ${tiny721.address} ${ITEM_COLLECTION_NAME} ${ITEM_SYMBOL} ${METADATA_URI} ${CAP} `);

  // await tiny721.mint_Qgo(deployer.address, 20);
  // console.log(`* minted tokens to: ${deployer.address}`);
  //
  // await tiny721.mint_Qgo(deployer.address, 20);
  // console.log(`* minted tokens to: ${deployer.address}`);
  //
  // await tiny721.mint_Qgo(deployer.address, 20);
  // console.log(`* minted tokens to: ${deployer.address}`);


  let Option721 = await ethers.getContractFactory("Option721");
  let option721 = await Option721.connect(deployer.signer).deploy(
    OPT_COLLECTION_NAME,
    OPT_SYMBOL,
    OPT_DESC,
    CAP,
    tiny721.address
  );

  await option721.deployed();
  console.log(`* option721 deployed to: ${option721.address}`);
  console.log(`[$]: npx hardhat verify --network rinkeby ${option721.address} '${OPT_COLLECTION_NAME}' ${OPT_SYMBOL} '${OPT_DESC}' ${CAP} ${tiny721.address}`);

  let OpShop721 = await ethers.getContractFactory("OpShop721");
  let opShop721 = await OpShop721.connect(deployer.signer).deploy(
    tiny721.address,
    option721.address,
    deployer.address,
    CAP
  );
  await opShop721.deployed();
  console.log(`* opShop721 deployed to: ${opShop721.address}`);
  console.log(`[$]: npx hardhat verify --network rinkeby ${opShop721.address}  ${tiny721.address}  ${option721.address}  ${deployer.address} ${CAP}`);

  let config = {
    startTime: START_TIME,
    basicPrice: ethers.utils.parseEther(BASIC_PRICE),
    minPrice: ethers.utils.parseEther(MIN_PRICE),
    discountPerTermUnit: ethers.utils.parseEther(DISCOUNT_PER_TERM),
    termUnit: TERM_UNIT,
    syncSupply: false
  }

  let setConfig = await opShop721.connect(deployer.signer).setConfig(0, config);
  await setConfig.wait();
  console.log(`* opShop721 config set`);

  let setItemAdmin = await tiny721.connect(deployer.signer).setAdmin(
    opShop721.address,
    true
  );
  await setItemAdmin.wait()
  console.log(`* setAdmin for tiny721`);


  let setOptionAdmin = await option721.connect(deployer.signer).setAdmin(
    opShop721.address,
    true
  );
  await setOptionAdmin.wait()
  console.log(`* setAdmin for option721`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

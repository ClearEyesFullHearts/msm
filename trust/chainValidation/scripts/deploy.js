async function main() {
  const BetaMsm = await ethers.getContractFactory("BetaMsm");

  // Start deployment, returning a promise that resolves to a contract object
  const beta_msm = await BetaMsm.deploy();
  console.log("Contract deployed to address:", beta_msm.address);
}

main()
 .then(() => process.exit(0))
 .catch(error => {
   console.error(error);
   process.exit(1);
 });
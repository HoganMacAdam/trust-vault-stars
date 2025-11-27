import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedTrustVault = await deploy("TrustVault", {
    from: deployer,
    log: true,
  });

  console.log(`TrustVault contract deployed at: ${deployedTrustVault.address}`);
};
export default func;
func.id = "deploy_trustVault"; // id required to prevent reexecution
func.tags = ["TrustVault"];


import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the TrustVault contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the TrustVault contract
 *
 *   npx hardhat --network localhost task:address
 *   npx hardhat --network localhost task:submit-rating --rated-user <address> --score 5
 *   npx hardhat --network localhost task:decrypt-score --user <address>
 *   npx hardhat --network localhost task:authorize --viewer <address>
 *   npx hardhat --network localhost task:revoke --viewer <address>
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the TrustVault contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the TrustVault contract
 *
 *   npx hardhat --network sepolia task:address
 *   npx hardhat --network sepolia task:submit-rating --rated-user <address> --score 5
 *   npx hardhat --network sepolia task:decrypt-score --user <address>
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the TrustVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const trustVault = await deployments.get("TrustVault");

  console.log("TrustVault address is " + trustVault.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-score --user <address>
 *   - npx hardhat --network sepolia task:decrypt-score --user <address>
 */
task("task:decrypt-score", "Decrypts and displays a user's trust score")
  .addOptionalParam("address", "Optionally specify the TrustVault contract address")
  .addParam("user", "The address of the user to decrypt score for")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const TrustVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("TrustVault");
    console.log(`TrustVault: ${TrustVaultDeployment.address}`);

    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user;

    const trustVaultContract = await ethers.getContractAt("TrustVault", TrustVaultDeployment.address);

    const [encryptedTotalScore, encryptedCount, publicCount] = await trustVaultContract.getEncryptedScore(userAddress);
    
    if (encryptedTotalScore === ethers.ZeroHash) {
      console.log(`User ${userAddress} has no ratings yet`);
      return;
    }

    try {
      const clearTotalScore = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotalScore,
        TrustVaultDeployment.address,
        signers[0],
      );

      const clearCount = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedCount,
        TrustVaultDeployment.address,
        signers[0],
      );

      const averageScore = clearCount > 0 ? Number(clearTotalScore) / Number(clearCount) : 0;

      console.log(`User: ${userAddress}`);
      console.log(`Encrypted total score: ${encryptedTotalScore}`);
      console.log(`Clear total score: ${clearTotalScore}`);
      console.log(`Encrypted count: ${encryptedCount}`);
      console.log(`Clear count: ${clearCount}`);
      console.log(`Public count: ${publicCount}`);
      console.log(`Average score: ${averageScore.toFixed(2)}`);
    } catch (error) {
      console.log(`Cannot decrypt score for user ${userAddress}. Make sure you are authorized.`);
      console.log(`Error: ${error}`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:submit-rating --rated-user <address> --score 5
 *   - npx hardhat --network sepolia task:submit-rating --rated-user <address> --score 5
 */
task("task:submit-rating", "Submits a rating (1-5) for a user")
  .addOptionalParam("address", "Optionally specify the TrustVault contract address")
  .addParam("ratedUser", "The address of the user being rated")
  .addParam("score", "The rating score (1-5)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const score = parseInt(taskArguments.score);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error(`Argument --score must be an integer between 1 and 5`);
    }

    await fhevm.initializeCLIApi();

    const TrustVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("TrustVault");
    console.log(`TrustVault: ${TrustVaultDeployment.address}`);

    const signers = await ethers.getSigners();
    const ratedUser = taskArguments.ratedUser;

    const trustVaultContract = await ethers.getContractAt("TrustVault", TrustVaultDeployment.address);

    // Encrypt the rating score
    const encryptedScore = await fhevm
      .createEncryptedInput(TrustVaultDeployment.address, signers[0].address)
      .add32(score)
      .encrypt();

    const tx = await trustVaultContract
      .connect(signers[0])
      .submitRating(ratedUser, encryptedScore.handles[0], encryptedScore.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`TrustVault submitRating(${ratedUser}, ${score}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:authorize --viewer <address>
 *   - npx hardhat --network sepolia task:authorize --viewer <address>
 */
task("task:authorize", "Authorizes an address to view your trust score")
  .addOptionalParam("address", "Optionally specify the TrustVault contract address")
  .addParam("viewer", "The address to authorize")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const TrustVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("TrustVault");
    console.log(`TrustVault: ${TrustVaultDeployment.address}`);

    const signers = await ethers.getSigners();
    const viewer = taskArguments.viewer;

    const trustVaultContract = await ethers.getContractAt("TrustVault", TrustVaultDeployment.address);

    const tx = await trustVaultContract
      .connect(signers[0])
      .authorizeViewer(viewer);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`TrustVault authorizeViewer(${viewer}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:revoke --viewer <address>
 *   - npx hardhat --network sepolia task:revoke --viewer <address>
 */
task("task:revoke", "Revokes authorization from an address")
  .addOptionalParam("address", "Optionally specify the TrustVault contract address")
  .addParam("viewer", "The address to revoke authorization from")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const TrustVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("TrustVault");
    console.log(`TrustVault: ${TrustVaultDeployment.address}`);

    const signers = await ethers.getSigners();
    const viewer = taskArguments.viewer;

    const trustVaultContract = await ethers.getContractAt("TrustVault", TrustVaultDeployment.address);

    const tx = await trustVaultContract
      .connect(signers[0])
      .revokeViewer(viewer);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    console.log(`TrustVault revokeViewer(${viewer}) succeeded!`);
  });


import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { TrustVault } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("TrustVaultSepolia", function () {
  let signers: Signers;
  let trustVaultContract: TrustVault;
  let trustVaultContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const TrustVaultDeployment = await deployments.get("TrustVault");
      trustVaultContractAddress = TrustVaultDeployment.address;
      trustVaultContract = await ethers.getContractAt("TrustVault", TrustVaultDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should submit a rating and calculate average", async function () {
    steps = 10;
    this.timeout(4 * 40000);

    progress("Encrypting rating '5'...");
    const encryptedRating = await fhevm
      .createEncryptedInput(trustVaultContractAddress, signers.bob.address)
      .add32(5)
      .encrypt();

    progress(
      `Call submitRating(alice=${signers.alice.address}, score=5) TrustVault=${trustVaultContractAddress}...`,
    );
    let tx = await trustVaultContract
      .connect(signers.bob)
      .submitRating(signers.alice.address, encryptedRating.handles[0], encryptedRating.inputProof);
    await tx.wait();

    progress(`Call TrustVault.getEncryptedScore(alice=${signers.alice.address})...`);
    const [encryptedTotalScore, encryptedCount, publicCount] = await trustVaultContract.getEncryptedScore(
      signers.alice.address,
    );
    expect(encryptedTotalScore).to.not.eq(ethers.ZeroHash);
    expect(publicCount).to.eq(1);

    progress(`Decrypting TrustVault.getEncryptedScore()...`);
    const clearTotalScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedTotalScore,
      trustVaultContractAddress,
      signers.alice,
    );
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      trustVaultContractAddress,
      signers.alice,
    );

    progress(`Clear total score: ${clearTotalScore}, count: ${clearCount}`);
    expect(clearTotalScore).to.eq(5);
    expect(clearCount).to.eq(1);
  });
});


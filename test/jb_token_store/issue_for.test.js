import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployMockContract } from '@ethereum-waffle/mock-contract';

import jbDirectory from '../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import jbOperatoreStore from '../../artifacts/contracts/JBOperatorStore.sol/JBOperatorStore.json';
import jbProjects from '../../artifacts/contracts/JBProjects.sol/JBProjects.json';
import jbToken from '../../artifacts/contracts/JBToken.sol/JBToken.json';
import { Contract } from 'ethers';
import errors from '../helpers/errors.json';

describe('JBTokenStore::issueFor(...)', function () {
  const PROJECT_ID = 2;
  const TOKEN_NAME = 'TestTokenDAO';
  const TOKEN_SYMBOL = 'TEST';

  async function setup() {
    const [deployer, projectOwner] = await ethers.getSigners();

    const mockJbOperatorStore = await deployMockContract(deployer, jbOperatoreStore.abi);
    const mockJbProjects = await deployMockContract(deployer, jbProjects.abi);
    const mockJbDirectory = await deployMockContract(deployer, jbDirectory.abi);

    const jbTokenStoreFactory = await ethers.getContractFactory('JBTokenStore');
    const jbTokenStore = await jbTokenStoreFactory.deploy(
      mockJbOperatorStore.address,
      mockJbProjects.address,
      mockJbDirectory.address,
    );

    return {
      projectOwner,
      projectOwner,
      mockJbDirectory,
      mockJbProjects,
      jbTokenStore,
    };
  }

  it('Should issue tokens and emit event if caller is owner', async function () {
    const { projectOwner, mockJbProjects, jbTokenStore } = await setup();

    await mockJbProjects.mock.ownerOf.withArgs(PROJECT_ID).returns(projectOwner.address);

    const tx = await jbTokenStore
      .connect(projectOwner)
      .issueFor(PROJECT_ID, TOKEN_NAME, TOKEN_SYMBOL);

    const tokenAddr = await jbTokenStore.connect(projectOwner).tokenOf(PROJECT_ID);
    const token = new Contract(tokenAddr, jbToken.abi);

    expect(await jbTokenStore.tokenOf(PROJECT_ID)).to.equal(tokenAddr);

    expect(await token.connect(projectOwner).name()).to.equal(TOKEN_NAME);
    expect(await token.connect(projectOwner).symbol()).to.equal(TOKEN_SYMBOL);

    await expect(tx)
      .to.emit(jbTokenStore, 'Issue')
      .withArgs(PROJECT_ID, tokenAddr, TOKEN_NAME, TOKEN_SYMBOL, projectOwner.address);
  });

  //TODO: require permission test
  it.skip(`Can't issue tokens if caller does not have permission`, async function () {
    const { projectOwner, mockJbProjects, jbTokenStore } = await setup();

    // Return a random projectOwner address.
    await mockJbProjects.mock.ownerOf
      .withArgs(PROJECT_ID)
      .returns(ethers.Wallet.createRandom().address);

    await expect(
      jbTokenStore.connect(projectOwner).issueFor(PROJECT_ID, TOKEN_NAME, TOKEN_SYMBOL),
    ).to.be.revertedWith(errors.projectOwner_UNAUTHORIZED);
  });

  it(`Can't issue tokens if name is empty`, async function () {
    const { projectOwner, mockJbProjects, jbTokenStore } = await setup();

    await mockJbProjects.mock.ownerOf.withArgs(PROJECT_ID).returns(projectOwner.address);

    const name = '';
    await expect(
      jbTokenStore.connect(projectOwner).issueFor(PROJECT_ID, name, TOKEN_SYMBOL),
    ).to.be.revertedWith(errors.EMPTY_NAME);
  });

  it(`Can't issue tokens if symbol is empty`, async function () {
    const { projectOwner, mockJbProjects, jbTokenStore } = await setup();

    await mockJbProjects.mock.ownerOf.withArgs(PROJECT_ID).returns(projectOwner.address);

    const symbol = '';
    await expect(
      jbTokenStore.connect(projectOwner).issueFor(PROJECT_ID, TOKEN_NAME, symbol),
    ).to.be.revertedWith(errors.EMPTY_SYMBOL);
  });

  it(`Can't issue tokens if already issued`, async function () {
    const { projectOwner, mockJbProjects, jbTokenStore } = await setup();

    await mockJbProjects.mock.ownerOf.withArgs(PROJECT_ID).returns(projectOwner.address);

    // First issuance should succeed; second should fail.
    await expect(jbTokenStore.connect(projectOwner).issueFor(PROJECT_ID, TOKEN_NAME, TOKEN_SYMBOL))
      .to.not.be.reverted;
    await expect(
      jbTokenStore.connect(projectOwner).issueFor(PROJECT_ID, TOKEN_NAME, TOKEN_SYMBOL),
    ).to.be.revertedWith(errors.PROJECT_ALREADY_HAS_TOKEN);
  });
});

const challengeHandle = require('./challenge_handle');
const claimHandle = require('./claim_handle');
const createFor = require('./create_for');
const setUriOf = require('./set_uri_of');

module.exports = function () {
  before(async function () {
    this.operatorStore = await this.deployMockLocalContractFn('JBOperatorStore');
    this.jbOperations = await this.deployContractFn('JBOperations');
    this.contract = await this.deployContractFn('JBProjects', [this.operatorStore.address]);
  });

  describe('challengeHandle(...)', challengeHandle);
  describe('claimHandle(...)', claimHandle);
  describe('createFor(...)', createFor);
  describe('setUriOf(...', setUriOf);
};
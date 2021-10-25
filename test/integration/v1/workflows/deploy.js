/** 
  Deploying a project through the TerminalV1 should create a project, configure a funding cycle, and set mods.

  These steps can all be taken seperately without calling `deploy`.
*/
import { randomBigNumber, randomBytes, randomString } from '../../../utils';

export default [
  {
    description: 'Deploy a project',
    fn: async ({
      deployer,
      contracts,
      executeFn,
      BigNumber,
      randomAddressFn,
      randomBytes,
      incrementProjectIdFn,
      incrementFundingCycleIdFn,
    }) => {
      const expectedFundingCycleId = incrementFundingCycleIdFn();
      const expectedProjectId = incrementProjectIdFn();

      const target = randomBigNumber();
      const handle = randomBytes({
        // Make sure its unique by prepending the id.
        prepend: expectedProjectId.toString(),
      });
      const uri = randomString();
      const currency = randomBigNumber({ max: constants.MaxUint8 });
      const duration = randomBigNumber({
        min: BigNumber.from(1),
        max: constants.MaxUint16,
      });
      const cycleLimit = randomBigNumber({
        max: constants.MaxCycleLimit,
      });
      const discountRate = randomBigNumber({
        max: constants.MaxDiscountRate,
      });
      const ballot = constants.AddressZero;

      const reservedRate = randomBigNumber({ max: constants.MaxPercent });
      const bondingCurveRate = randomBigNumber({
        max: constants.MaxPercent,
      });
      const reconfigurationBondingCurveRate = randomBigNumber({
        max: constants.MaxPercent,
      });

      // These can be whatever.
      const payoutMods = [];
      const ticketMods = [];

      const contract = contracts.terminalV1;
      const terminal = contract;

      await executeFn({
        caller: deployer,
        contract,
        fn: 'deploy',
        args: [
          randomAddressFn(),
          handle,
          uri,
          {
            target,
            currency,
            duration,
            cycleLimit,
            discountRate,
            ballot,
          },
          {
            reservedRate,
            bondingCurveRate,
            reconfigurationBondingCurveRate,
          },
          payoutMods,
          ticketMods,
        ],
      });
      return {
        expectedFundingCycleId,
        expectedProjectId,
        handle,
        uri,
        target,
        discountRate,
        cycleLimit,
        duration,
        ballot,
        currency,
        reservedRate,
        bondingCurveRate,
        reconfigurationBondingCurveRate,
        terminal,
      };
    },
  },
  {
    description: 'Make sure the funding cycle got saved correctly',
    fn: async ({
      contracts,

      BigNumber,
      timeMark,
      randomSignerFn,
      local: {
        expectedFundingCycleId,
        expectedProjectId,
        target,
        currency,
        discountRate,
        cycleLimit,
        duration,
        ballot,
        reservedRate,
        bondingCurveRate,
        reconfigurationBondingCurveRate,
      },
    }) => {
      // Pack the metadata as expected.
      let expectedPackedMetadata = BigNumber.from(0);
      expectedPackedMetadata = expectedPackedMetadata.add(reconfigurationBondingCurveRate);
      expectedPackedMetadata = expectedPackedMetadata.shl(8);
      expectedPackedMetadata = expectedPackedMetadata.add(bondingCurveRate);
      expectedPackedMetadata = expectedPackedMetadata.shl(8);
      expectedPackedMetadata = expectedPackedMetadata.add(reservedRate);
      expectedPackedMetadata = expectedPackedMetadata.shl(8);

      // Expect nothing to have been tapped yet from the funding cycle.
      const expectedTapped = BigNumber.from(0);

      // It should be the project's first funding cycle.
      const expectedFundingCycleNumber = BigNumber.from(1);

      // Expect the funding cycle to be based on the 0th funding cycle.
      const expectedBasedOn = BigNumber.from(0);

      // Expect the funding cycle's weight to be the base weight.
      const expectedWeight = await contracts.fundingCycles.BASE_WEIGHT();

      // Expect the funding cycle's fee to be the terminalV1's fee.
      const expectedFee = await contracts.terminalV1.fee();

      await verifyContractGetter({
        caller: randomSignerFn(),
        contract: contracts.fundingCycles,
        fn: 'get',
        args: [expectedFundingCycleId],
        expect: [
          expectedFundingCycleId,
          expectedProjectId,
          expectedFundingCycleNumber,
          expectedBasedOn,
          timeMark,
          cycleLimit,
          expectedWeight,
          ballot,
          timeMark,
          duration,
          target,
          currency,
          expectedFee,
          discountRate,
          expectedTapped,
          expectedPackedMetadata,
        ],
      });
    },
  },
  {
    description: "Make sure the project's handle got saved",
    fn: ({ contracts, randomSignerFn, local: { handle, expectedProjectId } }) =>
      verifyContractGetter({
        caller: randomSignerFn(),
        contract: contracts.projects,
        fn: 'handleOf',
        args: [expectedProjectId],
        expect: handle,
      }),
  },
  {
    description: 'Make sure the project was saved to the handle',
    fn: ({ contracts, randomSignerFn, local: { handle, expectedProjectId } }) =>
      verifyContractGetter({
        caller: randomSignerFn(),
        contract: contracts.projects,
        fn: 'projectFor',
        args: [handle],
        expect: expectedProjectId,
      }),
  },
  {
    description: "Make sure the project's uri got saved",
    fn: ({ contracts, randomSignerFn, local: { uri, expectedProjectId } }) =>
      verifyContractGetter({
        caller: randomSignerFn(),
        contract: contracts.projects,
        fn: 'uriOf',
        args: [expectedProjectId],
        expect: uri,
      }),
  },
  {
    description: "Make sure the terminalV1 got set as the project's current terminal",
    fn: ({ randomSignerFn, contracts, local: { terminal, expectedProjectId } }) =>
      verifyContractGetter({
        caller: randomSignerFn(),
        contract: contracts.terminalDirectory,
        fn: 'terminalOf',
        args: [expectedProjectId],
        expect: terminal.address,
      }),
  },
];

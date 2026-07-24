// All amounts in Naira (converted to kobo at the point of use).

const FEE_SCHEDULE = {
  Certificate: {
    applicationFee: 3000,
    acceptanceFee: 11000,
    semesterFee: 27000,
    breakdown: {
      registrationFee: 5000,
      developmentFee: 5000,
      examFee: 2000,
      tuition: 15000,
    },
  },
  Diploma: {
    applicationFee: 3000,
    acceptanceFee: 11000,
    semesterFee: 32000,
    breakdown: {
      registrationFee: 5000,
      developmentFee: 5000,
      examFee: 2000,
      tuition: 20000,
    },
  },
  Degree: {
    applicationFee: 5000,
    acceptanceFee: 12000,
    semesterFee: 37000,
    breakdown: {
      registrationFee: 5000,
      developmentFee: 5000,
      examFee: 2000,
      tuition: 25000,
    },
  },
  PGD: {
    applicationFee: 5000,
    acceptanceFee: 12000,
    semesterFee: 42000,
    breakdown: {
      registrationFee: 5000,
      developmentFee: 5000,
      examFee: 2000,
      tuition: 30000,
    },
  },
  Masters: {
    applicationFee: 7000,
    acceptanceFee: 15000,
    semesterFee: 88000,
    breakdown: {
      registrationFee: 10000,
      developmentFee: 10000,
      examFee: 3000,
      materialFee: 20000,
      tuition: 45000,
    },
  },
  PhD: {
    applicationFee: 10000,
    acceptanceFee: 15000,
    semesterFee: 108000,
    breakdown: {
      registrationFee: 10000,
      developmentFee: 10000,
      examFee: 3000,
      materialFee: 20000,
      tuition: 65000,
    },
  },
};

const PROGRAM_LEVELS = Object.keys(FEE_SCHEDULE); // ['Certificate','Diploma','Degree','PGD','Masters','PhD']
const FEE_TYPES = ["applicationFee", "acceptanceFee", "semesterFee"];

/**
 * Server-side amount lookup. Never trust a client-supplied amount for these.
 * Returns amount in Naira. Throws if programLevel/feeType is invalid.
 */
const getFeeAmount = (programLevel, feeType) => {
  const program = FEE_SCHEDULE[programLevel];
  if (!program) {
    throw new Error(`Unknown program level: ${programLevel}`);
  }
  const amount = program[feeType];
  if (amount === undefined) {
    throw new Error(`Unknown fee type: ${feeType}`);
  }
  return amount;
};

module.exports = { FEE_SCHEDULE, PROGRAM_LEVELS, FEE_TYPES, getFeeAmount };

require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    polygon: {
      url: "https://1rpc.io/matic",
      accounts: ["0x0ca2f1034c3a82b9276931f0e88be418b85540fc443b6187ad8b270b1fe4f5b7"],
    },
  },
  etherscan: {
    apiKey: {
      polygon: "RJBXN5FTSSH7WNEFNZ7EJQQ4RUREFIPUFB",
    },
  },
  paths: {
    sources: "./contracts",
  },
};

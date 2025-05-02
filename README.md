# Install package

```
npm install

# client

cd client && npm install
```

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts --network sepolia

npx hardhat verify --network sepolia 0xD1CEEa162D9138559BEEfEFf7a31CCf943297989
```


## Client

```
cd client
npx nx serve client --skip-nx-cache
``

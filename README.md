![parse-repository-header](https://user-images.githubusercontent.com/5673677/139276658-d6fa5e86-da3e-446e-9daa-f717469d4c7a.png)

---

<h2 align="center">
  Blockchain (Ethereum) dApps development made easy with <a href="https://github.com/parse-community/parse-server">Parse Server</a>
</h2>

<p align="center">
  This mono respository contains packages that aim to simplify the development of blockchain dApps via <a href="https://github.com/parse-community/parse-server">Parse Server</a> auto-generated APIs. Currently, only Ethereum networks are supported.
</p>

---

- [Packages](#packages)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
  - [Running an Ethereum Development Network](#running-an-ethereum-development-network)
  - [Creating the Project Folder](#creating-the-project-folder)
  - [Deploying the Smart Contracts](#deploying-the-smart-contracts)
  - [Running the Database](#running-the-database)
  - [Running Parse Server](#running-parse-server)
  - [Creating your first object](#creating-your-first-object)
  - [Reading the object](#reading-the-object)
- [Learn More](#learn-more)
- [Feedback and Contribution](#feedback-and-contribution)

## Packages 

| Package | Name | Version
|--------|-----|------------|
| [Blockchain](https://github.com/parse-community/parse-server-blockchain/tree/master/packages/parse-blockchain-base) | [@parse/blockchain-base](https://www.npmjs.com/package/@parse/blockchain-base) | [![NPM Version](https://badge.fury.io/js/%40parse%2Fblockchain.svg)](https://www.npmjs.com/package/@parse/blockchain-base) |
| [Ethereum](https://github.com/parse-community/parse-server-blockchain/tree/master/packages/parse-blockchain-ethereum) | [@parse/blockchain-ethereum](https://www.npmjs.com/package/@parse/blockchain-ethereum) | [![NPM Version](https://badge.fury.io/js/%40parse%2Fethereum.svg)](https://www.npmjs.com/package/@parse/blockchain-ethereum) |

## How It Works

Using these packages in aggregation to Parse Server, it is possible to easily create hybrid dApps in which part of the data is saved on blockchain and part of the data is saved on the cloud.

Parse Server generates the APIs that you need to save and read data on the cloud (PostgreSQL or MongoDB). When setting up these packages, it is possible to select which objects must also be saved on blockchain.

Parse Server saves a copy of the blockchain objects on cloud and make sure they are sent to special smart contracts (ready to deploy versions are included in these packages) via blockchain transactions. Parse Server stores the status of the blockchain transactions and their receipts.

At anytime it is possible to query data on cloud via Parse Server APIs (including the transactions receipts) and verify the data on blockchain via smart contracts.

The dApps frontend can easily integrate to the APIs, via [REST](https://docs.parseplatform.org/rest/guide/), [GraphQL](https://docs.parseplatform.org/graphql/guide/), or one of the technology specific [SDKs](https://parseplatform.org/#sdks).

## Getting Started

### Running an Ethereum Development Network

You will need an Ethereum development network. With [Ganache](https://github.com/trufflesuite/ganache), it can be easily done using the command below:

```sh
npm install ganache-cli --global
ganache-cli --networkId 1000000000000 # it can be any id
```

Ganache will automatically start a development Ethereum network on your local machine which will listen on port 8545 by default. Once it is done, it will also automatically create and print a set of test accounts with 100 development ETH each. Copy the address and the private key of one of them to use for your smart contracts deployment and execution.

### Creating the Project Folder

Create a folder for your project and initialize the npm package:

```sh
mkdir my-project
cd my-project
npm init
```

Install the required packages:

```sh
npm install express parse-server @parse/blockchain-base @parse/blockchain-ethereum web3 --save
```

### Deploying the Smart Contracts

The @parse/blockchain-ethereum package (installed on the previous step) contains all smart contracts that you need to deploy. We will use [Truffle](https://github.com/trufflesuite/truffle) for the deployment.

First, you need to install Truffle:

```
npm install truffle @truffle/hdwallet-provider --global
```

Second, you need to create a `truffle-config.js` file in your project root folder with the following content:

```js
const path = require('path');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  contracts_directory: path.resolve(__dirname, './node_modules/@parse/blockchain-ethereum/contracts'),
  contracts_build_directory: path.resolve(__dirname, './node_modules/@parse/blockchain-ethereum/build/contracts'),
  migrations_directory: path.resolve(__dirname, './node_modules/@parse/blockchain-ethereum/migrations'),
  networks: {
    parseserverblockchaindev: {
      provider: () =>
        new HDWalletProvider(
          'THE ACCOUNT PRIVATE KEY', // Copy to here the private key of one of your Ganache auto-generated accounts
          'ws://127.0.0.1:8545'
        ),
      network_id: '1000000000000', // The same network id that you used on Ganache
      from: 'THE ACCOUNT ADDRESS', // Copy to here the address of one of your Ganache auto-generated accounts
    },
  },
};
```

Now, you are ready to deploy your smart contracts. From your project root folder, run:

```sh
truffle migrate --config ./truffle-config.js --network parseserverblockchaindev
```

Truffle will deploy the smart contracts to the development Ethereum network and will print out the addresses. Please copy the Parse contract address.

### Running the Database

We will use MongoDB as the database. An easy way to run MongoDB for development purposes is via [mongodb-runner](https://github.com/mongodb-js/runner):

```sh
npm install mongodb-runner --global
mongodb-runner start
```

mongodb-runner will automatically start a development MongoDB instance on your local machine which will listen on port 27017 by default.

### Running Parse Server

Create an `index.js` file in your project root folder with the following content:

```js
const express = require('express');
const { default: ParseServer } = require('parse-server');
const { SimpleMQAdapter, bridge, worker } = require('@parse/blockchain-base');
const { EthereumAdapter } = require('@parse/blockchain-ethereum');
const Web3 = require('web3');

const app = express();

const parseServer = new ParseServer({
  serverURL: 'http://localhost:1337/parse',
  appId: 'someappid',
  masterKey: 'somemasterkey',
  databaseURI: 'mongodb://localhost:27017/parseserverblockchaindev',
});

const mqAdapter = new SimpleMQAdapter();

const web3 = new Web3('ws://127.0.0.1:8545');
web3.eth.accounts.wallet.add(
   'THE ACCOUNT PRIVATE KEY', // Copy to here the private key that you used to deploy the contracts
);

bridge.initialize(
  ['SomeBlockchainClass'], // Pass here the name of the classes whose objects you want to send to blockchain
  mqAdapter
);
worker.initialize(
  new EthereumAdapter(
    web3,
    'THE CONTRACT ADDRESS', // Copy to here the Parse contract address that you copied after deploying it
    'THE ACCOUNT ADDRESS', // Copy to here the address that you used to deploy the contracts
  ),
  mqAdapter
);

app.use('/parse', parseServer.app);

app.listen(1337, () => {
  console.log('REST API running on http://localhost:1337/parse');
});
```

From your project root folder, start the server:

```sh
node index.js
```

A Parse Server instance will start on your local machine listening on port 1337.

### Creating your first object

You can easily create an object using the REST API:

```sh
curl -X POST \
-H "X-Parse-Application-Id: someappid" \
-H "Content-Type: application/json" \
-d '{"someField":"some value"}' \
http://localhost:1337/parse/classes/SomeBlockchainClass
```

This object will be sent to Parse Server, which will store it on MongoDB and send to the Ethereum development network.

### Reading the object

You can now query your objects using the REST API to see the status changes and the transaction receipt once it is confirmed.

```sh
curl -X GET \
-H "X-Parse-Application-Id: someappid" \
http://localhost:1337/parse/classes/SomeBlockchainClass
```

## Learn More

Learn more about Parse Server and its capabilities:

[Parse Platform Web-Site](https://parseplatform.org/)

[Parse Server Repository](https://github.com/parse-community/parse-server)

[Parse Community](https://community.parseplatform.org/)

## Feedback and Contribution

This is a work in progress repository. Please let us know your feedback via issues and feel free to open a PR to improve any code or documentation.

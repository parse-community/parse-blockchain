module.exports = {
  /**
   * The following values do not need to be modified for this example to work.
   */
  // The names of the classes whose objects you want to send to blockchain
  classNames: ['SomeBlockchainClass'],
  // The blockchain network ID; same as used for ganache in script `npm run prepare:network`
  networkId: '1000000000000',

  /**
   * The following values need to be modified for this example to work.
   */
  // Paste a public account address after running `npm run prepare:network`
  accountAddress: 'ACCOUNT_ADDRESS',
  // Paste a private account key after running `npm run prepare:network`
  accountPrivateKey: 'ACCOUNT_PRIVATE_KEY',
  // Paste the Parse contract address after running `npm run prepare:contract`
  contractAddress: 'CONTRACT_ADDRESS',
};

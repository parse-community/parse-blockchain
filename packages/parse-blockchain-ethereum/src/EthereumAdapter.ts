import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { BlockchainAdapter } from '@parse/blockchain-base';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Parse = (global as any).Parse;
const contractABI = require('../build/contracts/Parse.json').abi;

export default class EthereumAdapter implements BlockchainAdapter {
  private web3: Web3;
  private contract: Contract;
  private ownerAddress: string;

  constructor(web3: Web3, contractAddress: string, ownerAddress: string) {
    this.web3 = web3;
    this.contract = new this.web3.eth.Contract(contractABI, contractAddress);
    this.ownerAddress = ownerAddress;
  }

  async send(
    parseObjectFullJSON: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const methodCall = this.contract.methods.createObject(
      Parse.applicationId,
      parseObjectFullJSON.className,
      parseObjectFullJSON.objectId,
      JSON.stringify({
        ...parseObjectFullJSON,
        ...{
          __type: undefined,
          className: undefined,
          objectId: undefined,
          updatedAt: undefined,
        },
      })
    );
    const gas = await methodCall.estimateGas({
      from: this.ownerAddress,
    });
    return methodCall.send({
      from: this.ownerAddress,
      gas,
    });
  }

  async get(
    className: string,
    objectId: string
  ): Promise<Record<string, unknown>> {
    return JSON.parse(
      await this.contract.methods
        .getObjectJSON(Parse.applicationId, className, objectId)
        .call()
    );
  }
}

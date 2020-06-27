import { RPC, transformers } from 'ckb-js-toolkit';
import { CHAIN_SPECS } from './constants';
import { Config } from './interfaces';
import { Address, Amount } from './models';
import { EthSigner, Signer } from './signers';
import { Collector } from './collectors';
import { SimpleBuilder, Builder } from './builders';
import { Provider } from './providers';
import { Transaction } from '@ckb-lumos/types/lib/core';

export enum ChainID {
  ckb,
  ckb_testnet,
  ckb_dev,
}

/**
 * The default main class of pw-core
 */
export default class PWCore {
  static config: Config;
  static chainId: ChainID;
  static provider: Provider;
  static defaultCollector: Collector;

  private readonly _rpc: RPC;

  constructor(nodeUrl: string) {
    this._rpc = new RPC(nodeUrl);
  }

  /**
   * Initialize the environment required by pw-core
   */
  async init(
    provider: Provider,
    defaultCollector: Collector,
    chainId?: ChainID,
    config?: Config
  ): Promise<PWCore> {
    if (chainId) {
      if (!(chainId in ChainID)) {
        throw new Error(`invalid chainId ${chainId}`);
      }
      PWCore.chainId = chainId;
    } else {
      const info = await this.rpc.get_blockchain_info();
      PWCore.chainId = {
        ckb: ChainID.ckb,
        ckb_testnet: ChainID.ckb_testnet,
        ckb_dev: ChainID.ckb_dev,
      }[info.chain];
    }

    if (PWCore.chainId === ChainID.ckb_dev) {
      if (!config) {
        throw new Error('config must be provided for dev chain');
      }
      PWCore.config = config;
    } else {
      // merge customized config to default one
      PWCore.config = {
        ...[CHAIN_SPECS.Lina, CHAIN_SPECS.Aggron][PWCore.chainId],
        ...config,
      };
    }

    if (provider instanceof Provider) {
      PWCore.provider = await provider.init();
    } else {
      throw new Error('provider must be provided');
    }

    if (defaultCollector instanceof Collector) {
      PWCore.defaultCollector = defaultCollector;
    } else {
      throw new Error('defaultCollector must be provided');
    }

    return this;
  }

  /**
   * Return a RPC instance defined in package 'ckb-js-toolkit'
   */
  get rpc(): RPC {
    return this._rpc;
  }

  /**
   * Transfer CKB to any address
   * @param address The receiver's address
   * @param amount The amount of CKB to send
   * @param feeRate The feeRate (Shannon/KB) for this transaction.
   */
  async send(
    address: Address,
    amount: Amount,
    feeRate?: number
  ): Promise<string> {
    const simpleBuilder = new SimpleBuilder(address, amount, feeRate);
    const ethSigner = new EthSigner(PWCore.provider.address.addressString);
    return this.sendTransaction(simpleBuilder, ethSigner);
  }

  /** * Send an built transaction
   * @param builder
   * @param signer
   */
  async sendTransaction(tx: Transaction, signer: Signer): Promise<string>;

  /** * Build and send an custom transaction
   * @param builder
   * @param signer
   */
  async sendTransaction(builder: Builder, signer: Signer): Promise<string>;

  async sendTransaction(
    a: Transaction | Builder,
    signer: Signer
  ): Promise<string> {
    let tx = null;
    if (a instanceof Builder) {
      tx = await a.build();
    } else {
      tx = a;
    }
    tx.validate();
    return this.rpc.send_transaction(
      transformers.TransformTransaction(await signer.sign(tx))
    );
  }
}

import { Script } from '.';
import PWCore, { ChainID } from '../core';
import { HashType } from '../interfaces';
import {
  parseAddress,
  generateAddress,
  LumosConfigs,
  verifyCardanoAddress,
  verifyCkbAddress,
  verifyEthAddress,
  cellOccupiedBytes,
} from '../utils';
import {
  fullPayloadToAddress,
  AddressType as AType,
  AddressPrefix as APrefix,
} from '@nervosnetwork/ckb-sdk-utils';
import { Amount, AmountUnit } from './amount';

export enum AddressPrefix {
  ckb,
  ckt,
}

export enum AddressType {
  cardano,
  ckb,
  eth,
  // btc,
  // eos,
  // tron,
  // libra,
}

export enum LockType {
  default,
  multisig,
  pw,
}

export function getDefaultPrefix(): AddressPrefix {
  return PWCore.chainId === ChainID.ckb ? AddressPrefix.ckb : AddressPrefix.ckt;
}

export class Address {
  static fromLockScript(
    lockScript: Script,
    prefix: AddressPrefix = getDefaultPrefix()
  ): Address {
    const addressString = generateAddress(lockScript.serializeJson(), {
      config: LumosConfigs[prefix],
    });

    return new Address(addressString, AddressType.ckb);
  }

  constructor(
    readonly addressString: string,
    readonly addressType: AddressType
  ) {
    this.addressString = addressString.toLowerCase();
  }

  valid(): boolean {
    switch (this.addressType) {
      case AddressType.ckb:
        return verifyCkbAddress(this.addressString);
      case AddressType.eth:
        return verifyEthAddress(this.addressString);
      case AddressType.cardano:
        return verifyCardanoAddress(this.addressString);
      default:
        return true;
    }
  }

  minPaymentAmount(): Amount {
    if (this.isAcp()) {
      return new Amount('1', AmountUnit.shannon);
    }
    const bytes = cellOccupiedBytes({
      lock: this.toLockScript(),
      type: null,
      data: '0x',
    });
    return new Amount(bytes.toString());
  }

  isAcp(): boolean {
    const script = this.toLockScript();
    const { codeHash, hashType } = script;
    const acpLock = PWCore.config.acpLockList.filter(
      (x) => x.codeHash === codeHash && x.hashType === hashType
    );
    return acpLock && acpLock.length > 0;
  }

  toCKBAddress(): string {
    if (this.addressType === AddressType.ckb) {
      return this.addressString;
    }

    const { args, codeHash, hashType } = this.toLockScript();

    return fullPayloadToAddress({
      arg: args,
      codeHash,
      type:
        hashType === HashType.data ? AType.DataCodeHash : AType.TypeCodeHash,
      prefix:
        getDefaultPrefix() === AddressPrefix.ckb
          ? APrefix.Mainnet
          : APrefix.Testnet,
    });
  }

  toLockScript(): Script {
    if (this.addressType !== AddressType.ckb) {
      const { codeHash, hashType } = PWCore.config.pwLock.script;
      return new Script(codeHash, this.addressString, hashType);
    }

    const lock = parseAddress(this.addressString, {
      config: LumosConfigs[getDefaultPrefix()],
    });
    return new Script(lock.code_hash, lock.args, HashType[lock.hash_type]);
  }
}

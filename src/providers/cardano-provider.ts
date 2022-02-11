import { Provider, Platform } from './provider';
import { Address, AddressType } from '..';

export class CardanoProvider extends Provider {
  onAddressChanged: (newAddress: Address) => void;
  constructor(onAddressChanged?: (newAddress: Address) => void) {
    super(Platform.cardano);
    this.onAddressChanged = onAddressChanged;
    this.sign("blah");
  }
  async init(): Promise<Provider> {
    if (typeof window.cardano !== 'undefined' && typeof window.cardano.nami !== 'undefined') {
      const namiApi = await window.cardano.enable();
      const accounts = await namiApi.getUsedAddresses();
      this.address = new Address(accounts[0], AddressType.cardano);

      if (!!namiApi.experimental.on) {
        namiApi.experimental.on('accountChange', (newAccounts: string[]) => {
          this.address = new Address(newAccounts[0], AddressType.cardano);
          if (!!this.onAddressChanged) {
            this.onAddressChanged(this.address);
          }
        });
      }

      return this;
    } else {
      throw new Error(
        'window.cardano or window.cardano.nami is undefined, Cardano environment is required. Nami is only supported at the moment.'
      );
    }
  }

  async sign(message: string): Promise<string> {
    //const from = this.address.addressString;
    const namiApi = await window.cardano.nami.enable();
    //checkout exmaple in message-siging repo, also CIP-0008 could help
    const ms = await import('@emurgo/cardano-message-signing-browser');
    const serialization = await import('@emurgo/cardano-serialization-lib-browser');
    const protectedHeaders = ms.HeaderMap.new();
    const protectedSerialized = ms.ProtectedHeaderMap.new(protectedHeaders);
    const unprotected = ms.HeaderMap.new();
    const headers = ms.Headers.new(protectedSerialized, unprotected);
    const tempUInt8Arr = serialization.TransactionHash.from_bytes(Buffer.from('8561258e210352fba2ac0488afed67b3427a27ccf1d41ec030c98a8199bc22ec', 'hex')).to_bytes()

    const builder = ms.COSESign1Builder.new(headers, tempUInt8Arr, false);
    console.log('builder: ', ms.COSESign1Builder.new(headers, tempUInt8Arr, false));
    const toSign = builder.make_data_to_sign();
    console.log('toSignfn ', builder.make_data_to_sign());
    console.log('toSign: ', toSign);
    console.log('addr: ', serialization.Address);
    console.log('signData: ', await namiApi.signData(this.address, toSign));
    const result = await namiApi.signData(this.address, toSign);
    console.log('result: ', result);

    return message; //temp fix to satisfy warnings
  }

  async close() {
    console.log('do nothing');
  }
}

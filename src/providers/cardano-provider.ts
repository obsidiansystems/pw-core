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
    const namiApi = await window.cardano.enable();
    //checkout exmaple in message-siging repo, also CIP-0008 could help
    const msgSignLib = await import('@emurgo/cardano-message-signing-browser');

    const protectedHeaders = msgSignLib.HeaderMap.new();
    console.log(protectedHeaders);
//    console.log(msgSignLib.COSESign1Builder.new());
    //namiApi.

    return message; //temp fix to satisfy warnings
  }

  async close() {
    console.log('do nothing');
  }
}

const { hdkey } = require('ethereumjs-wallet');
const SimpleKeyring = require('eth-simple-keyring');
const bip39 = require('bip39');
const { normalize } = require('@metamask/eth-sig-util');

// Options:
const hdPathString = `m/44'/60'/0'/0`;
const type = 'HD Key Tree';

const bytePrefixes = [
  '00',
  '0a',
  '0b',
  '0c',
  '1a',
  '2a',
  '3a',
  '1b',
  '2b',
  '3b',
  '1c',
  '2c',
  '3c',
];

class HdKeyring extends SimpleKeyring {
  /* PUBLIC METHODS */
  constructor(opts = {}) {
    super();
    this.type = type;
    this.deserialize(opts);
  }

  serialize() {
    return Promise.resolve({
      mnemonic: this.mnemonic,
      numberOfAccounts: this.wallets.length,
      hdPath: this.hdPath,
    });
  }

  deserialize(opts = {}) {
    this.opts = opts || {};
    this.wallets = [];
    this.mnemonic = null;
    this.root = null;
    this.hdPath = opts.hdPath || hdPathString;

    if (opts.mnemonic) {
      this._initFromMnemonic(opts.mnemonic);
    }

    if (opts.numberOfAccounts) {
      return this.addAccounts(opts.numberOfAccounts);
    }

    if (opts.addAccountsWithPrefixes) {
      return this.addAccountsWithPrefixes(opts.addAccountsWithPrefixes);
    }

    return Promise.resolve([]);
  }

  addAccounts(numberOfAccounts = 1) {
    if (!this.root) {
      this._initFromMnemonic(bip39.generateMnemonic());
    }

    const oldLen = this.wallets.length;
    const newWallets = [];
    for (let i = oldLen; i < numberOfAccounts + oldLen; i++) {
      const child = this.root.deriveChild(i);
      const wallet = child.getWallet();
      newWallets.push(wallet);
      this.wallets.push(wallet);
    }
    const hexWallets = newWallets.map((w) => {
      return normalize(w.getAddress().toString('hex'));
    });
    return Promise.resolve(hexWallets);
  }

  addAccountsWithPrefixes(prefixes = bytePrefixes) {
    if (!this.root) {
      this._initFromMnemonic(bip39.generateMnemonic());
    }

    const oldLen = this.wallets.length;
    const newWallets = [];
    const validRange = new Array(prefixes.length).fill(false);
    let i = 0;
    while (!validRange.every((v) => v === true)) {
      const child = this.root.deriveChild(i);
      const wallet = child.getWallet();
      let addr = wallet.getAddress().toString('hex');
      let prefix = addr.substring(0, 2);
      let index = prefixes.indexOf(prefix);
      if (index > -1 && validRange[index] != true) {
        validRange[index] = true;
      }
      newWallets.push(wallet);
      this.wallets.push(wallet);
      i++;
    }

    const hexWallets = newWallets.map((w) => {
      return normalize(w.getAddress().toString('hex'));
    });
    return Promise.resolve(hexWallets);
  }

  getAccounts() {
    return Promise.resolve(
      this.wallets.map((w) => {
        return normalize(w.getAddress().toString('hex'));
      }),
    );
  }

  /* PRIVATE METHODS */

  _initFromMnemonic(mnemonic) {
    this.mnemonic = mnemonic;
    const seed = bip39.mnemonicToSeed(mnemonic);
    this.hdWallet = hdkey.fromMasterSeed(seed);
    this.root = this.hdWallet.derivePath(this.hdPath);
  }
}

HdKeyring.type = type;
module.exports = HdKeyring;

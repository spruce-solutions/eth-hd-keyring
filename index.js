const { hdkey } = require('ethereumjs-wallet');
const SimpleKeyring = require('eth-simple-keyring');
const bip39 = require('bip39');
const { normalize } = require('@metamask/eth-sig-util');

// Options:
const hdPathString = `m/44'/60'/0'/0`;
const type = 'HD Key Tree';

const byteRange = ['00', '81'];

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

    if (opts.prefixRange) {
      return this.addAccountsWithByteRange(opts.prefixRange);
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

  addAccountsWithByteRange(range = byteRange) {
    if (!this.root) {
      this._initFromMnemonic(bip39.generateMnemonic());
    }

    const newWallets = [];
    const start = parseInt(Number('0x' + range[0]), 10);
    const end = parseInt(Number('0x' + range[1]), 10);
    let i = this.wallets.length;
    var validAddr = false;
    while (!validAddr) {
      const child = this.root.deriveChild(i);
      const wallet = child.getWallet();
      let addr = wallet.getAddress().toString('hex');
      let prefix = addr.substring(0, 2);
      let parsed = parseInt(Number('0x' + prefix), 10);
      if (parsed >= start && parsed <= end) {
        validAddr = true;
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

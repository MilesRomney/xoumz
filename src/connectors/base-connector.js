import { definePropertyRW } from '../utils';

(function(root) {
  class BaseConnector {
    constructor(_opts) {
      var opts = Object.assign({}, _opts || {});

      definePropertyRW(this, 'options', opts);
      definePropertyRW(this, 'context', undefined, () => this.options.context, (val) => this.options.context = val);
      definePropertyRW(this, 'readable', undefined, () => this.options.read, (val) => this.options.read = val);
      definePropertyRW(this, 'writable', undefined, () => this.options.write, (val) => this.options.write = val);
    }

    async query() {
      throw new Error(`Connector [#{this.context}] doesn't support queries`);
    }

    async write() {
      throw new Error(`Connector [#{this.context}] doesn't support writing`);
    }
  }

  Object.assign(root, {
    BaseConnector
  });
})(module.exports);

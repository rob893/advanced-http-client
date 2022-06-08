import { AdvancedHttpClient } from '../AdvancedHttpClient';

describe('AdvancedHttpClient', () => {
  describe('constructor', () => {
    it('should create a new instance of AdvancedHttpClient', () => {
      const res = new AdvancedHttpClient();

      expect(res).toBeInstanceOf(AdvancedHttpClient);
    });
  });
});

import { BcryptPasswordHasher } from '@auth-service/infrastructure/security/bcrypt-password-hasher';

describe('BcryptPasswordHasher', () => {
  let passwordHasher: BcryptPasswordHasher;

  beforeEach(() => {
    passwordHasher = new BcryptPasswordHasher();
  });

  describe('hash', () => {
    it('should return a hash of the password', async () => {
      const password = 'password123';
      const hash = await passwordHasher.hash(password);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
    });
  });

  describe('compare', () => {
    it('should return true for a matching password and hash', async () => {
      const password = 'password123';
      const hash = await passwordHasher.hash(password);
      const result = await passwordHasher.compare(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for a non-matching password and hash', async () => {
      const password = 'password123';
      const wrongPassword = 'wrongpassword';
      const hash = await passwordHasher.hash(password);
      const result = await passwordHasher.compare(wrongPassword, hash);
      expect(result).toBe(false);
    });
  });
});

import { UserCredential } from '@auth-service/domain/user-credential.entity';

describe('UserCredential Entity', () => {
  it('should create a user credential with a valid user ID and password hash', () => {
    const credential = new UserCredential('1', 'user-123', 'hashed_password');
    expect(credential).toBeDefined();
    expect(credential.userId).toBe('user-123');
    expect(credential.passwordHash).toBe('hashed_password');
  });

  it('should throw an error if the user ID is empty', () => {
    expect(() => new UserCredential('1', '', 'hashed_password')).toThrow(
      'User ID cannot be empty',
    );
  });

  it('should throw an error if the password hash is empty', () => {
    expect(() => new UserCredential('1', 'user-123', '')).toThrow(
      'Password hash cannot be empty',
    );
  });

  it('should throw an error if the user ID is null', () => {
    expect(() => new UserCredential('1', null, 'hashed_password')).toThrow(
      'User ID cannot be empty',
    );
  });

  it('should throw an error if the password hash is undefined', () => {
    expect(() => new UserCredential('1', 'user-123', undefined)).toThrow(
      'Password hash cannot be empty',
    );
  });
});

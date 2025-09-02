import { User } from '@auth-service/domain/user.entity';
import { Role } from '@prisma/client';

describe('User Entity', () => {
  it('should create a user with a valid email and name', () => {
    const user = new User('1', 'John Doe', 'john.doe@example.com', Role.USER);
    expect(user).toBeDefined();
    expect(user.id).toBe('1');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john.doe@example.com');
  });

  it('should throw an error if the email is invalid', () => {
    expect(() => new User('1', 'John Doe', 'invalid-email', Role.USER)).toThrow(
      'Invalid email format',
    );
  });

  it('should handle null or undefined names gracefully', () => {
    const user = new User('1', null, 'john.doe@example.com', Role.USER);
    expect(user.name).toBeNull();
  });

  it('should throw an error if the id is empty', () => {
    expect(
      () => new User('', 'John Doe', 'john.doe@example.com', Role.USER),
    ).toThrow('User ID cannot be empty');
  });

  it('should throw an error if the name is empty', () => {
    expect(() => new User('1', '', 'john.doe@example.com', Role.USER)).toThrow(
      'User name cannot be empty',
    );
  });

  it('should correctly assign the role', () => {
    const user = new User('1', 'Admin User', 'admin@example.com', Role.ADMIN);
    expect(user.role).toBe(Role.ADMIN);
  });
});

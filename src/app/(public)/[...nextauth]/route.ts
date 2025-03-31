import NextAuth, { type AuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import bcrypt from 'bcrypt';

import { PATHS } from '@/constants/paths';
import User from '@/server/db/schemas/user';

interface User {
  id: number;
  name: string;
  username: string;
  hashedPassword: string;
  role: string;
}

async function verifyUser(email: string, password: string) {
  // Replace with actual database query
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('User does not exist');
  }

  const isPasswordMatched = await bcrypt.compare(password, user.hashedPassword);

  if (!isPasswordMatched) {
    return null;
  }

  return user;
}

const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        if (!credentials.email || !credentials.password) {
          throw new Error('Please enter your email and password');
        }

        const user = await verifyUser(credentials.email, credentials.password);

        if (!user) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.username,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: PATHS.SIGN_IN,
    signOut: PATHS.HOME,
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

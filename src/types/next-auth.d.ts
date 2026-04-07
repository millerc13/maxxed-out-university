import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
      mustChangePassword: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
    mustChangePassword: boolean;
  }
}

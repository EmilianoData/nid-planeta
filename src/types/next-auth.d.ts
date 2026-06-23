import 'next-auth';

declare module 'next-auth' {
  interface User {
    nome: string;
    role: 'STUDENT' | 'ADMIN';
  }
  interface Session {
    user: {
      id: string;
      email: string;
      nome: string;
      role: 'STUDENT' | 'ADMIN';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: string;
    nome: string;
    role: 'STUDENT' | 'ADMIN';
  }
}

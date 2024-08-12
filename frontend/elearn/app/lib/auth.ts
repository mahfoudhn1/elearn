import { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

// Dummy provider for TypeScript compliance

export const authConfig: NextAuthOptions = {
  providers: [
    // Include a dummy provider to satisfy TypeScript requirements
   
  ],
  pages: {
    signIn: '/auth/signin', // Custom sign-in page
  },
  session: {
    strategy: "jwt", // Use JWT strategy if needed
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      // Customize session callback if needed
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: any }) {
      // Customize JWT callback if needed
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
  },
};



// import { NextAuthOptions, User, getServerSession } from "next-auth";
// import { useSession } from "next-auth/react";

// import GoogleProvider from "next-auth/providers/google";


// export const authConfig: NextAuthOptions = {
//   providers: [
    
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID as string,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
//     }),
 
//   ],
// };


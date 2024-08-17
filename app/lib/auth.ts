import { NextAuthOptions } from "next-auth";
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions : NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                address: {
                    label: 'Address',
                    type: 'text',
                    placeholder: '0x0',
                },
            },
            async authorize(credentials) {
                return {
                    id: credentials?.address,
                } as any
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, token } : any) {
            session.address = token.sub
            session.user!.name = token.sub
            return session
        },
    },
}
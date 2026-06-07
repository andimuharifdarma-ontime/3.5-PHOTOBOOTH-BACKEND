import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email dan password diperlukan");
                }

                try {
                    const user = await prisma.adminUser.findUnique({
                        where: { email: credentials.email }
                    });

                    if (!user || !user.password) {
                        // Generic message to prevent user enumeration
                        throw new Error("Email atau password salah");
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);

                    if (!isValid) {
                        // Same generic message for wrong password
                        throw new Error("Email atau password salah");
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        canManageThemes: user.canManageThemes,
                        isPaymentEnabled: user.isPaymentEnabled
                    };
                } catch (error: any) {
                    if (error.message === "Email atau password salah") {
                        throw error;
                    }
                    console.error("Auth error:", error);
                    throw new Error("Gagal terhubung ke database. Silakan hubungi admin.");
                }
            }
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
                token.canManageThemes = (user as any).canManageThemes;
                token.isPaymentEnabled = (user as any).isPaymentEnabled;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                (session.user as any).canManageThemes = token.canManageThemes;
                (session.user as any).isPaymentEnabled = token.isPaymentEnabled;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours — appropriate for photobooth business hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};

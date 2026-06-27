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
                        where: { email: credentials.email },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            password: true,
                            role: true,
                            canManageThemes: true,
                            isPaymentEnabled: true,
                        },
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
                    console.error("Auth DB error:", {
                        code: error?.code,
                        message: error?.message,
                    });
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
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                if (!user?.email) return false;
                const adminUser = await prisma.adminUser.findUnique({
                    where: { email: user.email },
                });
                if (!adminUser) {
                    return '/login?error=AccessDenied';
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user?.email && account?.provider === 'google') {
                const adminUser = await prisma.adminUser.findUnique({
                    where: { email: user.email },
                });
                if (adminUser) {
                    token.role = adminUser.role;
                    token.id = adminUser.id;
                    token.canManageThemes = adminUser.canManageThemes;
                    token.isPaymentEnabled = adminUser.isPaymentEnabled;
                }
            } else if (user) {
                token.role = (user as any).role;
                token.id = user.id;
                token.canManageThemes = (user as any).canManageThemes;
                token.isPaymentEnabled = (user as any).isPaymentEnabled;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user?.email) {
                const dbUser = await prisma.adminUser.findUnique({
                    where: { email: session.user.email },
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        canManageThemes: true,
                        isPaymentEnabled: true,
                    },
                });

                if (dbUser) {
                    session.user.name = dbUser.name ?? session.user.name;
                    (session.user as any).id = dbUser.id;
                    (session.user as any).role = dbUser.role;
                    (session.user as any).canManageThemes = dbUser.canManageThemes;
                    (session.user as any).isPaymentEnabled = dbUser.isPaymentEnabled;
                } else {
                    (session.user as any).role = undefined;
                }
            } else if (session.user) {
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

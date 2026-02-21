import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma } from "../db/index.js";
import { generateId } from "@quizzquizz/common";

/**
 * Better Auth configuration for QuizzQuizz
 * 
 * Uses our custom Prisma schema with:
 * - DateTime timestamps (compatible with Better Auth)
 * - Custom ID generation (UUID v4)
 * - Username required for better UX
 * - No email verification (password-only auth)
 * - OAuth support (Google, GitHub)
 */

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
  basePath: "/api/auth", // Mount path for auth routes
  database: prismaAdapter(getPrisma(), {
    provider: "sqlite"
  }),
  
  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // No email verification per requirements
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  
  // User configuration
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
        input: true,
      },
    },
    changeEmail: {
      enabled: false, // Phase 9F+
    },
  },
  
  // Account linking for OAuth
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  
  // Social providers (to be configured in Phase 9F+)
  socialProviders: {
    google: {
      enabled: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      enabled: !!process.env.GITHUB_CLIENT_ID,
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },
  
  // Advanced options
  advanced: {
    generateId: () => generateId(),
    cookieSameSite: "lax",
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  
  // Rate limiting
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test", // Disable in test environment
    window: 60, // 1 minute
    max: 10, // 10 requests per minute
    storage: "memory", // Use in-memory storage (upgrade to Redis in production)
  },
});

// Export types for TypeScript
export type Auth = typeof auth;

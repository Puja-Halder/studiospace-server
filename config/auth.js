
import "dotenv/config";
import { betterAuth } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";
import { Resend } from "resend";

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const database = mongoClient.db();
const resend = new Resend(process.env.RESEND_API_KEY);

const isValidRole = (role) => {
  return role === "customer" || role === "host";
};

export const connectAuthDB = async () => {
  await mongoClient.connect();
  console.log("Better Auth connected to MongoDB successfully!");
};

export const auth = betterAuth({
  database: mongodbAdapter(database, {
    client: mongoClient,
  }),

  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  user: {
    additionalFields: {
      role: {
        type: ["customer", "host"],
        required: false,
        defaultValue: "customer",
        input: true,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (context.path === "/callback/:id") {
            const oauthData = await getOAuthState();
            const requestedRole = oauthData?.role;

            return {
              data: {
                ...user,
                role: isValidRole(requestedRole)
                  ? requestedRole
                  : "customer",
              },
            };
          }

          return {
            data: {
              ...user,
              role: isValidRole(user.role) ? user.role : "customer",
            },
          };
        },
      },
    },
  },

  trustedOrigins: [
    "http://localhost:3000",
    "https://studiospace-client-one-eta.vercel.app",
  ],

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: true,
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const { data, error } = await resend.emails.send({
        from: "StudioSpace <onboarding@resend.dev>",
        to: user.email,
        subject: "Verify your StudioSpace email",
        html: `
          <div>
            <h2>Welcome to StudioSpace!</h2>
            <p>Please verify your email address by clicking the button below.</p>
            <a href="${url}">Verify Email</a>
            <p>If you did not create a StudioSpace account, you can ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend email error:", error);
        throw new Error("Unable to send verification email.");
      }

      console.log("Verification email sent:", data.id);
    },

    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});

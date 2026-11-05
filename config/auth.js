
import "dotenv/config";
import { betterAuth } from "better-auth";
import { getOAuthState } from "better-auth/api";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

const mongoClient = new MongoClient(process.env.MONGODB_URI);
const database = mongoClient.db();

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
              role: isValidRole(user.role)
                ? user.role
                : "customer",
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
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});

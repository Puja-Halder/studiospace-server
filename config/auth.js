import "dotenv/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

const mongoClient = new MongoClient(process.env.MONGODB_URI);

const database = mongoClient.db();

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

  trustedOrigins: ["http://localhost:3000"],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
});
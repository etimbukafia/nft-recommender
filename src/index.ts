import dotenv from "dotenv";
import { ApolloServer } from '@apollo/server';
import { resolvers } from "../graphql/resolvers/index.resolvers";
import { typeDefs } from "../graphql/typeDefs/index.typeDefs";
import express from 'express';
import cors from 'cors';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { connectPcMiddleware } from "./middleware/pineconeMiddleware";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import http from "http";
import { connectDb } from "./config/mongo.config";

dotenv.config();

const PORT = process.env.PORT || 5000;
const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
const httpServer = http.createServer(app)

const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })], // Add the plugin
});

// Function to start the server
const startServer = async () => {
    try {
        await connectDb();

        // Start Apollo Server
        await server.start();

        app.use(
            '/graphql',
            cors<cors.CorsRequest>(),
            express.json(),
            expressMiddleware(server, {
                context: async () => {
                    const pineconeConnection = await connectPcMiddleware(); // Initialize Pinecone
                    return { pineconeConnection }; // Provide connection in context
                },
            })
        );

        await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
        console.log(`🚀 Server is running at http://localhost:${PORT}/graphql`);
    } catch (error) {
        console.error("Error during server startup:", error);
        process.exit(1)
    }
}

startServer();




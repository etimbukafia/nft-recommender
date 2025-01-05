import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from "dotenv";

dotenv.config();

const pinecone_api_key = process.env.PINECONE_API_KEY;

// Global variable to persist the connection
let pineconeConnection: Pinecone | null = null; // Global cache for connection

export const connectPc = async () => {

    // Reuse the existing connection if available
    if (pineconeConnection) {
        console.log("Reusing existing Pinecone connection");
        return pineconeConnection;
    }

    console.log("Creating new Pinecone connection...");
    try {
        if (!pinecone_api_key) {
            throw new Error('pinecone api key not found')
        }

        const pc = new Pinecone({
            apiKey: pinecone_api_key
        });

        const index_name = process.env.PINECONE_INDEX_NAME;

        if (!index_name) {
            throw new Error("Index name not found")
        }

        // Check if the index already exists
        const existingIndexes = await pc.listIndexes();

        if (!existingIndexes?.indexes?.some((index) => index.name === index_name)) {
            console.log(`Creating index: ${index_name}`);
            await pc.createIndex({
                name: index_name,
                dimension: 512,
                metric: "cosine",
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1',
                    }
                },
                deletionProtection: 'disabled',
            });

            console.log(`Index ${index_name} created successfully.`);
        }

        const index = pc.index(index_name)
        console.log(`Connected to ${index_name}`)
        return index;

    } catch (error: any) {
        console.error('Error connecting to Pinecone: ', error.message);
        throw new Error(error.message);
    }
};




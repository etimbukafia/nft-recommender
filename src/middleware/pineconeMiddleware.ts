import { connectPc } from "../config/pinecone.config";


let cachedConnection: any = null; // Cache the connection globally

export const connectPcMiddleware = async () => {
    try {

        // Reuse cached connection if it exists
        if (cachedConnection) {
            console.log('Reusing existing Pinecone connection.');
            return cachedConnection;
        }

        console.log('Creating new Pinecone connection...');
        const pineconeConnection = await connectPc(); // Initialize Pinecone connection

        // Cache the connection
        cachedConnection = pineconeConnection;
        return cachedConnection;

    } catch (error) {
        console.error('Error initializing Pinecone connection:', error);
        throw error;
    }
};
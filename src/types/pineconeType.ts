import { Index } from "@pinecone-database/pinecone";

export type PineconeContext = {
    pineconeConnection: Index;
};
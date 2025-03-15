import dotenv from 'dotenv';
import Moralis from 'moralis';
import { GraphQLError } from 'graphql';
import { NftData } from '../../models/index.models';
import { error } from 'console';
import axios from 'axios';
import { zip } from '../../src/utils/zip';
import { PineconeContext } from '../../src/types/pineconeType';
import lodash from 'lodash';
import { NFTInterface } from '../../src/types/interfaces';

dotenv.config();

const moralis_api_key = process.env.MORALIS_API_KEY;

if (!moralis_api_key) {
    throw new Error('moralis api key not found')
};

export const NFTResolvers: Record<string, any> = {
    Mutation: {
        async getNFTData(_: any,
            { input }: { input: { address: string; chain: string; } },
            context: PineconeContext
        ): Promise<{ success: boolean; message?: string; }> {
            try {
                const { address } = input;

                if (!address) {
                    throw new GraphQLError('All fields are required', {
                        extensions: {
                            code: 'INCOMPLETE_INPUT',
                        },
                    });
                }

                // Accessing Pinecone connection from context
                const nft_index = context.pineconeConnection;

                await Moralis.start({
                    apiKey: moralis_api_key
                });

                const moralisResponse = await Moralis.EvmApi.nft.getWalletNFTs({
                    "chain": "0x1",
                    "format": "decimal",
                    "normalizeMetadata": true,
                    "mediaItems": true,
                    "address": address
                });

                if (!moralisResponse) {
                    throw new GraphQLError('An error occured', {
                        extensions: {
                            code: 'UNEXPECTED_ERROR',
                        },
                    });
                }

                /*
                const result = lodash.find(response.raw.result, item => String(item.token_id) === '8070');
                console.log(result);
                

                const nft = response.raw.result[8070]
                const ipfsGateway = "https://ipfs.io/ipfs/";
                const ipfs_url = "ipfs://"
                const image_url =
                    (nft.normalized_metadata?.image?.startsWith(ipfs_url)
                        ? nft.normalized_metadata?.image?.replace(ipfs_url, ipfsGateway)
                        : nft.normalized_metadata?.image) || '';

                console.log(image_url)
                */

                // Dictionary to pass to CLIP model docker endpoint
                const nftResponseDict = new Map<string, string>();
                const ipfsGateway = "https://ipfs.io/ipfs/";
                const ipfs_url = "ipfs://"

                moralisResponse.raw.result.forEach((nft: any) => {
                    const image_url =
                        (nft.normalized_metadata?.image?.startsWith(ipfs_url)
                            ? nft.normalized_metadata?.image.replace(ipfs_url, ipfsGateway)
                            : nft.normalized_metadata?.image);

                    nftResponseDict.set(nft.token_id, image_url || nft.metadata?.image)
                })

                const batch_size = 10
                const entries = Array.from(nftResponseDict.entries()); // Converting map to array
                const batches = []

                for (let i = 0; i < entries.length; i += batch_size) {
                    batches.push(entries.slice(i, i + batch_size));
                }

                // Processing batches
                await Promise.all(
                    batches.map(async (batch) => {
                        const payload = {
                            nft_data: Object.fromEntries(batch), // Converting batch back to object
                        };

                        try {
                            const response = await axios.post('http://0.0.0.0:4000/embed', payload)
                            console.log('Data sent: ', payload);
                            console.log('Batch processed:', response.data);

                            // Extracting embeddings from response
                            const embeddingResponse = response.data.response

                            // Upserting embeddings into Pinecone
                            await nft_index.upsert(embeddingResponse)
                            console.log("message : Embeddings upserted Successfully")

                        } catch (error: any) {
                            console.error("Error processing batch:", error.message || error);
                            throw new Error(`Upsert failed: ${error.message}`);
                        }
                    })
                );

                await Promise.all(
                    moralisResponse.raw.result.map(async (nft: any, index: number) => {
                        try {
                            const newNft = new NftData({
                                token_id: nft.token_id,
                                token_address: nft.token_address,
                                contract_type: nft.contract_type,
                                name: nft.name,
                                symbol: nft.symbol,
                                token_hash: nft.token_hash,
                                token_uri: nft.token_uri,
                                image_url: nft.normalized_metadata?.image || '',
                                metadata_description: nft.normalized_metadata?.description || nft.metadata || '',
                                metadata_attributes: nft.normalized_metadata?.attributes || ''
                            });
                            await newNft.save();

                        } catch (error: any) {
                            console.error(`Error saving NFT at index ${index}:`, error);
                            throw new Error(error.message);
                        }
                    })
                );
                return {
                    success: true,
                    message: "Data upserted to pinecone mongo succesfully"
                };

            } catch (error: any) {
                if (error instanceof GraphQLError) {
                    throw error;
                }

                console.error('Unexpected error:', error);

                throw new GraphQLError(
                    error.message || 'An unexpected error occured',
                    {
                        extensions: {
                            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
                        },
                    }
                );
            }
        },

        async getUserNFTData(_: any,
            { input }: { input: { address: string } },
            context: PineconeContext
        ): Promise<{ success: boolean; message?: string; }> {
            try {
                const { address } = input;

                if (!address) {
                    throw new GraphQLError('All fields are required', {
                        extensions: {
                            code: 'INCOMPLETE_INPUT',
                        },
                    });
                }

                // Accessing Pinecone connection from context
                const nft_index = context.pineconeConnection;

                await Moralis.start({
                    apiKey: moralis_api_key
                });

                const walletNftTransfersResult = await Moralis.EvmApi.nft.getWalletNFTTransfers({
                    "chain": "0x1",
                    "format": "decimal",
                    "order": "DESC",
                    "limit": 50,
                    "address": address
                });

                if (!walletNftTransfersResult) {
                    throw new GraphQLError('An error occured', {
                        extensions: {
                            code: 'UNEXPECTED_ERROR',
                        },
                    });
                }

                /*
                const result = lodash.find(response.raw.result, item => String(item.token_id) === '8070');
                console.log(result);
                

                const nft = response.raw.result[8070]
                const ipfsGateway = "https://ipfs.io/ipfs/";
                const ipfs_url = "ipfs://"
                const image_url =
                    (nft.normalized_metadata?.image?.startsWith(ipfs_url)
                        ? nft.normalized_metadata?.image?.replace(ipfs_url, ipfsGateway)
                        : nft.normalized_metadata?.image) || '';

                console.log(image_url)
                */

                let filteredTransactions = walletNftTransfersResult.raw.result.forEach((nft: any) => {
                    if (nft.to_address == address.toLowerCase())
                })


                // Dictionary to pass to CLIP model docker endpoint
                const nftResponseDict = new Map<string, string>();
                const ipfsGateway = "https://ipfs.io/ipfs/";
                const ipfs_url = "ipfs://"

                moralisResponse.raw.result.forEach((nft: any) => {
                    const image_url =
                        (nft.normalized_metadata?.image?.startsWith(ipfs_url)
                            ? nft.normalized_metadata?.image.replace(ipfs_url, ipfsGateway)
                            : nft.normalized_metadata?.image);

                    nftResponseDict.set(nft.token_id, image_url || nft.metadata?.image)
                })

                const batch_size = 10
                const entries = Array.from(nftResponseDict.entries()); // Converting map to array
                const batches = []

                for (let i = 0; i < entries.length; i += batch_size) {
                    batches.push(entries.slice(i, i + batch_size));
                }

                // Processing batches
                await Promise.all(
                    batches.map(async (batch) => {
                        const payload = {
                            nft_data: Object.fromEntries(batch), // Converting batch back to object
                        };

                        try {
                            const response = await axios.post('http://0.0.0.0:4000/embed', payload)
                            console.log('Data sent: ', payload);
                            console.log('Batch processed:', response.data);

                            // Extracting embeddings from response
                            const embeddingResponse = response.data.response

                            // Upserting embeddings into Pinecone
                            await nft_index.upsert(embeddingResponse)
                            console.log("message : Embeddings upserted Successfully")

                        } catch (error: any) {
                            console.error("Error processing batch:", error.message || error);
                            throw new Error(`Upsert failed: ${error.message}`);
                        }
                    })
                );

                await Promise.all(
                    moralisResponse.raw.result.map(async (nft: any, index: number) => {
                        try {
                            const newNft = new NftData({
                                token_id: nft.token_id,
                                token_address: nft.token_address,
                                contract_type: nft.contract_type,
                                name: nft.name,
                                symbol: nft.symbol,
                                token_hash: nft.token_hash,
                                token_uri: nft.token_uri,
                                image_url: nft.normalized_metadata?.image || '',
                                metadata_description: nft.normalized_metadata?.description || nft.metadata || '',
                                metadata_attributes: nft.normalized_metadata?.attributes || ''
                            });
                            await newNft.save();

                        } catch (error: any) {
                            console.error(`Error saving NFT at index ${index}:`, error);
                            throw new Error(error.message);
                        }
                    })
                );
                return {
                    success: true,
                    message: "Data upserted to pinecone mongo succesfully"
                };

            } catch (error: any) {
                if (error instanceof GraphQLError) {
                    throw error;
                }

                console.error('Unexpected error:', error);

                throw new GraphQLError(
                    error.message || 'An unexpected error occured',
                    {
                        extensions: {
                            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
                        },
                    }
                );
            }
        },
    }
}


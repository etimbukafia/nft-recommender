import mongoose, { Schema, model, ObjectId, Document } from 'mongoose';

export interface NftType extends Document {
    token_id?: string;
    token_address?: string;
    contract_type?: string;
    name?: string;
    symbol?: string;
    token_hash?: string;
    token_uri?: string;
    image_url?: string;
    metadata_description?: string;
    metadata_attributes?: object;
}

const nftSchema = new Schema(
    {
        token_id: {
            type: String
        },
        token_address: {
            type: String
        },
        contract_type: {
            type: String
        },
        name: {
            type: String
        },
        symbol: {
            type: String
        },
        token_hash: {
            type: String
        },
        token_uri: {
            type: String
        },
        image_url: {
            type: String
        },
        metadata_description: {
            type: String
        },
        metadata_attributes: {
            type: Schema.Types.Mixed
        }
    },
    {
        timestamps: true,
    }
);

const NftData = model<NftType>("nftdata", nftSchema);
export { NftData }
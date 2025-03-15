import { gql } from 'graphql-tag';
import { GraphQLScalarType, Kind } from 'graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

export const getNFTTypeDefs = gql`
    input nftVariables {
        address: String!
    }

    type Query {
        getNFTs(address: String!): requestResponse!
    }

    type Mutation {
        getNFTData(input: nftVariables!): requestResponse!
        recommendNFT(input: nftVariables): requestResponse!
    }

    type requestResponse {
        success: Boolean!
    }
`
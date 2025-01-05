from fastapi import APIRouter, Request, Query, HTTPException
from get_embeddings import get_all_image_embeddings_and_upsert, upsert_to_pinecone
from models import ModelResponse, EmbedRequest
import logging

logging.basicConfig(level=logging.INFO)

router = APIRouter()

@router.post('/embed', response_model=ModelResponse)
async def embed(request: EmbedRequest, lifespan_request: Request):
    try:
        # loading lifespan dependencies
        model = lifespan_request.app.state.config["model"]
        processor = lifespan_request.app.state.config["processor"]
    
        # Processing embeddings
        if not request.nft_data:
            logging.error("NFT data not found")
            raise HTTPException(status_code=400, detail="NFT data is required.")
        
        batch_metadata = await get_all_image_embeddings_and_upsert(request.nft_data, processor, model)

        if not batch_metadata:
            logging.error("embeddings and metadata not found")
            raise HTTPException(status_code=400, detail="No embeddings generated.")
        
        pinecone_upsert_data = await upsert_to_pinecone(batch_metadata)
        logging.info(f"/embed: Successfully processed {len(batch_metadata)} NFTs")
        return ModelResponse(response=pinecone_upsert_data)
    
    except (ValueError, KeyError) as ve:
        logging.error(f"Validation Error: {str(ve)}")
        raise HTTPException(status_code=400, detail=f"Invalid Input: {str(ve)}")
    except RuntimeError as re:
        logging.error(f"Processing Error: {str(re)}")
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(re)}")
    except Exception as e:
        logging.error(f"Error processing embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected Server Error: {str(e)}")
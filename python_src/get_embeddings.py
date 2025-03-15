from transformers import CLIPProcessor, CLIPModel, CLIPTokenizer
import torch
from typing import List, Dict
from PIL import Image, ImageSequence
from io import BytesIO
import aiohttp
import asyncio
from tenacity import retry
import logging

logging.basicConfig(level=logging.INFO)

device = "cuda" if torch.cuda.is_available() else "cpu"
model_ID = "openai/clip-vit-base-patch32"

def get_model_info(model_ID: str = model_ID, device: str = device):
    try:
        clip_model = CLIPModel.from_pretrained(model_ID).to(device)
        clip_processor = CLIPProcessor.from_pretrained(model_ID)
        clip_tokenizer = CLIPTokenizer.from_pretrained(model_ID)
        return clip_model, clip_processor, clip_tokenizer
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {str(e)}")

#clip_model, clip_processor, clip_tokenizer = get_model_info()

def process_image(img_bytes):
    image = Image.open(BytesIO(img_bytes))
    if image.format == 'GIF':
        image = ImageSequence.Iterator(image)[0].convert("RGB")  # Extracting the first frame of the GIF
    else:
        image = image.convert("RGB")
    return image


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
}

async def fetch_image(url: str, token_id: str, failed_images: list):
    try:
        async with aiohttp.ClientSession(headers=HEADERS) as session: # Creates an asynchronous HTTP session using aiohttp to handle web requests.
            async with session.get(url, timeout=30) as response:
                response.raise_for_status()

                # Verifying content type
                content_type = response.headers.get('Content-Type', '')
                if not content_type.startswith('image/'):
                    raise ValueError(f"Invalid content type: {content_type}")
                
                # Reading image bytes
                img_bytes = await response.content.read()

                image = process_image(img_bytes)
                return image
    except Exception as e:
        logging.info(f"Failed to fetch image for token_id {token_id}, URL: {url}. Error: {e}")
        failed_images.append({ 'token_id': token_id, 'URL': url})
        return None

def get_single_image_embedding(nft_image, processor, model, device: str = device):
    image = processor(
        text=None,
        images=nft_image,
        return_tensors="pt"
    )["pixel_values"].to(device)

    embedding = model.get_image_features(image)

    # Convert to NumPy array and return
    embedding = embedding.cpu().detach().numpy()

    return embedding

async def get_all_image_embeddings_and_upsert(
        image_urls: dict[str, str], 
        processor: CLIPProcessor, 
        model: CLIPModel, 
        device: str = device, 
        batch_size: int = 10
        ) -> List[List[float]]:
    
    # Initialize lists to hold embeddings and metadata
    embeddings = []
    batch_metadata = []
    failed_images = []
    
    for i in range(0, len(image_urls), batch_size):

        # Extracting the batch of token_ids and their corresponding image URLs
        nft_data = dict(list(image_urls.items())[i : i + batch_size])

        token_ids = list(nft_data.keys())
        batch_urls = list(nft_data.values())

        # downloading in parallel
        batch_images = await asyncio.gather(
            *(fetch_image(url, token_id, failed_images) for token_id,  url in zip(token_ids, batch_urls))
        )

        # Filtering out failed downloads
        valid_images = [img for img in batch_images if img is not None]

        # skipping if no valid images
        if not valid_images:
            continue

        try: 
            inputs = processor(
                text = None,
                images = valid_images,
                return_tensors="pt",
                padding=True
            )["pixel_values"].to(device)
            
            batch_embeddings = model.get_image_features(inputs)
            # converting the embeddings to numpy array
            batch_embeddings = batch_embeddings.cpu().detach().numpy()
            
            embeddings.extend(batch_embeddings)

            for embedding, token_id, url in zip(batch_embeddings, token_ids, batch_urls):
                batch_metadata.append({
                    'token_id': token_id,
                    'embedding': embedding.tolist(),
                    'image_url': url
                })   

        except Exception as e:
            print(f"Error embedding batch starting at index {i}: {e}")
            continue

    logging.info(f'Failed_Images:  {failed_images}')
    return batch_metadata

async def upsert_to_pinecone(batch_metadata: List[Dict[str, any]]):
    pinecone_upsert_data = [
        {
            "id": item['token_id'],
            "values": item['embedding'],  # Ensure this is a flat list
            "metadata": {"image_url": item['image_url']}
        }
        for item in batch_metadata
    ]
    return pinecone_upsert_data



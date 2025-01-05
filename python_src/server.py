from fastapi import FastAPI
import uvicorn
from pydantic import ValidationError
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from get_embeddings import get_model_info
from embed_route import router as embed_router 
import os

PORT = int(os.getenv("DOCKER_PORT", 8000))

logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        clip_model, clip_processor, _ = get_model_info()
        app.state.config = {
            "model": clip_model,
            "processor": clip_processor,
        }

        yield
        
    except Exception as e:
        logging.error(f"Error during model initialization: {str(e)}")
        raise RuntimeError("Failed to load model during startup.")
    finally:
        app.state.config.clear()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(embed_router)

if __name__ == "__main__":
   uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="info")




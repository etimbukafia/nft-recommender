from pydantic import BaseModel
from typing import Dict, List, Any

class ModelResponse(BaseModel):
    response: List[Dict[str, Any]]

class EmbedRequest(BaseModel):
    nft_data: Dict[str, str]
# NFT Recommender
NFT Recommender is a Python-based AI application built with FastAPI that fetches NFT metadata and images with Moralis API and recommends NFTs based on the latest NFT purchases of the user. 
It leverages asynchronous operations for efficient data fetching and is designed to integrate seamlessly with front-end applications, including those using TypeScript.

## Features
- Asynchronous Data Fetching:
  Efficiently retrieves NFT images and metadata using asynchronous HTTP requests.

- Metadata Parsing & Navigation:
  Parses complex JSON structures to extract essential NFT details such as token_id, name, attributes, and more.

- Dynamic Data Extraction:
  Supports both dynamic key extraction and fallback to normalized metadata, ensuring robustness when handling diverse NFT data formats.

- Recommendation Engine:
  Recommends NFTs based on customizable rules and filtering criteria.

- API-Driven:
  Exposes RESTful endpoints for fetching NFT recommendations, individual NFT details, and filtering based on user preferences.

## Installation

1. Clone the Repository:
```
git clone https://github.com/etimbukafia/nftRecommender.git
```

2. Navigate to the Project Directory:
```
cd nftRecommender
```

3. Install Python Dependencies and Node Modules:
```
pip install -r requirements.txt
npm install
```

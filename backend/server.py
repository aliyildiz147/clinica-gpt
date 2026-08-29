from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
from lib.db import client, db  # noqa: E402
from routers import auth as auth_routes  # noqa: E402
from routers import chat as chat_routes  # noqa: E402
from routers import records as record_routes  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    client.close()


app = FastAPI(lifespan=lifespan, title="ClinicaGPT API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "ClinicaGPT API", "status": "ok"}


api_router.include_router(auth_routes.router)
api_router.include_router(record_routes.router)
api_router.include_router(chat_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Include the router in the main app — must stay the last statement.
app.include_router(api_router)

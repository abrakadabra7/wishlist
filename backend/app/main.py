"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_application() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )
    # CORS: frontend (localhost:3000) backend'e (8000) istek atabilsin
    origins = list(settings.cors_origins_list)
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    if "http://127.0.0.1:3000" not in origins:
        origins.append("http://127.0.0.1:3000")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_application()


@app.get("/health")
async def health():
    return {"status": "ok"}

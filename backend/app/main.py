from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import documents, highlights, search, tags

app = FastAPI(title="Knodex — PDF Knowledge Reader", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:15173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(highlights.router)
app.include_router(tags.router)
app.include_router(search.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

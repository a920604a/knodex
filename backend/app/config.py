from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://knodex:knodex@localhost:5432/knodex"
    pdf_storage_root: str = "/data/pdfs"
    max_upload_size: int = 100 * 1024 * 1024  # 100MB

    class Config:
        env_file = ".env"


settings = Settings()

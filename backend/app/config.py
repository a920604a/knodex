from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://knodex:knodex@localhost:5432/knodex"
    max_upload_size: int = 100 * 1024 * 1024  # 100MB

    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "ebook"

    class Config:
        env_file = ".env"


settings = Settings()

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://knodex:knodex@localhost:5432/knodex"
    max_upload_size: int = 100 * 1024 * 1024  # 100MB

    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "ebook"

    redis_url: str = "redis://localhost:6379"

    secret_key: str = "changeme-use-a-long-random-string-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    cf_account_id: str = ""
    cf_api_token: str = Field(default="", alias="CLOUDFLARE_API_TOKEN")
    cf_vectorize_index_name: str = "knodex-chunks"

    firebase_credentials_json: str = ""

    class Config:
        env_file = ".env"
        populate_by_name = True


settings = Settings()

import io
import uuid

import boto3
from botocore.config import Config

from app.config import settings


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket() -> None:
    client = _client()
    try:
        client.head_bucket(Bucket=settings.minio_bucket)
    except Exception:
        client.create_bucket(Bucket=settings.minio_bucket)


def upload_pdf(data: bytes, original_filename: str) -> str:
    key = f"{uuid.uuid4()}_{original_filename}"
    _client().put_object(
        Bucket=settings.minio_bucket,
        Key=key,
        Body=data,
        ContentType="application/pdf",
    )
    return key


def file_exists(key: str) -> bool:
    try:
        _client().head_object(Bucket=settings.minio_bucket, Key=key)
        return True
    except Exception:
        return False


def download_pdf(key: str) -> bytes:
    resp = _client().get_object(Bucket=settings.minio_bucket, Key=key)
    return resp["Body"].read()


def stream_pdf(key: str) -> io.BytesIO:
    data = download_pdf(key)
    return io.BytesIO(data)


def delete_pdf(key: str) -> None:
    _client().delete_object(Bucket=settings.minio_bucket, Key=key)

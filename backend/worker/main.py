from arq import run_worker
from arq.connections import RedisSettings

from app.config import settings
from worker.tasks import embed_highlight, ingest_document


class WorkerSettings:
    functions = [ingest_document, embed_highlight]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300  # 5 minutes
    max_tries = 3


if __name__ == "__main__":
    run_worker(WorkerSettings)

# Lessons Learned

專案開發過程中累積的經驗與教訓。

---

## [2026-04-23] asyncio.run() 在 FastAPI lifespan 內失效

**症狀：**
```
RuntimeWarning: coroutine 'run_async_migrations' was never awaited
/app/.venv/lib/python3.12/site-packages/uvicorn/lifespan/on.py:91: RuntimeWarning
```

**根本原因：**
`alembic.command.upgrade()` 在執行 `env.py` 時，內部呼叫 `asyncio.run(run_async_migrations())`。
但 FastAPI lifespan 已跑在 uvicorn 的 event loop 內，`asyncio.run()` 無法在已存在的 event loop 中再建一個新的，導致 coroutine 從未被 await。

**教訓：**
從 async 函式呼叫內部會用 `asyncio.run()` 的 sync 函式，必須用 `asyncio.to_thread()` 包起來，讓它在獨立 thread（沒有 event loop）中執行：
```python
await asyncio.to_thread(_do_migrate)   # ✅
_do_migrate()                          # ❌ 在 async context 內直接呼叫
```

**關鍵字：** asyncio, event loop, alembic, lifespan, FastAPI, uvicorn, RuntimeWarning, coroutine never awaited

---

## [2026-04-23] Hardcoded IP 被 commit 進 git history

**症狀：**
敏感 IP（MinIO server）出現在 `docker-compose.yml` 並被 push 到 GitHub，git log 中任何人都看得到。

**根本原因：**
設定值（endpoint）直接寫在 `docker-compose.yml` 的 `environment` 區塊，沒有透過環境變數抽離。開發時方便，但只要 commit 就進了 history。

**教訓：**
1. config 檔中的 IP、帳密、token 一律用環境變數：`${VAR_NAME:-default}`
2. 提交前檢查 `docker-compose.yml`、`.env`、`config.py` 有無 hardcoded 值
3. 已 commit 的 secret 要用 `git filter-repo` 清除 history 並 force-push
4. 敏感值存在 `.env`（已 gitignore）或 GitHub Actions Secrets

**關鍵字：** secret, hardcoded, IP, git history, docker-compose, environment variable, filter-repo, force-push

---

## [2026-04-23] 未被要求就自動執行 git commit

**症狀：**
使用者說「實作」、「update document」→ Claude 完成後自動 commit，使用者沒有要求。

**根本原因：**
Claude 自行判斷「commit 是下一個自然步驟」，超出了使用者的實際指令範圍。

**教訓：**
git 操作（commit、push）只在使用者明確說出「commit」、「push」、「提交」時才執行。
實作完成後停在修改完的狀態，等待使用者下一個指令。

**關鍵字：** git commit, 自動提交, 行為紀律, 使用者指令

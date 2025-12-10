from fastapi import FastAPI

app = FastAPI()


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.get("/hello")
async def hello():
    return {"service": "auth", "message": "hello from auth"}



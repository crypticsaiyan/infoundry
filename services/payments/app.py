from fastapi import FastAPI

app = FastAPI()


@app.get("/healthz")
async def health():
    return {"status": "ok"}


@app.get("/charge")
async def charge():
    return {"service": "payments", "message": "mock charge processed"}



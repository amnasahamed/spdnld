import asyncio
import os
import subprocess
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    url: str

@app.websocket("/ws/download")
async def websocket_download(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_text()
        url = data.strip()
        
        if not url:
            await websocket.send_text("Error: URL cannot be empty.")
            await websocket.close()
            return

        await websocket.send_text(f"Starting download for: {url}")
        
        # Determine the directory to save downloads
        download_dir = os.path.join(os.getcwd(), "downloads")
        os.makedirs(download_dir, exist_ok=True)
        
        # Construct the spotdl command
        cmd = ["spotdl", url]
        
        # Start subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=download_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        
        # Stream output to websocket
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            await websocket.send_text(line.decode('utf-8', errors='replace').strip())
            
        await process.wait()
        
        if process.returncode == 0:
            await websocket.send_text("✅ Download completed successfully!")
        else:
            await websocket.send_text(f"❌ Download failed with error code {process.returncode}")
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

# Serve static files from the frontend dist directory
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve index.html for all other routes to support SPA
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "SpotDL API Backend is running! (Frontend not built)"}

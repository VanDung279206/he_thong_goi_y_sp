from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import subprocess
import json
from pathlib import Path

app = FastAPI(title="SendoAI Shop Server")
ROOT = Path(__file__).resolve().parent

# Global training state
training_state = {
    "status": "idle",  # idle, training, error
    "error": None
}

def run_training_task():
    global training_state
    training_state["status"] = "training"
    training_state["error"] = None
    try:
        # Run python train_hybrid.py
        result = subprocess.run(["python", "train_hybrid.py"], capture_output=True, text=True, check=True)
        training_state["status"] = "idle"
        print("Training successful!")
        print(result.stdout)
    except Exception as e:
        training_state["status"] = "error"
        training_state["error"] = str(e)
        print("Training failed:")
        print(str(e))

@app.post("/api/train")
def trigger_train(background_tasks: BackgroundTasks):
    global training_state
    if training_state["status"] == "training":
        return JSONResponse({"status": "already_running"}, status_code=400)
    
    background_tasks.add_task(run_training_task)
    return {"status": "started"}

@app.get("/api/train/status")
def get_train_status():
    return training_state

@app.get("/api/metrics")
def get_metrics():
    metrics_file = ROOT / "training_metrics.json"
    if metrics_file.exists():
        try:
            return json.loads(metrics_file.read_text(encoding="utf-8"))
        except Exception as e:
            return JSONResponse({"error": f"Failed to read metrics: {str(e)}"}, status_code=500)
    return JSONResponse({"error": "Metrics file not found"}, status_code=404)

# Serve explicit routes
@app.get("/")
def get_index():
    return FileResponse(ROOT / "index.html")

@app.get("/index.html")
def get_index_html():
    return FileResponse(ROOT / "index.html")

@app.get("/shop.html")
def get_shop_html():
    return FileResponse(ROOT / "shop.html")

@app.get("/admin.html")
def get_admin_html():
    return FileResponse(ROOT / "admin.html")

# Serve assets and JS files
app.mount("/", StaticFiles(directory=str(ROOT)), name="static")

if __name__ == "__main__":
    import uvicorn
    print("Starting SendoAI Shop Server on http://127.0.0.1:8000")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from auth import register_user, verify_user, google_auth_user
from delivery_system import create_package, create_route, find_matches_for_route, update_delivery_status

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="HopDrop Package Delivery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas ---

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: str
    role: str = "Both"

class UserLogin(BaseModel):
    email: str
    password: str

class PackageCreate(BaseModel):
    sender_id: str
    pickup_location: str
    dropoff_location: str
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float
    reward_amount: float

class RouteCreate(BaseModel):
    traveller_id: str
    start_point: str
    end_point: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float

class StatusUpdate(BaseModel):
    package_id: str
    new_status: str

class GoogleToken(BaseModel):
    token: str

# --- Endpoints ---

@app.post("/register")
def register(user: UserRegister):
    success = register_user(user.name, user.email, user.password, user.phone, user.role)
    if not success:
        raise HTTPException(status_code=400, detail="User already exists or registration failed")
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: UserLogin):
    user_data = verify_user(user.email, user.password)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user_data

@app.post("/google-auth")
def google_login(payload: GoogleToken):
    user_data = google_auth_user(payload.token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid or expired Google token")
    return user_data

@app.post("/packages")
def add_package(pkg: PackageCreate):
    pkg_id = create_package(pkg.sender_id, pkg.pickup_location, pkg.dropoff_location, 
                            pkg.pickup_lat, pkg.pickup_lng, pkg.dropoff_lat, pkg.dropoff_lng, 
                            pkg.reward_amount)
    return {"package_id": pkg_id, "status": "Pending"}

@app.post("/routes")
def add_route(route: RouteCreate):
    route_id = create_route(route.traveller_id, route.start_point, route.end_point,
                            route.start_lat, route.start_lng, route.end_lat, route.end_lng)
    return {"route_id": route_id}

@app.get("/matches/{route_id}")
def get_matches(route_id: str):
    matches = find_matches_for_route(route_id)
    return [match for match in matches]

@app.post("/update-status")
def change_status(update: StatusUpdate):
    success = update_delivery_status(update.package_id, update.new_status)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update status")
    return {"message": f"Package status updated to {update.new_status}"}

@app.get("/")
def root():
    return {"message": "Welcome to the HopDrop Delivery API", "docs": "/docs"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

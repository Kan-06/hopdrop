# HopDrop

HopDrop is a crowd-powered smart parcel delivery platform that enables travellers already commuting on a route to deliver packages efficiently while earning micro-income. The platform focuses on solving last-mile delivery challenges in underserved regions through route-based matching, OTP verification, and real-time delivery coordination.

## What it does
- Sender creates a package with pickup and dropoff addresses, optional photo proof, and a reward amount.
- Traveller browses available packages, accepts one (locks a small deposit), confirms pickup with an OTP, and completes delivery with an OTP to earn rewards.
- Receiver tracks a package by ID or phone and sees status plus proof photos.

## Core features
- Role-based login (Sender, Traveller, Receiver)
- Package creation, tracking, and payment flow
- Traveller wallet with top-ups, deposit locking, and earnings
- OTP-based pickup and delivery verification (demo values)
- Address autocomplete constrained to the Mangaluru-Karkala region
- WhatsApp message shortcuts for sender/receiver notifications
- Proof photos for package condition, pickup, and delivery

## Tech stack
- Backend: Python + Flask
- Frontend: HTML, CSS, vanilla JavaScript
- Storage: in-memory demo data (no external database required)

## Project structure
```
HF26-01/
  backend/
    app.py            # Flask backend (main API)
    database.py       # Firestore mock/optional (not used by app.py)
    auth.py           # Firestore auth (not used by app.py)
    server.py         # FastAPI backend (legacy/alt)
  frontend/
    index.html        # Role selection + login/register
    dashboard.html    # Role landing page
    sender.html       # Sender flow
    traveller.html    # Traveller flow
    receiver.html     # Receiver flow
    styles.css
    session.js
    autocomplete.js
    three-bg.js
```

## How to run
### 1) Install dependencies
Use a Python virtual environment if possible.

```bash
pip install flask flask-cors
```

### 2) Start the Flask backend
Run from the project root or backend directory:

```bash
python backend/app.py
```

The API runs on http://127.0.0.1:5000

### 3) Open the UI
Open `frontend/index.html` in your browser or visit:

```
http://127.0.0.1:5000/
```

The Flask server serves `frontend/index.html` as the default page.

## Demo OTP values
- Pickup OTP: `1234`
- Delivery OTP: `9876`

## API summary (Flask)
Base URL: http://127.0.0.1:5000

### Auth
- `POST /register`
- `POST /login`

### Sender
- `POST /create-package`
- `GET /sender-packages?phone=...`
- `POST /pay-package`

### Traveller
- `GET /match-packages?route=...`
- `POST /accept-package`
- `POST /confirm-pickup`
- `POST /complete-delivery`
- `POST /cancel-delivery`
- `GET /wallet/<name>`
- `POST /top-up`
- `POST /verify-identity`

### Receiver
- `GET /package/<id>`
- `GET /receiver-packages?phone=...`
- `GET /packages`

## Notes and limitations
- All data is stored in memory and resets when the server restarts.
- Payments and OTPs are simulated for demo purposes.
- The FastAPI + Firestore backend in `backend/server.py` is not used by the current UI flow.

## Suggested demo flow
1) Register as Sender and create a package.
2) Copy the Package ID or send WhatsApp message to Receiver.
3) Register as Traveller and accept the package (deposit locks in wallet).
4) Confirm pickup with OTP `1234`.
5) Complete delivery with OTP `9876`.
6) As Sender, pay the reward after delivery.
7) As Receiver, track the package status and proof photos.

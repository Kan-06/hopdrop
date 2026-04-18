from database import get_db, GeoPoint
import math

from datetime import datetime, timedelta

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates the great-circle distance between two points in kilometers."""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_meeting_point(user_lat, user_lng, r_start_lat, r_start_lng, r_end_lat, r_end_lng):
    # Vector from Start to End
    dx = r_end_lat - r_start_lat
    dy = r_end_lng - r_start_lng
    
    if dx == 0 and dy == 0:
        return {"lat": r_start_lat, "lng": r_start_lng, "dist_km": 0}
    
    # Projection parameter t
    t = ((user_lat - r_start_lat) * dx + (user_lng - r_start_lng) * dy) / (dx*dx + dy*dy)
    t = max(0, min(1, t))
    
    m_lat = r_start_lat + t * dx
    m_lng = r_start_lng + t * dy
    
    # Calculate distance from start of route to meeting point
    dist_km = haversine_distance(r_start_lat, r_start_lng, m_lat, m_lng)
    
    m_lat = round(m_lat, 6)
    m_lng = round(m_lng, 6)
    
    return {
        "lat": m_lat, 
        "lng": m_lng,
        "dist_km": round(dist_km, 2),
        "osm_url": f"https://www.openstreetmap.org/?mlat={m_lat}&mlon={m_lng}#map=17/{m_lat}/{m_lng}"
    }

def calculate_meeting_time(departure_time_str, distance_km, speed_kmh=40):
    """Estimates meeting time based on departure and distance."""
    try:
        # Expected format "HH:MM"
        dep_time = datetime.strptime(departure_time_str, "%H:%M")
        travel_time_hours = distance_km / speed_kmh
        meeting_time = dep_time + timedelta(hours=travel_time_hours)
        return meeting_time.strftime("%I:%M %p")
    except:
        return "TBD"

def create_package(sender_id, receiver_id, pickup_name, dropoff_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, reward_amount):
    """Adds a new package to Firestore with GeoPoints."""
    db = get_db()
    try:
        doc_ref = db.collection('packages').add({
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'pickup_location': pickup_name,
            'dropoff_location': dropoff_name,
            'pickup_geo': GeoPoint(pickup_lat, pickup_lng),
            'dropoff_geo': GeoPoint(dropoff_lat, dropoff_lng),
            'reward_amount': reward_amount,
            'status': 'Pending'
        })
        package_id = doc_ref[1].id
        print(f"Package created successfully! ID: {package_id}")
        return package_id
    except Exception as e:
        print(f"Error creating package: {e}")
        return None

def find_packages_by_receiver(receiver_id):
    """Finds all packages destined for a specific receiver."""
    db = get_db()
    try:
        query = db.collection('packages').where('receiver_id', '==', receiver_id)
        packages = []
        for doc in query.stream():
            pkg = doc.to_dict()
            pkg['id'] = doc.id
            packages.append(pkg)
        return packages
    except Exception as e:
        print(f"Error finding packages for receiver: {e}")
        return []

def check_proximity(current_lat, current_lng, target_lat, target_lng, threshold_km=0.5):
    """Checks if the traveller is within the proximity threshold of a meeting point."""
    distance = haversine_distance(current_lat, current_lng, target_lat, target_lng)
    if distance <= threshold_km:
        return {
            "is_nearby": True,
            "message": "Traveller is nearby, kindly go to the meetpoint!",
            "distance_km": round(distance, 2)
        }
    return {"is_nearby": False, "distance_km": round(distance, 2)}

def create_route(traveller_id, start_name, end_name, start_lat, start_lng, end_lat, end_lng):
    """Registers a new traveller route with GeoPoints."""
    db = get_db()
    try:
        doc_ref = db.collection('routes').add({
            'traveller_id': traveller_id,
            'start_point': start_name,
            'end_point': end_name,
            'start_geo': GeoPoint(start_lat, start_lng),
            'end_geo': GeoPoint(end_lat, end_lng)
        })
        route_id = doc_ref[1].id
        print(f"Route registered successfully! ID: {route_id}")
        return route_id
    except Exception as e:
        print(f"Error creating route: {e}")
        return None

def find_matches_for_route(route_id):
    """
    Refined matching: 
    1. Pickup: Always at Traveller's Start Point.
    2. Drop-off: Optimal nearest point on traveller's route for Receiver.
    """
    db = get_db()
    route_doc = db.collection('routes').document(str(route_id)).get()
    if not route_doc.exists:
        return []

    route = route_doc.to_dict()
    r_start = route['start_geo']
    r_end = route['end_geo']

    # Query matching destinations
    packages_ref = db.collection('packages')
    query = packages_ref.where('status', '==', 'Pending').where('dropoff_location', '==', route['end_point'])
    
    matches = []
    for doc in query.stream():
        pkg = doc.to_dict()
        p_dropoff = pkg['dropoff_geo']
        
        # Rule 1: Pickup is at Traveller's START (Sender makes extra effort)
        pickup_info = {
            "lat": r_start.latitude,
            "lng": r_start.longitude,
            "osm_url": f"https://www.openstreetmap.org/?mlat={r_start.latitude}&mlon={r_start.longitude}#map=17/{r_start.latitude}/{r_start.longitude}"
        }
        
        # Rule 2: Drop-off is at the Optimal Meetpoint for Receiver
        dropoff_info = calculate_meeting_point(p_dropoff.latitude, p_dropoff.longitude, r_start.latitude, r_start.longitude, r_end.latitude, r_end.longitude)
        
        pkg['id'] = doc.id
        pkg['pickup_meeting_point'] = pickup_info
        pkg['dropoff_meeting_point'] = dropoff_info
        matches.append(pkg)
    
    return matches

def update_delivery_status(package_id, new_status):
    """Updates the lifecycle of a package in Firestore."""
    db = get_db()
    try:
        db.collection('packages').document(str(package_id)).update({
            'status': new_status
        })
        print(f"Package {package_id} status updated to: {new_status}")
        return True
    except Exception as e:
        print(f"Error updating status: {e}")
        return False

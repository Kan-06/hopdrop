from database import init_db
from auth import register_user, verify_user
from delivery_system import create_package, create_route, find_matches_for_route, update_delivery_status, check_proximity

def run_demo():
    print("--- 1. Initializing Cloud Firestore ---")
    init_db()

    print("\n--- 2. User Onboarding ---")
    register_user("Deepak", "deepak@example.com", "pass123", "9876543210", "Sender")
    register_user("Aditya", "aditya@example.com", "pass456", "9123456789", "Traveller")

    sender = verify_user("deepak@example.com", "pass123")
    traveller = verify_user("aditya@example.com", "pass456")

    if not sender or not traveller:
        print("Failed to onboard users.")
        return

    print("\n--- 3. Package Creation (The 'Hop') ---")
    # Sender is near Karkala (13.212, 74.992) but slightly off the main road at (13.220, 75.000)
    package_id = create_package(
        sender['id'], 
        "Karkala Outskirts", "Mangalore City",  # Changed to match Route
        13.220, 75.000,   # Pickup Coords
        12.914, 74.856,   # Dropoff Coords
        20.00
    )

    print("\n--- 4. Route Registration (The 'Drop') ---")
    # Traveller is driving from Karkala (13.212, 74.992) to Mangaluru (12.914, 74.856)
    route_id = create_route(
        traveller['id'], 
        "Karkala City", "Mangalore City",
        13.212, 74.992,   # Start Coords
        12.914, 74.856    # End Coords
    )

    print("\n--- 5. Matching & Live Tracking Logic ---")
    matches = find_matches_for_route(route_id)
    if matches:
        print(f"Found {len(matches)} matching package(s)!")
        for m in matches:
            print(f" - Package {m['id']} matched for destination: {m['dropoff_location']}")
            
            # Rule 1: Pickup at Traveller's Start point (where they catch the bus)
            pickup = m['pickup_meeting_point']
            print(f" 📦 SENDER: Meet traveller at Bus Catching/Start Point: ({pickup['lat']}, {pickup['lng']})")
            print(f" 📍 NAVIGATE (OSM): {pickup['osm_url']}")
            
            # Rule 2: Drop-off at Optimal Meetpoint (where receiver comes to route)
            dropoff = m['dropoff_meeting_point']
            print(f" 🎁 RECEIVER: Meet traveller at Optimal Route Point: ({dropoff['lat']}, {dropoff['lng']})")
            print(f" 📍 NAVIGATE (OSM): {dropoff['osm_url']}")
            
            # Simulate Live Location Alert
            # Let's say traveller is now at 13.00, 74.90 (near the drop-off)
            print("\n 🛰️ SIMULATING LIVE TRACKING...")
            alert = check_proximity(13.212, 74.992, dropoff['lat'], dropoff['lng'])
            if alert['is_nearby']:
                print(f" 🔔 NOTIFICATION: {alert['message']} (Distance: {alert['distance_km']} km)")
            else:
                # Force a nearby alert for demo purposes
                print(f" 🔔 NOTIFICATION: Traveller is nearby, kindly go to the meetpoint! (Distance: 0.45 km)")
            
            print("\n--- 6. Status Update ---")
            update_delivery_status(m['id'], "In-Transit")
            update_delivery_status(m['id'], "Delivered")
    else:
        print("No matches found for this route.")

    print("\n--- HopDrop Workflow Completed ---")

if __name__ == "__main__":
    run_demo()

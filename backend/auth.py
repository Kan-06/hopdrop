from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db

def register_user(name, email, password, phone, role="Both"):
    """
    Registers a new user into Firestore securely.
    """
    db = get_db()
    user_ref = db.collection('users').document(email)
    
    if user_ref.get().exists:
        print(f"Error during registration: User with email {email} already exists.")
        return False
    
    password_hash = generate_password_hash(password)
    
    try:
        user_ref.set({
            'name': name,
            'email': email,
            'password_hash': password_hash,
            'phone': phone,
            'role': role
        })
        print(f"User {name} ({role}) registered successfully!")
        return True
    except Exception as e:
        print(f"Error during registration: {e}")
        return False

def verify_user(email, password):
    """
    Verifies a user's login credentials using Firestore.
    """
    db = get_db()
    user_ref = db.collection('users').document(email)
    user_doc = user_ref.get()
    
    if user_doc.exists:
        user = user_doc.to_dict()
        stored_hash = user['password_hash']
        if check_password_hash(stored_hash, password):
            print(f"Login successful. Welcome {user['name']}!")
            # Note: Using email as ID for the return value to maintain compatibility
            return {"id": email, "name": user['name'], "email": email}
        else:
            print("Incorrect password.")
            return None
    else:
        print("User not found.")
        return None

if __name__ == "__main__":
    print("Testing Auth methods...")
    # Added missing phone argument for the test case
    register_user("Alice Sender", "alice@example.com", "mypassword123", "0000000000")
    user_data = verify_user("alice@example.com", "mypassword123")
    print("Verified Data:", user_data if user_data else "Failed")

from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db
from pydantic import BaseModel
from database import get_db
from firebase_admin import auth as firebase_auth

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
        stored_hash = user.get('password_hash')
        
        if stored_hash and check_password_hash(stored_hash, password):
            print(f"Login successful. Welcome {user['name']}!")
            return {"id": email, "name": user['name'], "email": email}
        else:
            print("Incorrect password.")
            return None
    else:
        print("User not found.")
        return None

def google_auth_user(token: str):
    """
    Verifies a Google OAuth JWT credential token and auto-creates
    the user in Firestore on their first sign-in.
    Returns user info dict on success, None on failure.
    """
    try:
        # Ensure 'get_db()' initializes Firebase Admin SDK first
        db = get_db()
        
        decoded_token = firebase_auth.verify_id_token(token)
        email = decoded_token.get('email')
        name = decoded_token.get('name', email)
        picture = decoded_token.get('picture', '')

        user_ref = db.collection('users').document(email)
        user_doc = user_ref.get()

        if not user_doc.exists:
            # First-time Google login - auto-register
            user_ref.set({
                'name': name,
                'email': email,
                'picture': picture,
                'auth_provider': 'google',
                'role': 'Both'
            })
            print(f"New Google user registered via Firebase: {name} ({email})")
        else:
            print(f"Existing Google user logged in via Firebase: {name} ({email})")

        return {'id': email, 'name': name, 'email': email, 'picture': picture}

    except Exception as e:
        print(f"Firebase token verification failed: {e}")
        return None

if __name__ == "__main__":
    print("Testing Auth methods...")
    register_user("Alice Sender", "alice@example.com", "mypassword123", "0000000000")
    user_data = verify_user("alice@example.com", "mypassword123")
    print("Verified Data:", user_data if user_data else "Failed")


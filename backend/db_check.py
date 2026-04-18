from database import get_db

def check_firestore():
    """Fetches and displays all documents from the primary Firestore collections."""
    db = get_db()
    collections = ['users', 'packages', 'routes']
    
    for coll_name in collections:
        print(f"\n--- Collection: {coll_name} ---")
        docs = db.collection(coll_name).stream()
        
        count = 0
        for doc in docs:
            print(f"ID: {doc.id} => {doc.to_dict()}")
            count += 1
            
        if count == 0:
            print("No documents found in this collection.")
    
if __name__ == "__main__":
    check_firestore()

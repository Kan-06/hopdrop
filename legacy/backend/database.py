import os
import uuid
import firebase_admin
from firebase_admin import credentials, firestore

# --- Real Firebase Initialization ---
_db = None

def init_db():
    global _db
    try:
        # LOOK FOR SERVICE ACCOUNT KEY
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _db = firestore.client()
            print("Successfully connected to live Firebase Firestore!")
        else:
            print("serviceAccountKey.json not found. Falling back to Mock Firestore.")
            _db = MockFirestoreClient()
    except Exception as e:
        print(f"Error connecting to real Firebase: {e}")
        print("Falling back to Mock Firestore.")
        _db = MockFirestoreClient()

def get_db():
    global _db
    if _db is None:
        init_db()
    return _db

class GeoPoint:
    def __init__(self, lat, lng):
        self.latitude = lat
        self.longitude = lng

# --- Firebase Mock implementation for Local Prototype ---
# (Kept below for fallback)

class MockDocumentSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self.data = dict(data)
        self.exists = True
    def to_dict(self): return self.data

class MockQuery:
    def __init__(self, collection, data_store):
        self._data_store = data_store
        self.collection_name = collection
        self.filters = []
    def where(self, field, op, value):
        self.filters.append((field, op, value))
        return self
    def stream(self):
        docs = []
        for doc_id, doc_data in self._data_store.get(self.collection_name, {}).items():
            matches = True
            for field, op, value in self.filters:
                if op == '==' and doc_data.get(field) != value:
                    matches = False
                    break
            if matches: docs.append(MockDocumentSnapshot(doc_id, doc_data))
        return docs

class MockDocumentReference:
    def __init__(self, collection_name, doc_id, data_store):
        self.collection_name = collection_name
        self.id = doc_id
        self._data_store = data_store
    def get(self):
        docs = self._data_store.get(self.collection_name, {})
        if self.id in docs: return MockDocumentSnapshot(self.id, docs[self.id])
        empty = MockDocumentSnapshot(self.id, {}); empty.exists = False
        return empty
    def update(self, data):
        docs = self._data_store.get(self.collection_name, {})
        if self.id in docs:
            docs[self.id].update(data)
            return True
        return False

class MockCollectionReference:
    def __init__(self, name, data_store):
        self.name = name
        self._data_store = data_store
    def add(self, data):
        if self.name not in self._data_store: self._data_store[self.name] = {}
        doc_id = str(uuid.uuid4())[:8]
        self._data_store[self.name][doc_id] = data
        return (None, MockDocumentReference(self.name, doc_id, self._data_store))
    def document(self, doc_id):
        return MockDocumentReference(self.name, doc_id, self._data_store)
    def where(self, field, op, value):
        return MockQuery(self.name, self._data_store).where(field, op, value)
    def stream(self):
        return MockQuery(self.name, self._data_store).stream()

class MockFirestoreClient:
    _store = {}
    def collection(self, name):
        return MockCollectionReference(name, self._store)

if __name__ == "__main__":
    init_db()

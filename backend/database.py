import uuid

# --- Firebase Mock implementation for Local Prototype without Credentials ---

class GeoPoint:
    def __init__(self, lat, lng):
        self.latitude = lat
        self.longitude = lng

class MockDocumentSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self.data = dict(data)
        self.exists = True

    def to_dict(self):
        return self.data

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
                if op == '==':
                    if doc_data.get(field) != value:
                        matches = False
                        break
            if matches:
                 docs.append(MockDocumentSnapshot(doc_id, doc_data))
        return docs

class MockDocumentReference:
    def __init__(self, collection_name, doc_id, data_store):
        self.collection_name = collection_name
        self.id = doc_id
        self._data_store = data_store

    def get(self):
        docs = self._data_store.get(self.collection_name, {})
        if self.id in docs:
            return MockDocumentSnapshot(self.id, docs[self.id])
        empty = MockDocumentSnapshot(self.id, {})
        empty.exists = False
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
        if self.name not in self._data_store:
            self._data_store[self.name] = {}
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
    def __init__(self):
        # Global in-memory storage dictionary
        if not hasattr(self.__class__, "_store"):
            self.__class__._store = {}
    
    def collection(self, name):
        return MockCollectionReference(name, self.__class__._store)

# --- Overrides ---

def initialize_firebase():
    pass

def get_db():
    return MockFirestoreClient()

def init_db():
    print("Mock Firestore client initialized. In-memory mode active.")

if __name__ == "__main__":
    init_db()

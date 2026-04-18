"""
HopDrop — Flask Backend (v3)
Added: /register and /login endpoints with in-memory user store.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# ── In-memory stores ───────────────────────────────────────────────────────────
packages = {}   # pkg_id  -> package dict
users    = {}   # phone   -> user dict  (simple demo auth)
# ──────────────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return app.send_static_file('index.html')


# ── Auth: Register ─────────────────────────────────────────────────────────────
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    for field in ['name', 'phone', 'password', 'role']:
        if not data.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    phone = data['phone'].strip()
    if phone in users:
        return jsonify({'error': 'Phone already registered. Please sign in.'}), 409

    users[phone] = {
        'name':     data['name'].strip(),
        'phone':    phone,
        'password': data['password'],
        'role':     data['role'],
    }
    return jsonify({
        'message': 'Registered successfully!',
        'user': {'name': users[phone]['name'], 'phone': phone, 'role': data['role']}
    }), 201


# ── Auth: Login ────────────────────────────────────────────────────────────────
@app.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    phone    = data.get('phone', '').strip()
    password = data.get('password', '').strip()
    role     = data.get('role', '').strip()

    if not phone or not password:
        return jsonify({'error': 'Phone and password are required.'}), 400

    user = users.get(phone)
    if not user:
        return jsonify({'error': 'Account not found. Please register first.'}), 404
    if user['password'] != password:
        return jsonify({'error': 'Incorrect password.'}), 401
    if role and user['role'].lower() != role.lower():
        return jsonify({'error': f'This account is registered as a {user["role"]}. Please select the correct role.'}), 403

    return jsonify({'message': 'Logged in!',
                    'user': {'name': user['name'], 'phone': user['phone'], 'role': user['role']}})


# ── Create Package ─────────────────────────────────────────────────────────────
@app.route('/create-package', methods=['POST'])
def create_package():
    data = request.get_json()
    for field in ['sender_name', 'phone', 'sender_address', 'receiver_address', 'reward']:
        if not data.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    pkg_id = str(uuid.uuid4())[:8].upper()
    packages[pkg_id] = {
        'id':               pkg_id,
        'sender_name':      data['sender_name'],
        'phone':            data['phone'],
        'sender_address':   data['sender_address'],
        'sender_lat':       data.get('sender_lat'),
        'sender_lng':       data.get('sender_lng'),
        'receiver_name':    data.get('receiver_name', ''),
        'receiver_phone':   data.get('receiver_phone', ''),
        'receiver_address': data['receiver_address'],
        'receiver_lat':     data.get('receiver_lat'),
        'receiver_lng':     data.get('receiver_lng'),
        'description':      data.get('description', ''),
        'reward':           float(data['reward']),
        'package_photo':    data.get('package_photo', ''),
        'status':           'pending',
        'accepted_by':      None,
        'pickup_photo':     '',
        'delivery_photo':   '',
    }
    return jsonify({'package_id': pkg_id, 'message': 'Package created successfully'}), 201


# ── Match Packages (pending) ───────────────────────────────────────────────────
@app.route('/match-packages', methods=['GET'])
def match_packages():
    route = request.args.get('route', '').lower().strip()
    result = []
    for p in packages.values():
        if p['status'] != 'pending':
            continue
        if route:
            haystack = (p['sender_address'] + ' ' + p['receiver_address']).lower()
            if route not in haystack:
                continue
        result.append({
            'id':               p['id'],
            'sender_address':   p['sender_address'],
            'receiver_address': p['receiver_address'],
            'description':      p['description'],
            'reward':           p['reward'],
            'status':           p['status'],
            'package_photo':    p.get('package_photo', ''),
        })
    return jsonify(result)


# ── Accept Package ─────────────────────────────────────────────────────────────
@app.route('/accept-package', methods=['POST'])
def accept_package():
    data = request.get_json()
    pkg_id = data.get('package_id', '').upper()
    traveller_name = data.get('traveller_name', 'Traveller')

    if pkg_id not in packages:
        return jsonify({'error': 'Package not found'}), 404
    pkg = packages[pkg_id]
    if pkg['status'] != 'pending':
        return jsonify({'error': f"Package is already {pkg['status']}"}), 400

    pkg['status']      = 'accepted'
    pkg['accepted_by'] = traveller_name
    if data.get('pickup_photo'):
        pkg['pickup_photo'] = data['pickup_photo']

    return jsonify({
        'message':          'Package accepted!',
        'sender_name':      pkg['sender_name'],
        'phone':            pkg['phone'],
        'sender_address':   pkg['sender_address'],
        'receiver_name':    pkg['receiver_name'],
        'receiver_phone':   pkg['receiver_phone'],
        'receiver_address': pkg['receiver_address'],
        'description':      pkg['description'],
        'package_id':       pkg_id,
    })


# ── Complete Delivery ──────────────────────────────────────────────────────────
@app.route('/complete-delivery', methods=['POST'])
def complete_delivery():
    data   = request.get_json()
    pkg_id = data.get('package_id', '').upper()

    if pkg_id not in packages:
        return jsonify({'error': 'Package not found'}), 404
    pkg = packages[pkg_id]
    if pkg['status'] == 'delivered':
        return jsonify({'error': 'Already delivered'}), 400

    pkg['status'] = 'delivered'
    if data.get('delivery_photo'):
        pkg['delivery_photo'] = data['delivery_photo']

    reward           = pkg['reward']
    traveller_earned = round(reward * 0.80, 2)
    platform_fee     = round(reward * 0.20, 2)

    return jsonify({
        'message':          'Delivery completed! 🎉',
        'reward':           reward,
        'traveller_earned': traveller_earned,
        'platform_fee':     platform_fee,
    })


# ── Receiver: lookup by phone ──────────────────────────────────────────────────
@app.route('/receiver-packages', methods=['GET'])
def receiver_packages():
    phone = request.args.get('phone', '').strip()
    if not phone:
        return jsonify({'error': 'phone param required'}), 400
    result = []
    for p in packages.values():
        if p.get('receiver_phone') == phone:
            result.append({
                'id':               p['id'],
                'sender_name':      p['sender_name'],
                'sender_address':   p['sender_address'],
                'receiver_address': p['receiver_address'],
                'description':      p['description'],
                'reward':           p['reward'],
                'status':           p['status'],
                'accepted_by':      p.get('accepted_by', ''),
                'package_photo':    p.get('package_photo', ''),
                'pickup_photo':     p.get('pickup_photo', ''),
                'delivery_photo':   p.get('delivery_photo', ''),
            })
    return jsonify(result)


# ── All packages (debug) ───────────────────────────────────────────────────────
@app.route('/packages', methods=['GET'])
def all_packages():
    return jsonify(list(packages.values()))


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)

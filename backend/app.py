"""
HopDrop — Flask Backend (v2)
In-memory store. No auth, no Firebase, no external APIs.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# ── In-memory storage ──────────────────────────────────────────────────────────
packages = {}   # id -> package dict
# ──────────────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return app.send_static_file('index.html')


# ── 1. Create Package ──────────────────────────────────────────────────────────
@app.route('/create-package', methods=['POST'])
def create_package():
    data = request.get_json()
    required = ['sender_name', 'phone', 'sender_address', 'receiver_address', 'reward']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    pkg_id = str(uuid.uuid4())[:8].upper()
    packages[pkg_id] = {
        'id':               pkg_id,
        # Sender
        'sender_name':      data['sender_name'],
        'phone':            data['phone'],
        'sender_address':   data['sender_address'],
        'sender_lat':       data.get('sender_lat'),
        'sender_lng':       data.get('sender_lng'),
        # Receiver
        'receiver_name':    data.get('receiver_name', ''),
        'receiver_phone':   data.get('receiver_phone', ''),
        'receiver_address': data['receiver_address'],
        'receiver_lat':     data.get('receiver_lat'),
        'receiver_lng':     data.get('receiver_lng'),
        # Package
        'description':      data.get('description', ''),
        'reward':           float(data['reward']),
        'package_photo':    data.get('package_photo', ''),   # base64 taken by sender
        # Status
        'status':           'pending',
        'accepted_by':      None,
        # Proof photos
        'pickup_photo':     '',    # taken by traveller at pickup
        'delivery_photo':  '',    # taken by traveller on delivery
    }
    return jsonify({'package_id': pkg_id, 'message': 'Package created successfully'}), 201


# ── 2. Match Packages (all pending, safe view) ─────────────────────────────────
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


# ── 3. Accept Package ──────────────────────────────────────────────────────────
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
    })


# ── 4. Complete Delivery ───────────────────────────────────────────────────────
@app.route('/complete-delivery', methods=['POST'])
def complete_delivery():
    data = request.get_json()
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


# ── 5. Receiver — look up packages by phone ────────────────────────────────────
@app.route('/receiver-packages', methods=['GET'])
def receiver_packages():
    phone = request.args.get('phone', '').strip()
    if not phone:
        return jsonify({'error': 'phone query param required'}), 400

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


# ── 6. Single package (for tracking by ID) ────────────────────────────────────
@app.route('/package/<pkg_id>', methods=['GET'])
def get_package(pkg_id):
    pkg = packages.get(pkg_id.upper())
    if not pkg:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'id':               pkg['id'],
        'sender_address':   pkg['sender_address'],
        'receiver_address': pkg['receiver_address'],
        'description':      pkg['description'],
        'reward':           pkg['reward'],
        'status':           pkg['status'],
        'accepted_by':      pkg.get('accepted_by', ''),
        'package_photo':    pkg.get('package_photo', ''),
        'pickup_photo':     pkg.get('pickup_photo', ''),
        'delivery_photo':   pkg.get('delivery_photo', ''),
    })


# ── 7. All packages (debug) ───────────────────────────────────────────────────
@app.route('/packages', methods=['GET'])
def all_packages():
    return jsonify(list(packages.values()))


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)

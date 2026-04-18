"""
HopDrop — Flask Backend (v3)
Added: /register and /login endpoints with in-memory user store.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# ── In-memory storage ──────────────────────────────────────────────────────────
packages = {}   # id -> package dict
users = {}      # name or phone -> { "wallet_balance": float, "locked_balance": float, "transactions": list, ... auth fields }
LOCK_AMOUNT = 50.0  # ₹50 deposit required to accept a package
# ──────────────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return app.send_static_file('index.html')

def get_or_create_user(name):
    if name not in users:
        # Give a starting balance to test easily
        users[name] = {"wallet_balance": 150.0, "locked_balance": 0.0, "transactions": [], "verified": False}
    return users[name]

@app.route('/wallet/<name>', methods=['GET'])
def get_wallet(name):
    user = get_or_create_user(name)
    return jsonify(user)

@app.route('/top-up', methods=['POST'])
def top_up():
    data = request.get_json()
    name = data.get('traveller_name', '')
    amount = float(data.get('amount', 0))
    if not name or amount <= 0:
        return jsonify({'error': 'Invalid name or amount'}), 400
    
    user = get_or_create_user(name)
    user['wallet_balance'] += amount
    user['transactions'].append(f'Top-Up: Added ₹{amount}')
    return jsonify({'message': f'Successfully topped up ₹{amount}', 'new_balance': user['wallet_balance']})

@app.route('/verify-identity', methods=['POST'])
def verify_identity():
    data = request.get_json()
    name = data.get('traveller_name', '')
    if not name:
        return jsonify({'error': 'Invalid name'}), 400
    
    user = get_or_create_user(name)
    user['verified'] = True
    user['transactions'].append('Identity Verified: Student ID & Selfie captured')
    return jsonify({'message': 'Identity Verified Successfully!'})


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

    user = get_or_create_user(traveller_name)
    if not user.get('verified', False):
        return jsonify({'error': 'Account not verified! Please complete Student Verification to accept packages.'}), 403

    if user['wallet_balance'] < LOCK_AMOUNT:
        return jsonify({'error': f'Insufficient wallet balance! Minimum ₹{LOCK_AMOUNT} required as deposit.'}), 400

    # Lock Deposit
    user['wallet_balance'] -= LOCK_AMOUNT
    user['locked_balance'] += LOCK_AMOUNT
    user['transactions'].append(f'Locked ₹{LOCK_AMOUNT} deposit for package {pkg_id}')

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


# ── 3b. Confirm Pickup (Sender -> Traveller OTP) ───────────────────────────────
@app.route('/pickup-package', methods=['POST'])
def pickup_package():
    data = request.get_json()
    pkg_id = data.get('package_id', '').upper()
    otp = data.get('otp', '1234')

    if pkg_id not in packages:
        return jsonify({'error': 'Package not found'}), 404

    pkg = packages[pkg_id]
    if pkg['status'] != 'accepted':
        return jsonify({'error': f"Package must be 'accepted' first, currently {pkg['status']}"}), 400

    if str(otp) != "1234":
        return jsonify({'error': 'Invalid Pickup OTP from Sender'}), 400

    pkg['status'] = 'in-transit'
    
    if data.get('pickup_photo'):
        pkg['pickup_photo'] = data['pickup_photo']

    return jsonify({
        'message': 'Pickup confirmed! Secure chain started.'
    })


# ── 4. Complete Delivery (Traveller -> Receiver OTP) ───────────────────────────
@app.route('/complete-delivery', methods=['POST'])
def complete_delivery():
    data   = request.get_json()
    pkg_id = data.get('package_id', '').upper()
    otp = data.get('otp', '9876')

    if pkg_id not in packages:
        return jsonify({'error': 'Package not found'}), 404
    pkg = packages[pkg_id]
    if pkg['status'] == 'delivered':
        return jsonify({'error': 'Already delivered'}), 400
    if pkg['status'] != 'in-transit':
        return jsonify({'error': 'Package must be picked up before delivery'}), 400

    if str(otp) != "9876":
        return jsonify({'error': 'Invalid Delivery OTP from Receiver'}), 400

    pkg['status'] = 'delivered'
    if data.get('delivery_photo'):
        pkg['delivery_photo'] = data['delivery_photo']

    reward           = pkg['reward']
    traveller_earned = round(reward * 0.80, 2)
    platform_fee     = round(reward * 0.20, 2)

    traveller_name = pkg.get('accepted_by', '')
    if traveller_name in users:
        user = users[traveller_name]
        if user['locked_balance'] >= LOCK_AMOUNT:
            # Release deposit
            user['locked_balance'] -= LOCK_AMOUNT
            user['wallet_balance'] += LOCK_AMOUNT
            user['transactions'].append(f'Released ₹{LOCK_AMOUNT} deposit for package {pkg_id}')
        
        # Add earnings
        user['wallet_balance'] += traveller_earned
        user['transactions'].append(f'Earned ₹{traveller_earned} from package {pkg_id}')
    return jsonify({
        'message':          'Delivery confirmed! Waiting for Sender to complete the payment. 💸',
        'reward':           reward,
    })


# ── 4b. Cancel Delivery (Penalty) ──────────────────────────────────────────────
@app.route('/cancel-delivery', methods=['POST'])
def cancel_delivery():
    data = request.get_json()
    pkg_id = data.get('package_id', '').upper()
    penalty_amount = float(data.get('penalty', LOCK_AMOUNT)) # Can be partial or full

    if pkg_id not in packages:
        return jsonify({'error': 'Package not found'}), 404

    pkg = packages[pkg_id]
    if pkg['status'] != 'accepted':
        return jsonify({'error': 'Only accepted packages can be cancelled'}), 400

    traveller_name = pkg.get('accepted_by', '')
    if traveller_name in users:
        user = users[traveller_name]
        
        # Determine actual penalty based on locked balance (just in case)
        actual_penalty = min(penalty_amount, user['locked_balance'])
        returned_amount = LOCK_AMOUNT - actual_penalty
        
        user['locked_balance'] -= LOCK_AMOUNT
        user['wallet_balance'] += returned_amount
        
        user['transactions'].append(f'Cancelled package {pkg_id}. Penalty applied: ₹{actual_penalty}')

    pkg['status'] = 'pending'
    pkg['accepted_by'] = None

    return jsonify({'message': f'Delivery cancelled. Penalty applied: ₹{penalty_amount}'})


# ── 5. Receiver — look up packages by phone ────────────────────────────────────
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


# ── Sender: lookup packages by phone ───────────────────────────────────────────
@app.route('/sender-packages', methods=['GET'])
def sender_packages():
    phone = request.args.get('phone', '').strip()
    if not phone:
        return jsonify({'error': 'phone query param required'}), 400

    result = []
    for p in packages.values():
        if p.get('phone') == phone:
            result.append({
                'id':               p['id'],
                'receiver_name':    p['receiver_name'],
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

# ── Pay for Package ────────────────────────────────────────────────────────────
@app.route('/pay-package', methods=['POST'])
def pay_package():
    data = request.get_json()
    pkg_id = data.get('package_id', '').upper()
    
    if pkg_id not in packages:
        return jsonify({'error': 'Package not found'}), 404
        
    pkg = packages[pkg_id]
    if pkg['status'] == 'paid':
        return jsonify({'error': 'Already paid'}), 400
    if pkg['status'] != 'delivered':
        return jsonify({'error': 'Package is not delivered yet'}), 400
        
    pkg['status'] = 'paid'
    reward = pkg['reward']
    traveller_earned = round(reward * 0.80, 2)
    platform_fee = round(reward * 0.20, 2)
    
    return jsonify({
        'message': 'Payment successful! 🎉',
        'traveller_earned': traveller_earned,
        'platform_fee': platform_fee
    })


# ── Single package (for tracking by ID) ────────────────────────────────────────
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


# ── All packages (debug) ───────────────────────────────────────────────────────
@app.route('/packages', methods=['GET'])
def all_packages():
    return jsonify(list(packages.values()))


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)

"""
NeoBank API - Core Banking Service
Industry: Banking / FinTech
Version: 2.1.0

WARNING: This codebase contains intentional compliance violations
for demonstration purposes in the Compliance AutoPilot scanner.
"""

import os
import logging
import sqlite3
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///neobank.db'
app.config['SECRET_KEY'] = 'neobank-secret-key-2024'  # VIOLATION: Hardcoded secret
db = SQLAlchemy(app)

# VIOLATION: Root-level logger with no sanitization
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


# ========================
# DATABASE MODELS
# ========================

class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password = db.Column(db.String(255))         # VIOLATION: Plaintext password storage
    national_id = db.Column(db.String(50))        # VIOLATION: Unencrypted PII
    date_of_birth = db.Column(db.String(20))      # VIOLATION: DOB stored as plain string
    account_number = db.Column(db.String(20), unique=True)
    balance = db.Column(db.Float, default=0.0)
    kyc_status = db.Column(db.String(20), default='not_verified')  # No enforcement
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    sender_account = db.Column(db.String(20))
    receiver_account = db.Column(db.String(20))
    amount = db.Column(db.Float, nullable=False)
    card_number = db.Column(db.String(20))        # VIOLATION: Full card PAN stored in DB
    cvv = db.Column(db.String(4))                 # VIOLATION: CVV stored — PCI-DSS critical
    currency = db.Column(db.String(3), default='USD')
    description = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    aml_checked = db.Column(db.Boolean, default=False)   # AML check exists but never enforced


# ========================
# AUTH & REGISTRATION
# ========================

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    # VIOLATION: Logging raw user registration payload including PII
    logger.info(f"New customer registration: {data}")

    # VIOLATION: No input validation or sanitization
    customer = Customer(
        full_name=data.get('full_name'),
        email=data.get('email'),
        phone=data.get('phone'),
        password=data.get('password'),           # Stored as-is, no hashing
        national_id=data.get('national_id'),
        date_of_birth=data.get('date_of_birth'),
        account_number=f"NB{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    )
    db.session.add(customer)
    db.session.commit()

    # VIOLATION: Response leaks sensitive fields
    return jsonify({
        'success': True,
        'customer_id': customer.id,
        'account_number': customer.account_number,
        'national_id': customer.national_id,     # Should never be returned
        'balance': customer.balance
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # VIOLATION: Logging credentials at DEBUG level
    logger.debug(f"Login attempt: email={email}, password={password}")

    # VIOLATION: Plain text password comparison
    customer = Customer.query.filter_by(email=email, password=password).first()
    if not customer:
        return jsonify({'error': 'Invalid credentials'}), 401

    # VIOLATION: No session token expiry, no MFA enforcement for banking
    token = f"token_{customer.id}_{datetime.utcnow().timestamp()}"
    return jsonify({'token': token, 'customer_id': customer.id}), 200


# ========================
# TRANSACTIONS
# ========================

@app.route('/api/transfer', methods=['POST'])
def transfer():
    data = request.get_json()

    # VIOLATION: Card data accepted and stored without tokenization
    transaction = Transaction(
        sender_account=data.get('sender_account'),
        receiver_account=data.get('receiver_account'),
        amount=data.get('amount'),
        card_number=data.get('card_number'),     # Full PAN — PCI-DSS critical violation
        cvv=data.get('cvv'),                     # CVV storage is strictly prohibited
        description=data.get('description')
    )

    # VIOLATION: No AML check before processing
    # VIOLATION: No transaction limit enforcement
    # VIOLATION: No fraud detection hook

    # VIOLATION: Logging full card details
    logger.warning(f"Processing transfer: card={data.get('card_number')}, amount={data.get('amount')}")

    db.session.add(transaction)
    db.session.commit()
    return jsonify({'transaction_id': transaction.id, 'status': 'completed'}), 201


# ========================
# KYC — NOT ENFORCED
# ========================

@app.route('/api/kyc/submit', methods=['POST'])
def submit_kyc():
    """KYC exists but is never checked before allowing transactions."""
    data = request.get_json()
    customer_id = data.get('customer_id')
    customer = Customer.query.get(customer_id)
    if customer:
        # VIOLATION: KYC documents stored on disk without encryption
        doc_path = f"/tmp/kyc_{customer_id}.jpg"
        logger.info(f"Saved KYC doc to {doc_path} for customer {customer.national_id}")
        customer.kyc_status = 'submitted'
        db.session.commit()
    return jsonify({'status': 'submitted'}), 200


# VIOLATION: No route to allow customers to delete their data (Right to Erasure)
# VIOLATION: No data export endpoint (Right to Portability)
# VIOLATION: No consent management routes
# VIOLATION: No cross-border transfer disclosure for international transactions


@app.route('/api/customers', methods=['GET'])
def list_customers():
    # VIOLATION: No authentication check — any caller can list all customers
    # VIOLATION: No pagination — dumps entire customer table including PII
    customers = Customer.query.all()
    return jsonify([{
        'id': c.id,
        'full_name': c.full_name,
        'email': c.email,
        'national_id': c.national_id,           # Exposing national ID without auth
        'account_number': c.account_number,
        'balance': c.balance,
        'kyc_status': c.kyc_status
    } for c in customers]), 200


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # VIOLATION: Debug mode enabled in production-like setup
    app.run(debug=True, host='0.0.0.0', port=5001)

"""
CargoTrack - Global Shipment Tracking & Logistics Platform
Industry: Shipping / Logistics
Version: 1.8.3

WARNING: This codebase contains intentional compliance violations
for demonstration purposes in the Compliance AutoPilot scanner.
"""

import os
import json
import logging
import hashlib
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import requests  # Used for cross-border data transfer

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cargotrack.db'
app.config['SECRET_KEY'] = 'cargotrack-prod-secret-xyz'  # VIOLATION: Hardcoded secret

# VIOLATION: No log redaction — manifest details including personal addresses logged
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(name)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler('cargotrack.log'),   # VIOLATION: PII written to unencrypted log file
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('cargotrack')
db = SQLAlchemy(app)


# ========================
# DATABASE MODELS
# ========================

class Shipper(db.Model):
    __tablename__ = 'shippers'
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(200))
    contact_name = db.Column(db.String(200))       # PII
    email = db.Column(db.String(120))              # PII
    phone = db.Column(db.String(30))               # PII
    tax_id = db.Column(db.String(50))              # VIOLATION: Tax/VAT ID stored unencrypted
    address = db.Column(db.Text)                   # VIOLATION: Full address unencrypted
    password = db.Column(db.String(128))           # VIOLATION: Plaintext password
    api_key = db.Column(db.String(64))             # VIOLATION: API key stored in plaintext
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # No GDPR consent field
    # No data retention policy enforcement


class Shipment(db.Model):
    __tablename__ = 'shipments'
    id = db.Column(db.Integer, primary_key=True)
    tracking_number = db.Column(db.String(30), unique=True)
    shipper_id = db.Column(db.Integer, db.ForeignKey('shippers.id'))
    origin_country = db.Column(db.String(50))
    destination_country = db.Column(db.String(50))   # Cross-border indicator
    
    # VIOLATION: Full recipient PII stored unencrypted
    recipient_name = db.Column(db.String(200))
    recipient_address = db.Column(db.Text)
    recipient_email = db.Column(db.String(120))
    recipient_phone = db.Column(db.String(30))
    recipient_national_id = db.Column(db.String(50))   # VIOLATION: National ID for customs
    
    # Customs data — highly regulated
    customs_value = db.Column(db.Float)
    hs_code = db.Column(db.String(20))             # Harmonized System commodity code
    customs_declaration = db.Column(db.Text)       # VIOLATION: Unencrypted customs manifest
    
    weight_kg = db.Column(db.Float)
    dimensions = db.Column(db.String(100))
    status = db.Column(db.String(30), default='created')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    estimated_delivery = db.Column(db.DateTime)
    
    # VIOLATION: No field for cross-border data transfer consent
    # VIOLATION: No data retention expiry date


class TrackingEvent(db.Model):
    __tablename__ = 'tracking_events'
    id = db.Column(db.Integer, primary_key=True)
    shipment_id = db.Column(db.Integer, db.ForeignKey('shipments.id'))
    event_type = db.Column(db.String(50))
    location = db.Column(db.String(200))
    gps_lat = db.Column(db.Float)
    gps_lon = db.Column(db.Float)
    # VIOLATION: GPS coordinates retained indefinitely — data minimization violation
    handler_name = db.Column(db.String(200))       # Courier personal data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# ========================
# AUTH
# ========================

@app.route('/api/shippers/register', methods=['POST'])
def register_shipper():
    data = request.get_json()
    
    # VIOLATION: Logging all registration data including tax ID and address
    logger.info(f"New shipper registration: {data}")
    
    # VIOLATION: API key generated with weak method
    api_key = hashlib.md5(f"{data.get('email')}{datetime.utcnow()}".encode()).hexdigest()
    
    shipper = Shipper(
        company_name=data.get('company_name'),
        contact_name=data.get('contact_name'),
        email=data.get('email'),
        phone=data.get('phone'),
        tax_id=data.get('tax_id'),
        address=data.get('address'),
        password=data.get('password'),              # VIOLATION: No hashing
        api_key=api_key
    )
    db.session.add(shipper)
    db.session.commit()
    
    return jsonify({
        'shipper_id': shipper.id,
        'api_key': api_key,                        # VIOLATION: Returning full API key
        'tax_id': shipper.tax_id                   # VIOLATION: Echoing tax ID in response
    }), 201


# ========================
# SHIPMENTS
# ========================

@app.route('/api/shipments', methods=['POST'])
def create_shipment():
    data = request.get_json()
    
    # VIOLATION: Cross-border PII transfer with no consent check
    origin = data.get('origin_country', 'US')
    destination = data.get('destination_country', 'US')
    
    if origin != destination:
        # VIOLATION: PII transmitted internationally without consent record
        # Should check if recipient consented to data being sent to destination country jurisdiction
        logger.warning(f"Cross-border shipment: {origin} -> {destination}, recipient: {data.get('recipient_name')}, national_id: {data.get('recipient_national_id')}")
        
        # VIOLATION: Sending full customs manifest to third-party customs broker without encryption
        _send_to_customs_broker(data)
    
    tracking_number = f"CT{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:18]}"
    
    shipment = Shipment(
        tracking_number=tracking_number,
        shipper_id=data.get('shipper_id'),
        origin_country=origin,
        destination_country=destination,
        recipient_name=data.get('recipient_name'),
        recipient_address=data.get('recipient_address'),
        recipient_email=data.get('recipient_email'),
        recipient_phone=data.get('recipient_phone'),
        recipient_national_id=data.get('recipient_national_id'),
        customs_value=data.get('customs_value'),
        hs_code=data.get('hs_code'),
        customs_declaration=json.dumps(data.get('customs_items', [])),  # Unencrypted
        weight_kg=data.get('weight_kg'),
        dimensions=data.get('dimensions'),
        estimated_delivery=datetime.utcnow() + timedelta(days=data.get('transit_days', 7))
    )
    db.session.add(shipment)
    db.session.commit()
    
    return jsonify({'tracking_number': tracking_number, 'shipment_id': shipment.id}), 201


def _send_to_customs_broker(data):
    """
    VIOLATION: Raw PII and customs data sent to external service over HTTP.
    No encryption. No data processing agreement referenced.
    No audit trail of what was sent.
    """
    try:
        # VIOLATION: HTTP (not HTTPS) for sensitive customs data
        response = requests.post(
            'http://customs-broker-api.cargotrack.internal/submit',
            json={
                'recipient_name': data.get('recipient_name'),
                'national_id': data.get('recipient_national_id'),
                'declaration': data.get('customs_items'),
                'value': data.get('customs_value')
            },
            timeout=5
        )
        logger.debug(f"Customs broker response: {response.text}")
    except Exception as e:
        logger.error(f"Customs broker call failed: {e}")


@app.route('/api/shipments/<tracking_number>', methods=['GET'])
def track_shipment(tracking_number):
    shipment = Shipment.query.filter_by(tracking_number=tracking_number).first()
    if not shipment:
        return jsonify({'error': 'Not found'}), 404
    
    # VIOLATION: No auth check — anyone can track and retrieve recipient PII
    return jsonify({
        'tracking_number': shipment.tracking_number,
        'status': shipment.status,
        'recipient_name': shipment.recipient_name,         # PII exposed without auth
        'recipient_address': shipment.recipient_address,   # Full address exposed
        'recipient_national_id': shipment.recipient_national_id,  # Critical PII exposed
        'customs_declaration': shipment.customs_declaration,
        'estimated_delivery': str(shipment.estimated_delivery)
    }), 200


@app.route('/api/shipments', methods=['GET'])
def list_all_shipments():
    # VIOLATION: No authentication — dumps all shipment records including PII
    # VIOLATION: No pagination or rate limiting
    shipments = Shipment.query.all()
    return jsonify([{
        'id': s.id,
        'tracking_number': s.tracking_number,
        'recipient_name': s.recipient_name,
        'recipient_email': s.recipient_email,
        'recipient_national_id': s.recipient_national_id,
        'origin_country': s.origin_country,
        'destination_country': s.destination_country,
        'customs_value': s.customs_value
    } for s in shipments]), 200


# VIOLATION: No route to delete shipment data (Right to Erasure)
# VIOLATION: No data retention policy — old shipments with PII never purged
# VIOLATION: No consent management for cross-border recipients
# VIOLATION: No mechanism to notify recipients their data crossed borders


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # VIOLATION: Debug mode in production
    app.run(debug=True, host='0.0.0.0', port=5002)

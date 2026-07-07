# app.py (demo-repo)
import os
import logging
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# SQLite connection without SSL or encryption configurations
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User Database Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # GDPR VIOLATION: Storing passwords in plaintext (unhashed)
    password = db.Column(db.String(120), nullable=False)

# Initialize Database
with app.app_context():
    db.create_all()

# User Registration Endpoint
@app.route("/register", methods=["POST"])
def register_user():
    data = request.json
    
    # GDPR VIOLATION: Log leak of PII parameters (email, password)
    print(f"[DEBUG LOG] New registration received: email={data.get('email')}, password={data.get('password')}")
    
    # Check if user exists
    existing_user = User.query.filter_by(email=data.get("email")).first()
    if existing_user:
        return jsonify({"error": "User email already registered"}), 400
        
    new_user = User(
        username=data.get("username"),
        email=data.get("email"),
        # GDPR VIOLATION: Password assigned directly in plaintext without hashing
        password=data.get("password")
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "Registration successful."}), 201

# Profile read endpoint
@app.route("/api/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Returns PII info
    return jsonify({
        "username": user.username,
        "email": user.email
    }), 200

# GDPR VIOLATION: Missing DELETE endpoint for right to erasure (Article 17)
# GDPR VIOLATION: Missing consent agreement log entries on user profiles (Article 7)

if __name__ == "__main__":
    app.run(port=5000, debug=True)

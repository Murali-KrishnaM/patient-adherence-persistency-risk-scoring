import os
from functools import wraps
from datetime import datetime, timedelta
import jwt
from flask import request, jsonify
from db import query_one

JWT_SECRET = os.environ.get("JWT_SECRET", "super_secret_fallback_key")
JWT_EXPIRATION_HOURS = 24

def generate_token(user_id, username, role):
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_current_user():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    return decode_token(token)

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        # Set user in request context if needed
        request.user = user
        return f(*args, **kwargs)
    return decorated

def require_role(role_name):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Unauthorized"}), 401
            if user.get("role") != role_name:
                return jsonify({"error": "Forbidden"}), 403
            request.user = user
            return f(*args, **kwargs)
        return decorated
    return decorator

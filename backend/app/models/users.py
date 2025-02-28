# app/models/users.py
from datetime import datetime
from bson import ObjectId
from werkzeug.security import generate_password_hash
import secrets 
from datetime import datetime
from bson import ObjectId

class User:
    def __init__(self, firstName, lastName, user_email, password, 
                 role='user', address=None, phone_number=None, 
                 verification_token=None, verified=False):
        self.firstName = firstName
        self.lastName = lastName
        self.user_email = user_email
        self.password = generate_password_hash(password)
        self.role = role
        self.address = address
        self.phone_number = phone_number
        self.verification_token = verification_token
        self.verified = verified
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        return {
            "_id": ObjectId(),
            "firstName": self.firstName,
            "lastName": self.lastName,
            "user_email": self.user_email,
            "password": self.password,
            "role": self.role,
            "address": self.address,
            "phone_number": self.phone_number,
            "verification_token": self.verification_token,
            "verified": self.verified,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
    @staticmethod
    def hash_password(password):
        """Securely hash the password."""
        return generate_password_hash(password)

    @staticmethod
    def generate_verification_token():
        """Generate a secure verification token."""
        return secrets.token_urlsafe(32)

    # Validator functions can also reside here
    def validate_password_strength(password):
        # Simple example of password validation
        import re
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search("[a-z]", password):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search("[A-Z]", password):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search("[0-9]", password):
            raise ValueError("Password must contain at least one digit.")
     
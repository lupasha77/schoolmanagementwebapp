import secrets

# Generate a secure secret key
secret_key = secrets.token_hex(32)  # 32 bytes = 64 characters
jwt_secret_key = secrets.token_hex(32)  # 32 bytes = 64 characters
jwt_refresh_secret_key=secrets.token_hex(32)
print("SECRET_KEY:", secret_key)
print("JWT_SECRET_KEY:", jwt_secret_key)
print("JWT_REFRESH_SECRET_KEY:",jwt_refresh_secret_key)
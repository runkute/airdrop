#!/usr/bin/env python3
"""Generate a Fernet encryption key for storing sensitive credentials."""
from cryptography.fernet import Fernet

key = Fernet.generate_key()
print(f"Encryption key: {key.decode()}")
print("\nAdd this to your .env file as:")
print(f"ENCRYPTION_KEY={key.decode()}")
print("\nIMPORTANT: Keep this key secure and backed up.")
print("Losing it means encrypted credentials in the database cannot be decrypted.")

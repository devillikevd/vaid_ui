import os
import sys
import boto3
import base64

# Initialize boto3 SSM client
ssm = boto3.client('ssm', region_name='ap-south-1')
prefix = '/swastik/prod/'

def load_env(filepath):
    env_vars = {}
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return env_vars
    
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                env_vars[key.strip()] = val.strip()
    return env_vars

env_vars = load_env('swastik-backend/.env')

secrets_to_upload = [
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "DATABASE_URL",
    "JWT_SECRET",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "MONGODB_URI",
    "GROQ_API_KEY",
    "GEMINI_API_KEY",
    "HUGGINGFACE_API_KEY",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "EMAIL_FROM_ADDRESS",
    "FIREBASE_SERVICE_ACCOUNT_BASE64",
    "FIREBASE_PRIVATE_KEY",
    "PHI_ENCRYPTION_KEY"
]

# Special cases
if "JWT_ACCESS_SECRET" not in env_vars and "JWT_SECRET" in env_vars:
    env_vars["JWT_ACCESS_SECRET"] = env_vars["JWT_SECRET"]
if "JWT_REFRESH_SECRET" not in env_vars and "JWT_SECRET" in env_vars:
    env_vars["JWT_REFRESH_SECRET"] = env_vars["JWT_SECRET"]

if "FIREBASE_SERVICE_ACCOUNT" in env_vars:
    file_path = env_vars["FIREBASE_SERVICE_ACCOUNT"]
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            env_vars["FIREBASE_SERVICE_ACCOUNT_BASE64"] = base64.b64encode(f.read()).decode('utf-8')
    else:
        print(f"Warning: Firebase JSON file not found at {file_path}")

# TURN Password (not in secret_names, but used by turn.tf)
if "WEBRTC_TURN_PASSWORD" in env_vars:
    env_vars["turn_password"] = env_vars["WEBRTC_TURN_PASSWORD"]
else:
    # Generate a random password if missing
    import secrets
    env_vars["turn_password"] = secrets.token_hex(16)

# Also push turn_password
secrets_to_upload.append("turn_password")

for key in secrets_to_upload:
    val = env_vars.get(key, "")
    if val:
        param_name = f"{prefix}{key}"
        try:
            print(f"Uploading {param_name}...")
            ssm.put_parameter(
                Name=param_name,
                Value=val,
                Type='SecureString',
                Overwrite=True
            )
            print(f"Success: {param_name}")
        except Exception as e:
            print(f"Error uploading {param_name}: {e}")
    else:
        print(f"Skipping {key}: No value found in .env")

print("Finished uploading secrets.")

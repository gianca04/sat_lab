import os
import sys

# Agrega la ruta actual al path para importar correctamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User
from auth import hash_password
from dotenv import load_dotenv

load_dotenv()

def register_api_token():
    db = SessionLocal()
    try:
        # Usa el token del environment o el proporcionado
        token = os.getenv("API_SECRET_TOKEN", "mi_super_secreto_token_12345")
        username = "api_admin"
        email = "api_admin@sat_lab.local"
        
        # Verificar si el usuario ya existe
        existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        
        if existing_user:
            print(f"El usuario '{username}' ya existe en la base de datos. Actualizando contraseña/token...")
            existing_user.hashed_password = hash_password(token)
        else:
            print(f"Creando el usuario '{username}' en la base de datos con el token especificado...")
            new_user = User(
                username=username,
                email=email,
                hashed_password=hash_password(token),
                full_name="API Admin (Token User)",
                role="admin",
                is_active=True,
                is_superuser=True
            )
            db.add(new_user)
        
        db.commit()
        print("Token registrado exitosamente como credencial para el usuario 'api_admin'.")
        
    except Exception as e:
        print(f"Error al registrar el token: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    register_api_token()

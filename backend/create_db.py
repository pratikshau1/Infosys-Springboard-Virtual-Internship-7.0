import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import Base, engine
from app.models import *

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully.")

import cv2
import numpy as np
from PIL import Image
import os

try:
    from rembg import remove
except ImportError:
    remove = None

def process_logo(input_path, output_path):
    print(f"Processing logo: {input_path}")
    if not os.path.exists(input_path):
        print("File not found.")
        return
        
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        return
        
    # If not RGBA, convert
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    # Upscale 3x
    h, w = img.shape[:2]
    img = cv2.resize(img, (w*3, h*3), interpolation=cv2.INTER_CUBIC)
    
    # Remove light background
    # Create mask where pixels are close to white
    b, g, r, a = cv2.split(img)
    mask = ((r > 240) & (g > 240) & (b > 240))
    a[mask] = 0
    
    img = cv2.merge((b, g, r, a))
    cv2.imwrite(output_path, img)
    print("Logo processed.")

def process_phone(input_path, output_path):
    print(f"Processing phone: {input_path}")
    if not os.path.exists(input_path):
        print("File not found.")
        return
        
    # Read with PIL
    img = Image.open(input_path)
    
    # Remove background if rembg is available
    if remove:
        img = remove(img)
        print("Background removed with rembg.")
    else:
        print("rembg not available, skipping background removal.")
        
    # Upscale 2x
    w, h = img.size
    img = img.resize((w*2, h*2), Image.Resampling.LANCZOS)
    
    img.save(output_path)
    print("Phone processed.")

if __name__ == "__main__":
    public_dir = r"d:\vaididea update\SWASTIK-TELEMEDICINE\swastik-web\public"
    
    logo_path = os.path.join(public_dir, "vaididea-logo.png")
    phone_path = os.path.join(public_dir, "phone-mockup.png")
    
    process_logo(logo_path, logo_path)
    process_phone(phone_path, phone_path)
    
    print("Done.")

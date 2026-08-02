from PIL import Image
import os

input_path = r"C:\Users\Divyanshu\.gemini\antigravity-ide\brain\bdeffe3a-eb00-4b88-9731-36b50ff3186a\media__1785524715968.jpg"
output_path = r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\res\drawable\book_gym_coaches_img.jpg"

try:
    img = Image.open(input_path)
    img = img.convert('RGB')
    img.save(output_path, "JPEG")
    print(f"Successfully converted and saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")

import xml.etree.ElementTree as ET
import os

base_dir = '/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/res/'
langs = ['bn', 'hi', 'kn', 'mr', 'ta', 'te']

for lang in langs:
    folder = f"values-{lang}"
    file_path = os.path.join(base_dir, folder, "strings.xml")
    
    if not os.path.exists(file_path):
        continue
        
    # Read manually to preserve comments and structure, we'll just keep the first occurrence of each name
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    seen_names = set()
    new_lines = []
    
    for line in lines:
        if '<string name="' in line:
            start = line.find('<string name="') + 14
            end = line.find('"', start)
            name = line[start:end]
            if name in seen_names:
                continue # Skip duplicate
            seen_names.add(name)
        new_lines.append(line)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Fixed dupes for {lang}")

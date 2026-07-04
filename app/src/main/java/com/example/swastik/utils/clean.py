import re
import sys

file_path = r'c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\java\com\example\swastik\utils\CategoryTranslator.kt'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

key_last_index = {}
pattern = re.compile(r'^\s*\"([^\"]+)\"\s*->')

for i, line in enumerate(lines):
    match = pattern.search(line)
    if match:
        key = match.group(1)
        key_last_index[key] = i

new_lines = []
for i, line in enumerate(lines):
    match = pattern.search(line)
    if match:
        key = match.group(1)
        if key_last_index[key] != i:
            continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Cleaned CategoryTranslator.kt')

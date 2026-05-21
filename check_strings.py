import xml.etree.ElementTree as ET
import os

def get_keys(file_path):
    if not os.path.exists(file_path): return set()
    tree = ET.parse(file_path)
    return {child.attrib['name']: child.text for child in tree.getroot() if child.tag == 'string' and 'name' in child.attrib}

base_strings = get_keys('/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/res/values/strings.xml')
mr_strings = get_keys('/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/res/values-mr/strings.xml')

missing_in_mr = {k: v for k, v in base_strings.items() if k not in mr_strings}

print(f"Base strings: {len(base_strings)}")
print(f"Marathi strings: {len(mr_strings)}")
print(f"Missing in Marathi: {len(missing_in_mr)}")
print("Sample missing strings:")
for k, v in list(missing_in_mr.items())[:10]:
    print(f"{k}: {v}")

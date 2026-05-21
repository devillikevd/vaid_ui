import xml.etree.ElementTree as ET
import os
from deep_translator import GoogleTranslator
import time
import re

def get_keys(file_path):
    if not os.path.exists(file_path): return {}
    tree = ET.parse(file_path)
    return {child.attrib['name']: child.text for child in tree.getroot() if child.tag == 'string' and 'name' in child.attrib}

base_dir = '/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/res/'
base_file = os.path.join(base_dir, 'values/strings.xml')
base_strings = get_keys(base_file)

langs = ['bn', 'hi', 'kn', 'mr', 'ta', 'te']

def escape_xml(text):
    text = str(text)
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace("'", "\\'")
    return text

for lang in langs:
    folder = f"values-{lang}"
    file_path = os.path.join(base_dir, folder, "strings.xml")
    
    if not os.path.exists(file_path):
        continue
        
    lang_strings = get_keys(file_path)
    missing_keys = [k for k in base_strings.keys() if k not in lang_strings]
    
    if not missing_keys:
        print(f"[{lang}] No missing keys.")
        continue
        
    print(f"[{lang}] Found {len(missing_keys)} missing keys. Translating...")
    
    new_xml = []
    translator = GoogleTranslator(source='auto', target=lang)
    
    for i, k in enumerate(missing_keys):
        original_text = base_strings[k]
        if not original_text:
            continue
            
        try:
            # simple interpolation extraction (like %s, %d, %1$s) might break if not handled, but we'll try basic translation
            # replace format arguments with placeholders to preserve them
            import re
            
            # extract string args
            args = re.findall(r'(%[0-9]*\$?[s|d|f])', original_text)
            text_to_translate = original_text
            for idx, arg in enumerate(args):
                text_to_translate = text_to_translate.replace(arg, f"__ARG{idx}__")
            
            translated_text = translator.translate(text_to_translate)
            
            # put arguments back
            for idx, arg in enumerate(args):
                translated_text = translated_text.replace(f"__ARG{idx}__", arg)
                
            val = escape_xml(translated_text)
            new_xml.append(f'    <string name="{k}">{val}</string>')
        except Exception as e:
            print(f"Error translating key {k} for {lang}: {e}")
            
        # brief delay to avoid rate limiting
        time.sleep(0.2)
        
    if new_xml:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Ensure we insert before </resources>
        if '</resources>' in content:
            content = content.replace('</resources>', '\n' + '\n'.join(new_xml) + '\n</resources>')
        else:
            content += '\n' + '\n'.join(new_xml) + '\n</resources>'
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[{lang}] Successfully appended {len(new_xml)} translations.")


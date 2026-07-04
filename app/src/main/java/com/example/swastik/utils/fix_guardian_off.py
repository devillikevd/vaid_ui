import os

translations = {
    'en': {"guardian_off": "Off"},
    'hi': {"guardian_off": "बंद"},
    'bn': {"guardian_off": "বন্ধ"},
    'kn': {"guardian_off": "ಆಫ್"},
    'mr': {"guardian_off": "बंद"},
    'ta': {"guardian_off": "ஆஃப்"},
    'te': {"guardian_off": "ఆఫ్"}
}

base_dir = r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\res"

def append_strings_to_file(file_path, translated_dict):
    if not os.path.exists(file_path):
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "</resources>" not in content:
        return
        
    new_xml = ""
    for k, v in translated_dict.items():
        if f'name="{k}"' in content:
            continue
        v = v.replace("'", "\\'").replace("&", "&amp;")
        new_xml += f'    <string name="{k}">{v}</string>\n'
        
    if new_xml:
        content = content.replace("</resources>", new_xml + "</resources>")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated XML: {file_path}")

for lang, text_dict in translations.items():
    if lang == 'en':
        file_path = os.path.join(base_dir, "values", "strings.xml")
    else:
        file_path = os.path.join(base_dir, f"values-{lang}", "strings.xml")
    append_strings_to_file(file_path, text_dict)

print("Done appending guardian_off.")

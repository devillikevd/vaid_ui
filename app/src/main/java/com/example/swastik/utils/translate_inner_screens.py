import os
import re

translations = {
    'en': {
        "filter_all": "All",
        "filter_lab_reports": "Lab Reports",
        "filter_prescriptions": "Prescriptions",
        "filter_scans": "Scans",
        "report_total": "Total",
        "report_lab": "Lab"
    },
    'hi': {
        "filter_all": "सभी",
        "filter_lab_reports": "लैब रिपोर्ट",
        "filter_prescriptions": "नुस्खे",
        "filter_scans": "स्कैन",
        "report_total": "कुल",
        "report_lab": "लैब"
    },
    'bn': {
        "filter_all": "সব",
        "filter_lab_reports": "ল্যাব রিপোর্ট",
        "filter_prescriptions": "প্রেসক্রিপশন",
        "filter_scans": "স্ক্যান",
        "report_total": "মোট",
        "report_lab": "ল্যাব"
    },
    'kn': {
        "filter_all": "ಎಲ್ಲಾ",
        "filter_lab_reports": "ಲ್ಯಾಬ್ ವರದಿಗಳು",
        "filter_prescriptions": "ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್",
        "filter_scans": "ಸ್ಕ್ಯಾನ್",
        "report_total": "ಒಟ್ಟು",
        "report_lab": "ಲ್ಯಾಬ್"
    },
    'mr': {
        "filter_all": "सर्व",
        "filter_lab_reports": "लॅब रिपोर्ट",
        "filter_prescriptions": "प्रिस्क्रिप्शन",
        "filter_scans": "स्कॅन",
        "report_total": "एकूण",
        "report_lab": "लॅब"
    },
    'ta': {
        "filter_all": "அனைத்தும்",
        "filter_lab_reports": "ஆய்வக அறிக்கைகள்",
        "filter_prescriptions": "மருந்துச் சீட்டுகள்",
        "filter_scans": "ஸ்கேன்",
        "report_total": "மொத்தம்",
        "report_lab": "ஆய்வகம்"
    },
    'te': {
        "filter_all": "అన్ని",
        "filter_lab_reports": "ల్యాబ్ నివేదికలు",
        "filter_prescriptions": "ప్రిస్క్రిప్షన్లు",
        "filter_scans": "స్కాన్లు",
        "report_total": "మొత్తం",
        "report_lab": "ల్యాబ్"
    }
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

print("Done appending Reports strings.")

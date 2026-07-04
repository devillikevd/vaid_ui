import os
import re

files_to_modify = [
    r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\java\com\example\swastik\ui\screens\patient\AppointmentHistoryScreen.kt",
    r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\java\com\example\swastik\ui\screens\patient\medicine\OrderHistoryScreen.kt",
    r"c:\Users\Divyanshu\OneDrive\Desktop\Project Vaididea\app\src\main\java\com\example\swastik\ui\screens\patient\diagnostic\BookingHistoryScreen.kt"
]

def replace_text_with_translated_text(content):
    # Regex to find Text(...) calls. We need to be careful with nested parentheses.
    # We will just look for `Text(` and see if it's followed by `stringResource`
    
    # We can do a simpler approach:
    # 1. Replace all `Text(` with `com.example.swastik.ui.components.TranslatedText(`
    # 2. But revert the ones that have `stringResource` inside them.
    
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        if 'Text(' in line and 'stringResource' not in line:
            # We don't want to replace TopAppBar title Text or similar if they are just components, but it's fine.
            # We also don't want to replace `BasicText` or others, so we match exactly `Text(` or ` Text(`
            # Using regex to replace `Text(` when it is a whole word
            line = re.sub(r'\bText\(', 'com.example.swastik.ui.components.TranslatedText(', line)
        new_lines.append(line)
        
    return '\n'.join(new_lines)

for file_path in files_to_modify:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = replace_text_with_translated_text(content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
    else:
        print(f"File not found: {file_path}")

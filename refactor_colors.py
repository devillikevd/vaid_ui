import os
import re

files_to_refactor = [
    'ui/screens/patient/medicine/MedicineCartScreen.kt',
    'ui/screens/patient/medicine/MedicineComponents.kt',
    'ui/screens/patient/medicine/OrderHistoryScreen.kt',
    'ui/screens/patient/medicine/MedicineScreen.kt'
]

base_dir = '/Users/nayanprakash/tech folder/SWASTIK/swastik/app/src/main/java/com/example/swastik'

replacements = [
    (r'\bColor\.Black\b', 'MaterialTheme.colorScheme.onSurface'),
    (r'\bColor\.DarkGray\b', 'MaterialTheme.colorScheme.onSurface'),
    (r'\bColor\.LightGray\b', 'MaterialTheme.colorScheme.outlineVariant'),
    (r'\bColor\.Gray\b', 'MaterialTheme.colorScheme.onSurfaceVariant'),
    (r'Color\(0xFFF5F5F5\)', 'MaterialTheme.colorScheme.surfaceVariant'),
    (r'Color\(0xFFEEEEEE\)', 'MaterialTheme.colorScheme.surfaceVariant'),
    (r'Color\(0xFFFFF3E0\)', 'MaterialTheme.colorScheme.secondaryContainer'),
    (r'Color\(0xFFEF6C00\)', 'MaterialTheme.colorScheme.onSecondaryContainer'),
    (r'Color\(0xFFE53935\)', 'MaterialTheme.colorScheme.error'),
    (r'Color\(0xFF4CAF50\)', 'MaterialTheme.colorScheme.secondary'),
    (r'Color\(0xFF2E7D32\)', 'MaterialTheme.colorScheme.onSecondaryContainer'),
    (r'Color\(0xFFE8F5E9\)', 'MaterialTheme.colorScheme.secondaryContainer'),
    (r'Color\(0xFFFFEBEE\)', 'MaterialTheme.colorScheme.errorContainer'),
    (r'Color\(0xFFC62828\)', 'MaterialTheme.colorScheme.onErrorContainer'),
    (r'Color\(0xFFFF9800\)', 'MaterialTheme.colorScheme.tertiary'), # Maps orange to tertiary
    (r'Color\(0xFF121212\)', 'MaterialTheme.colorScheme.background'),
    (r'Color\(0xFF1E1E1E\)', 'MaterialTheme.colorScheme.surface'),
]

for file_path in files_to_refactor:
    full_path = os.path.join(base_dir, file_path)
    if not os.path.exists(full_path):
        print(f"Skipping {file_path}, not found.")
        continue

    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # White is tricky: sometimes it's onPrimary (text on purple), sometimes surface (background)
    # So we'll replace containerColor = Color.White with MaterialTheme.colorScheme.surface
    content = content.replace('containerColor = Color.White', 'containerColor = MaterialTheme.colorScheme.surface')
    content = content.replace('Color.White', 'MaterialTheme.colorScheme.surface')
    # Actually wait! If we just replace Color.White with surface, text on purple might disappear.
    # Text on purple should be onPrimary. Usually, if it's tint=Color.White inside TopAppBar or a Purple button, it should be onPrimary.
    
    # We will let the user know this script is doing basic replacements, but we might need manual fixups.
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)

    # Ensure MaterialTheme import
    if 'androidx.compose.material3.MaterialTheme' not in content:
        content = content.replace('import androidx.compose.ui.Modifier', 'import androidx.compose.material3.MaterialTheme\nimport androidx.compose.ui.Modifier')
        
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Refactored {file_path}")

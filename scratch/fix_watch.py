import os
import re

def fix_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('screens/WatchAreaScreen.js', [
    ('ScrollView,\n', ''),
    ('ScrollView,\r\n', ''),
    ('  Card,\n  Button,\n', ''),
    ('  Card,\r\n  Button,\r\n', ''),
    ('{ item, index }', '{ item }')
])

fix_file('screens/WatchAreaScreen.web.js', [
    ('TouchableOpacity, ', ''),
    ("import { Alert } from 'react-native';\n", ''),
    ("import { Alert } from 'react-native';\r\n", ''),
    ('const [newAreaCoords, setNewAreaCoords] = useState(null);\n', ''),
    ('const [newAreaCoords, setNewAreaCoords] = useState(null);\r\n', '')
])

print("Python script done.")

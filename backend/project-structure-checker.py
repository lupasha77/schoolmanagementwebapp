import os
import sys

def check_project_structure():
    """Check the project structure and print information for debugging"""
    current_dir = os.getcwd()
    print(f"Current working directory: {current_dir}")
    
    # Print Python path
    print("\nPython path:")
    for p in sys.path:
        print(f"  - {p}")
    
    # Check for config module
    print("\nChecking for config module:")
    possible_config_paths = [
        os.path.join(current_dir, 'config'),
        os.path.join(current_dir, 'backend', 'config'),
        os.path.join(os.path.dirname(current_dir), 'config'),
    ]
    
    for path in possible_config_paths:
        exists = os.path.exists(path)
        is_dir = os.path.isdir(path) if exists else False
        has_init = os.path.exists(os.path.join(path, '__init__.py')) if is_dir else False
        
        print(f"  - {path}")
        print(f"    Exists: {exists}")
        print(f"    Is directory: {is_dir}")
        print(f"    Has __init__.py: {has_init}")
        
        if is_dir:
            print("    Files:")
            for f in os.listdir(path):
                print(f"      - {f}")
    
    # Check app module structure
    print("\nChecking app module structure:")
    app_dir = os.path.join(current_dir, 'app')
    if os.path.exists(app_dir) and os.path.isdir(app_dir):
        print(f"  App directory exists at: {app_dir}")
        init_file = os.path.join(app_dir, '__init__.py')
        if os.path.exists(init_file):
            print(f"  __init__.py exists")
            with open(init_file, 'r') as f:
                content = f.read()
                if 'create_app' in content:
                    print("  create_app function found in __init__.py")
        
        print("  App submodules:")
        for subdir in ['routes', 'services', 'models']:
            path = os.path.join(app_dir, subdir)
            if os.path.exists(path) and os.path.isdir(path):
                print(f"    - {subdir} (exists)")
            else:
                print(f"    - {subdir} (missing)")
    else:
        print(f"  App directory does not exist at: {app_dir}")
    
    # Print suggestions
    print("\nSuggestions:")
    print("1. If config module is missing, create it with the following structure:")
    print("   config/")
    print("   ├── __init__.py  (empty file)")
    print("   ├── DevConfig.py")
    print("   └── ProdConfig.py")
    print("\n2. If the module exists but can't be imported, ensure:")
    print("   - You're running the app from the correct directory")
    print("   - The PYTHONPATH includes the project root")
    print("   - __init__.py exists in all relevant directories")

if __name__ == "__main__":
    check_project_structure()
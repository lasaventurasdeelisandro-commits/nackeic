import os
import zipfile

def create_bundle():
    output_path = os.path.join(os.getcwd(), 'public', 'directo-proyecto-completo.zip')
    exclude_dirs = {'node_modules', 'dist', '.git', '.cache', '__pycache__', 'data'}
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(os.getcwd()):
            # Filter directories in place
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for file in files:
                if file.endswith('.zip') or file.startswith('.') and file not in ['.env.example', '.gitignore']:
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, os.getcwd())
                zipf.write(file_path, arcname)
                
    print(f"Generated bundle: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == '__main__':
    create_bundle()

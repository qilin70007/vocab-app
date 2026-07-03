import subprocess, sys
result = subprocess.run([sys.executable, '-m', 'pip', 'list'], capture_output=True, text=True)
for line in result.stdout.split('\n'):
    if any(k in line.lower() for k in ['translator', 'google', 'deep']):
        print(line)
print("---done---")

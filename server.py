#!/usr/bin/env python3
"""
Abhidhamma Reader Local & Cloud Server Launcher
Handles local Mac environments as well as headless cloud containers (GitHub Codespaces).
"""

import http.server
import socketserver
import os
import sys
import io

PORT = 8088
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web_app")

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)
        
    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, max-age=3600')
        super().end_headers()

    def send_head(self):
        if 'Range' not in self.headers:
            return super().send_head()
            
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
            
        range_header = self.headers.get('Range')
        try:
            range_val = range_header.strip().split('=')[1]
            parts = range_val.split('-')
            file_size = os.path.getsize(path)
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1
            if start >= file_size or end >= file_size or start > end:
                self.send_error(416, "Requested Range Not Satisfiable")
                return None
                
            ctype = self.guess_type(path)
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Last-Modified", self.date_time_string(os.path.getmtime(path)))
            self.end_headers()
            
            f = open(path, 'rb')
            f.seek(start)
            return io.BufferedReader(io.BytesIO(f.read(end - start + 1)))
        except Exception:
            return super().send_head()
        
    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run_server():
    os.chdir(WEB_DIR)
    host = "0.0.0.0"
    url = f"http://localhost:{PORT}"
    
    print("\n" + "=" * 62)
    print("  📖 ABHIDHAMMA READER SERVER IS RUNNING")
    print(f"  👉 Local URL: {url}")
    if os.environ.get("CODESPACE_NAME"):
        cs_domain = os.environ.get("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
        cs_name = os.environ.get("CODESPACE_NAME")
        print(f"  👉 Codespace URL: https://{cs_name}-{PORT}.{cs_domain}")
    print("  Press Ctrl+C to stop.")
    print("=" * 62 + "\n", flush=True)

    # Try opening browser if GUI display is available (local Mac/Linux)
    if not os.environ.get("CODESPACES"):
        try:
            import webbrowser
            webbrowser.open(url)
        except Exception:
            pass

    with ThreadedTCPServer((host, PORT), QuietHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    try:
        run_server()
    except KeyboardInterrupt:
        print("\nReader server stopped.")
    except Exception as e:
        sys.stderr.write(f"Error starting server: {e}\n")

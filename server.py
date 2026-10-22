#!/usr/bin/env python3
"""
Abhidhamma Reader Local Web Server Launcher
Automatically serves the web app and opens it in your default browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8088
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web_app")

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)
        
    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

if __name__ == "__main__":
    os.chdir(WEB_DIR)
    url = f"http://localhost:{PORT}"
    
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
            print(f"\n========================================================")
            print(f"📖 Abhidhamma Web & Mobile Reader is running!")
            print(f"👉 Local URL: {url}")
            print(f"   Press Ctrl+C to stop the server anytime.")
            print(f"========================================================\n")
            
            # Open default browser
            webbrowser.open(url)
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nReader server stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")

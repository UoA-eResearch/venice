#!/usr/bin/env python
import BaseHTTPServer as bhs
import SimpleHTTPServer as shs

print('Serving HTTP on 127.0.0.1:8080...')
bhs.HTTPServer(("127.0.0.1", 8080), shs.SimpleHTTPRequestHandler).serve_forever()
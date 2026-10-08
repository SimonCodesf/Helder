#!/usr/bin/env python3
"""Fallback start command when Python 3, but not Node, is installed."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import functools
import argparse
parser=argparse.ArgumentParser(description='Start Helder lokaal.')
parser.add_argument('--port',type=int,default=4173)
args=parser.parse_args()
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.js':'text/javascript','.webmanifest':'application/manifest+json','.md':'text/plain'}
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
root=Path(__file__).resolve().parent
try:
    with ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(Handler,directory=str(root))) as server:
        print(f'Helder staat klaar op http://localhost:{args.port}\nLaat deze terminal open. Stoppen: Ctrl+C.')
        server.serve_forever()
except KeyboardInterrupt:
    print('\nHelder gestopt.')
except OSError as error:
    print(f'Starten mislukt: {error}\nProbeer: python start.py --port 4174')
    raise SystemExit(1)

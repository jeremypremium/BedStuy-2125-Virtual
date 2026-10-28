"""Make print-ready QR codes for a site: python3 qr/make_qr.py <slug>

Needs `pip3 install segno`. Set PUBLIC_BASE_URL to point codes somewhere other than
https://bedstuy2125.org (keep it in sync with the API's PUBLIC_BASE_URL).
"""
import os
import sys

import segno

BASE_URL = os.environ.get("PUBLIC_BASE_URL", "https://bedstuy2125.org").rstrip("/")
HERE = os.path.dirname(os.path.abspath(__file__))

if len(sys.argv) != 2:
    sys.exit("Usage: python3 qr/make_qr.py <slug>")

slug = sys.argv[1]
url = f"{BASE_URL}/s/{slug}"
# High error correction so the code still scans if the cloth folds or wears.
qr = segno.make(url, error="h", micro=False)
qr.save(os.path.join(HERE, f"{slug}.svg"), scale=20, border=4, dark="#1e2a1a", light="#ffffff")
qr.save(os.path.join(HERE, f"{slug}.png"), scale=60, border=4, dark="#1e2a1a", light="#ffffff")
print(f"{url} -> qr/{slug}.svg, qr/{slug}.png (QR version {qr.version})")

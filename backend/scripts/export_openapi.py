import json
from pathlib import Path

from backend.app.main import app


def export():
    spec = app.openapi()
    output = Path(__file__).parent.parent.parent / "openapi.json"
    with open(output, "w") as f:
        json.dump(spec, f, indent=2)
    print(f"OpenAPI spec exported to {output}")

if __name__ == "__main__":
    export()

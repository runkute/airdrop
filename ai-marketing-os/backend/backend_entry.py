"""
PyInstaller entry point for AI Marketing OS Desktop Backend.
This file is the main script that PyInstaller bundles.
"""
import os
import sys


def main():
    import uvicorn

    port = int(os.environ.get("BACKEND_PORT", 8765))
    log_level = os.environ.get("LOG_LEVEL", "info").lower()

    uvicorn.run(
        "app.main_desktop:app",
        host="127.0.0.1",
        port=port,
        log_level=log_level,
        reload=False,
        workers=1,
        loop="asyncio",
    )


if __name__ == "__main__":
    # Ensure the bundled app/ directory is on the path
    if getattr(sys, "frozen", False):
        bundle_dir = sys._MEIPASS
        sys.path.insert(0, bundle_dir)
        os.chdir(bundle_dir)

    main()

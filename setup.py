from setuptools import setup, find_packages

setup(
    name="fanpage-auto-post",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "anthropic>=0.40.0",
        "requests>=2.32.0",
        "python-dotenv>=1.0.0",
        "schedule>=1.2.2",
        "click>=8.1.7",
        "pyyaml>=6.0.2",
        "rich>=13.9.0",
        "apscheduler>=3.10.4",
    ],
    entry_points={
        "console_scripts": [
            "fanpage=fanpage_tool.cli:cli",
        ],
    },
    python_requires=">=3.11",
)

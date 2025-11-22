# SnailDB Python Archive

## About This Archive

This directory contains the legacy Python implementation of SnailDB (v1.x). These files are preserved for historical reference and for users who prefer the original Python version.

## Contents

```
archive/
└── python/
    ├── snaildb/
    │   ├── snaildb.py
    │   └── __init__.py
    ├── examples/
    │   ├── example.py
    │   └── example_usage.py
    ├── tests/
    │   └── test_snaildb.py
    ├── setup.py
    ├── requirements.txt
    └── README_LEGACY.md
```

## Why Archive?

With SnailDB v2.0 moving to TypeScript, we've preserved the Python implementation because:

1. **Historical Reference** - Understand how the project evolved
2. **Python Users** - Users who prefer Python can still reference v1.x
3. **Learning** - Compare Python vs TypeScript implementations
4. **Legacy Support** - Maintain backwards compatibility documentation

## Version Information

| Version | Language | Year | Status |
|---------|----------|------|--------|
| 1.0 | Python | 2021 | Archived |
| 1.1 | Python | 2021 | Archived |
| 1.2 | Python | 2022 | Archived |

## Using Legacy Python Version

If you need to use the Python version:

```bash
# Navigate to archive
cd archive/python

# Install dependencies
pip install -r requirements.txt

# Run setup
python setup.py install
```

## Migration to v2.0

See [docs/PREFACE.md](../../docs/PREFACE.md) and [docs/MIGRATION.md](../../docs/MIGRATION.md) for detailed migration instructions.

## Key Differences

### v1.x (Python)
- Procedural error handling
- No type definitions
- Direct return values
- Python-specific

### v2.0 (TypeScript)
- Response-based error handling
- Full type definitions
- Structured responses
- Cross-platform support

## Maintenance

**Status**: Legacy - Not actively maintained

For bug reports or questions about v2.0, please use the main repository.

---

**Last Updated**: November 2025

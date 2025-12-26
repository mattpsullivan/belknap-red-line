# Belknap Red-Line Tracker Documentation

Comprehensive documentation for the Belknap Red-Line Tracker application.

## Quick Links

| Audience | Start Here |
|----------|------------|
| **New Developer** | [Getting Started](./developer/getting-started.md) |
| **Architect** | [C4 Context Diagram](./architecture/c4-diagrams/1-context.md) |
| **Product Manager** | [Product Overview](./product/overview.md) |
| **Data Engineer** | [Tooling Overview](./tooling/overview.md) |

## Documentation Map

```
docs/
├── architecture/           # System design & decisions
│   ├── c4-diagrams/        # C4 model visualizations
│   ├── data-model.md       # Entity relationships
│   └── decisions/          # ADRs (Architecture Decision Records)
├── developer/              # Developer guides
│   ├── getting-started.md  # Setup & workflow
│   ├── services/           # Service layer docs
│   ├── hooks/              # Custom hooks reference
│   └── components/         # UI component library
├── tooling/                # Build-time tooling
│   ├── overview.md         # Pipeline overview
│   ├── gpx-parsing.md      # GPX import
│   └── loop-generation.md  # Loop creation
├── product/                # Product documentation
│   ├── overview.md         # Vision & features
│   ├── use-cases/          # User scenarios
│   └── features/           # Feature specs
├── end-user/               # User documentation (TODO)
└── api/                    # API reference
```

## Architecture

Understanding the system design:

1. **[C4 Context](./architecture/c4-diagrams/1-context.md)** - System in its environment
2. **[C4 Container](./architecture/c4-diagrams/2-container.md)** - Major technology components
3. **[C4 Component](./architecture/c4-diagrams/3-component.md)** - Internal React structure
4. **[Data Model](./architecture/data-model.md)** - Entities and relationships

## Developer Guide

Getting up and running:

1. **[Getting Started](./developer/getting-started.md)** - Prerequisites, setup, workflow
2. Project Structure - Directory layout and conventions
3. Hook Reference - Custom React hooks API
4. Testing Guide - Test patterns and utilities

## Tooling

Data pipeline documentation:

1. **[Tooling Overview](./tooling/overview.md)** - Scripts and data processing
2. GPX Parsing - Importing GPS tracks
3. Elevation Enrichment - Adding elevation data
4. Loop Generation - Creating itineraries

## Product

Product context and features:

1. **[Product Overview](./product/overview.md)** - Vision, users, features
2. User Personas - Target user profiles
3. Use Cases - Detailed user scenarios
4. Feature Documentation - In-depth feature specs

## Key Concepts

### Red-Lining

"Red-lining" is the hiking practice of hiking every trail in a given area, traditionally marked with a red line on a paper map. This app digitizes that concept:

- **Completed trails** are shown in red (the "red line")
- **Incomplete trails** are shown in blue
- **Progress** is tracked as percentage of total trails/distance

### Offline-First

The app is designed to work fully offline:

- Map tiles cached via Service Worker
- Trail data bundled with application
- User data stored in IndexedDB
- GPS recording works without network

### Privacy by Design

All user data stays on the device:

- No user accounts required
- No backend server
- No analytics or tracking
- Data export for backup

## Contributing

To contribute to documentation:

1. Follow the existing format and style
2. Use Mermaid for diagrams (renders in GitHub/VS Code)
3. Keep content current with code changes
4. Link related documents

## Status

| Section | Status |
|---------|--------|
| Architecture (C4) | Complete |
| Data Model | Complete |
| Developer Getting Started | Complete |
| Product Overview | Complete |
| Tooling Overview | Complete |
| Hook Reference | TODO |
| Use Cases | TODO |
| Feature Docs | TODO |
| End User Docs | TODO |
| API Reference | TODO |

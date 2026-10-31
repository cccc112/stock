# Stock Project

## graphify Knowledge Graph
This project has an AST knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- Do not run recursive grep/glob searches across the whole repo when exploring architecture; use the graph report first.
- CLI query commands:
  - `graphify query "<question>"`: BFS search across symbol dependencies
  - `graphify path "<NodeA>" "<NodeB>"`: Shortest path between two classes/modules
  - `graphify explain "<Node>"`: Plain-language explanation of a symbol and its callers
- After modifying code files, the Git hook automatically runs `graphify update .` (0 API tokens).

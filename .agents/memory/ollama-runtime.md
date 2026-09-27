---
name: Local Ollama runtime
description: Runtime constraints and safe operating defaults for Ollama in this workspace
---

The local workspace has CPU-only Ollama with roughly 8 GB of memory available to inference. The practical operating profile is one loaded model, one parallel request, and a 4096-token context. Pulling several multi-gigabyte models can hit the workspace's model-storage quota before the general filesystem is full.

**Why:** Larger model pulls can fail partway through and leave partial blobs; keeping the catalog small and loading models sequentially produces a usable local service instead of an unreliable multi-model process.

**How to apply:** Prefer 3B–4B models for the built-in profile, remove partial blobs after interrupted pulls, and surface actual installed-model state in the UI.
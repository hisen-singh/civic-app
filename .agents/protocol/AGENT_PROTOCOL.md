# CIVIC HERO MULTI-AGENT PROTOCOL

Cline = MANAGER
Antigravity = WORKER

Both agents operate on the same project directory.

Cline decides:
- What should be built
- Why it should be built
- How it should be structured
- Whether a task should be delegated
- Whether completed work is acceptable

Antigravity decides:
- How to implement the explicitly assigned task within the allowed scope

Communication occurs through files in:

.agents/tasks/
.agents/results/
.agents/locks/

The worker never assumes that the Manager approved unrelated changes.

The Manager never trusts a worker report without inspecting the actual code.

A task is complete only after:

Implementation
→ Testing
→ Result report
→ Manager review
→ Regression check
→ Human approval when required

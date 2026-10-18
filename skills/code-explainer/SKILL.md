---
name: code-explainer
description: Analyzes source code files, identifies design patterns, and generates concise technical summaries for open-source projects.
version: 1.0.0
author: Salman Ahmad (@ahmmikun)
license: MIT
metadata:
  standard: Agent Skill Open Standard
  target_models:
    - gemma:2b
    - gemma:7b
    - hermes-3
    - llama3.2
  tags:
    - code-analysis
    - open-source
    - documentation
---

# Code Explainer Skill

This skill guides open-weight AI agents in analyzing code snippets, repositories, and architectural patterns to provide developer-friendly explanations.

## Input Parameters

- `code` (string, required): The source code snippet or file content to analyze.
- `language` (string, optional): The programming language (e.g. Python, JavaScript, Go).
- `focus` (string, optional): Specific focus area, such as `architecture`, `security`, `performance`, or `patterns`.

## Execution Instructions

When invoked with source code:
1. **Analyze Structure**: Identify the primary classes, functions, and control flow.
2. **Detect Patterns**: Highlight architectural patterns (e.g. Factory, Strategy, MVC, Singleton).
3. **Review Security & Best Practices**: Flag unvalidated inputs, missing error handling, or exposed secrets.
4. **Output Format**: Format your response using clean Markdown with headers, bullet points, and code blocks.

## Example Prompt Template

```markdown
You are an expert open-source code analyst.
Analyze the following {{language}} code with a focus on {{focus}}:

```{{language}}
{{code}}
```

Provide:
1. Summary of functionality
2. Key architectural patterns observed
3. Recommendations for improvement
```

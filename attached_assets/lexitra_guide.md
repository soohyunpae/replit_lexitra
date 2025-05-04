Certainly! Based on our previous discussions and the contents of the tm-gpt-integration-plan.md file, here’s a comprehensive English guide that encapsulates the TM-GPT integration plan for Lexitra:

⸻

Lexitra: TM-Aware GPT Integration Guide

Introduction

Lexitra is a specialized translation tool designed to streamline the translation process, particularly for patent documents. It leverages Translation Memory (TM) and GPT-based machine translation to enhance consistency and efficiency. This guide outlines the integration strategy for combining TM with GPT to improve translation quality and workflow.

⸻

1. Current Workflow
	1.	User Input: A source sentence is submitted.
	2.	TM Search: The system searches the TM for existing matches.
	3.	GPT Translation: If no match is found, GPT generates a translation.
	4.	TM Update: The GPT output is saved as a new TM entry with status: "MT".

Limitation: GPT currently does not reference existing TM entries during translation, which can affect consistency.

⸻

2. Integration Goal

Enable GPT to reference relevant TM entries before generating translations to:
	•	Enhance term and phrase consistency.
	•	Promote reuse of approved translations.
	•	Reduce the need for manual reviews.

⸻

3. Target Architecture

Current Structure (Post-Refactoring)
	•	TM Management: Handled via Prisma ORM.
	•	UI Edits: Synced to Prisma database.
	•	GPT Translation: Managed by FastAPI (app/api/translate/main.py).
	•	TM Search: Conducted through FastAPI endpoints (check_tm, search_tm).

Proposed Future Structure
	•	Consolidate all TM storage and querying within Prisma.
	•	Modify GPT translation endpoint to accept top-N TM matches as input.
	•	Incorporate TM context (e.g., fuzzy matches, reviewed entries) into GPT prompts.
	•	Implement fuzzy match logic using embeddings or keyword similarity.

⸻

4. GPT Prompt Example (KO → EN)

You are a professional translator.

Here are similar previous translations:
- "기계는 신뢰성 있게 작동해야 한다." → "The machine must operate reliably."

Now translate:
"기계는 빠르고 신뢰성 있게 작동해야 한다."



⸻

5. Integration Strategy Phases

Phase 1: Core TM Consolidation (In Progress)
	•	Migrate all TM read/write operations to Prisma.
	•	Ensure TM entries store status values: MT, Fuzzy, 100%, Reviewed.
	•	Standardize API access via /api/update_tm and /api/search_tm.

Phase 2: TM Filtering & Embedding Support
	•	Implement vector search or similarity scoring.
	•	Introduce /api/search_tm?mode=embedding API.
	•	Develop a function to fetch top-N TM matches for GPT prompts.

Phase 3: GPT Prompt Engineering
	•	Enhance GPT prompts to include TM context.
	•	Conduct A/B testing to evaluate translation quality improvements.
	•	Provide options to override TM usage: TM-only or GPT-only modes.

Phase 4: Workflow Automation
	•	Auto-suggest TM matches prior to GPT invocation.
	•	Use only status: Reviewed entries for GPT prompting.
	•	Establish a real-time feedback loop for reviewers.

⸻

6. Execution Roadmap (Q2 2025)

Phase 1: TM Consolidation & Stabilization
	•	Migrate TM operations to Prisma.
	•	Normalize status, comment, and metadata fields.
	•	Unify TM UI and remove legacy components.
	•	Evaluate and consolidate /api/search_tm routes between FastAPI and Prisma.

Phase 2: Pre-GPT Integration Layer
	•	Design a reusable function (getTopMatches) to fetch top-N TM matches.
	•	Filter matches by status: Reviewed or Fuzzy.
	•	Define JSON format for GPT input with TM context.
	•	Test and refine GPT prompts incorporating TM references.

Phase 3: Embedding-Based Matching
	•	Embed all TM source sentences for vector-based search.
	•	Develop cosine similarity matching logic.
	•	Add /api/search_tm?mode=embedding API endpoint.
	•	Optionally incorporate similarity scores into GPT prompts.

Phase 4: Feedback & Automation
	•	Auto-suggest TM matches before GPT is called.
	•	Store reviewed GPT outputs with status: Reviewed.
	•	Build a feedback loop integrating TM and reviewer inputs.

⸻

7. Optional Considerations
	•	Generate prompts considering token length constraints.
	•	Prioritize terminology overrides alongside TM entries.
	•	Allow users to control TM injection into GPT prompts.

⸻

8. Conclusion

Integrating TM with GPT in Lexitra aims to:
	•	Improve translation consistency.
	•	Maximize the reuse of human-reviewed translations.
	•	Enhance scalability for professional and legal content translation.

This phased integration plan ensures a stable foundation for TM while enabling more intelligent use of GPT in the translation workflow.

⸻

If you need further assistance or have specific questions about implementing this integration, feel free to ask!
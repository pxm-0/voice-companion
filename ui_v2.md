
🧠 ELI — PRODUCT & UX DESIGN SPEC

Version: v0.2 (Voice-First Second Brain)

⸻

1. 🧭 PRODUCT DEFINITION

1.1 Core Thesis

Eli is a voice-first thinking environment that transforms raw thoughts into structured self-awareness.

It is not:
	•	a note-taking app
	•	a task manager
	•	a Notion clone

It is:

a system that captures → processes → evolves user cognition over time

⸻

1.2 Core Loop

Capture → Process → Extract → Act → Reflect → Evolve

Breakdown:
	•	Capture → voice session
	•	Process → transcript + AI understanding
	•	Extract → summary, ideas, tasks, themes
	•	Act → tasks + priorities
	•	Reflect → journal + daily consolidation
	•	Evolve → profile memory + patterns

⸻

2. 🧠 DESIGN PHILOSOPHY

2.1 State-Driven UX

Design for states, not pages.

Primary states:
	•	Idle
	•	Listening
	•	Processing
	•	Responding
	•	Reflecting

⸻

2.2 Progressive Intelligence

Information is never dumped.

All outputs must:
	•	appear in sequence
	•	feel generated in real time
	•	simulate “thinking”

⸻

2.3 Emotional Feedback Over UI Density

User should feel:
	•	heard (live transcript)
	•	understood (summary)
	•	guided (tasks)

⸻

2.4 Density by Context

Screen	Density
Today	Minimal
Journal	Structured
Profile	Distilled


⸻

2.5 One Purpose Per Screen

Screen	Purpose
Today	Interaction
Journal	History
Profile	Identity


⸻

3. 🏠 TODAY PAGE SPEC

3.1 Purpose

Primary interaction surface for:
	•	capturing thoughts
	•	receiving structured output
	•	initiating action

⸻

3.2 UI States

A. Idle State
	•	Orb: slow breathing animation
	•	Text prompt:
	•	“Start anywhere.”
	•	No clutter

⸻

B. Listening State

Triggered by: “Think With Me”

Changes:
	•	Background dims (~5–10%)
	•	Orb enlarges + pulses
	•	UI fades out
	•	Live transcript appears (side panel)

⸻

C. Processing State
	•	Orb animates (slow rotation / distortion)
	•	No immediate output (1–2s delay)

⸻

D. Response State

Output Order:
	1.	Summary
	2.	Ideas (optional)
	3.	Tasks

⸻

3.3 Staggered Reveal Behavior
	•	Summary appears centered
	•	After ~1.5s:
	•	shrinks and docks into position
	•	Ideas fade in
	•	Tasks appear with subtle “ping”

⸻

3.4 Tasks System (Today)

Properties:
	•	Title
	•	Priority (Low / Medium / High)
	•	Status (Open / Completed)
	•	Optional: Date

⸻

Interactions:
	•	✔ Complete → fade + collapse
	•	↑ Promote → becomes priority
	•	🗓 Schedule → assign date

⸻

Visual Behavior:
	•	New task → soft highlight/pulse
	•	Completed → opacity drop + collapse

⸻

3.5 Rules
	•	Max 3–5 visible tasks
	•	No historical clutter
	•	Only current relevance

⸻

4. 📓 JOURNAL PAGE SPEC

4.1 Purpose

Structured memory of:
	•	sessions
	•	days
	•	patterns over time

⸻

4.2 Data Hierarchy

Week
 └── Day
      ├── Sessions
      ├── Daily Summary
      ├── Tasks
      └── Themes


⸻

4.3 Day View

Each day includes:

A. Sessions
	•	List of voice entries
	•	Expandable:
	•	transcript
	•	summary
	•	extracted items

⸻

B. Daily Summary (Auto-generated)

Format:

“You focused on X, struggled with Y, and progressed in Z.”

⸻

C. Task Aggregation

All tasks from sessions merged:
	•	deduplicated
	•	grouped

⸻

D. Themes (Optional)

Recurring ideas for the day.

⸻

4.4 Weekly Layer

Top section:

Includes:
	•	Achievements
	•	Patterns
	•	Repeated themes

⸻

Purpose:

Transforms:

logs → meaning

⸻

5. 📊 HABIT INTEGRATION

5.1 Role

Habits are not standalone.

They act as:

contextual signals for interpretation

⸻

5.2 Usage

Feed into:
	•	Daily summaries
	•	Weekly insights
	•	Profile patterns

⸻

Example:

“You mentioned low energy on days you skipped workouts.”

⸻

6. 🧬 PROFILE PAGE SPEC

6.1 Purpose

Persistent, evolving identity model of the user.

⸻

6.2 Structure

A. Rolling Summary

Auto-generated identity description.

Example:

“You think deeply but delay starting. Once engaged, you sustain momentum.”

⸻

B. Patterns
	•	behavioral tendencies
	•	recurring cycles

⸻

C. Goals (Inferred)

Not user-input.
Derived from sessions.

⸻

D. Memory Fragments
	•	beliefs
	•	important realizations
	•	repeated thoughts

⸻

6.3 Behavior
	•	Updates incrementally
	•	Never resets abruptly
	•	Feels cumulative

⸻

7. ⚙️ SETTINGS

7.1 Access

Minimal, non-intrusive entry point.

⸻

7.2 Required Controls
	•	Dark Mode toggle
	•	Voice selection
	•	Logout
	•	(Optional)
	•	Data export
	•	Privacy controls

⸻

8. 🎙️ MODES SYSTEM (Future-Ready)

8.1 Purpose

Guide user thinking context.

⸻

8.2 Example Modes

Mode	Behavior
Brain Dump	fast, unstructured
Plan	task-heavy output
Reflect	slower, introspective
Problem Solve	structured reasoning


⸻

8.3 Effect

Modes influence:
	•	output structure
	•	pacing
	•	tone

⸻

9. 🎨 MOTION SYSTEM

9.1 Orb States

State	Behavior
Idle	breathing
Listening	pulsing
Processing	rotating/distorting
Responding	expanding


⸻

9.2 Timing
	•	Input delay: ~1–2s
	•	Stagger interval: 300–600ms
	•	Animations: smooth easing (ease-in-out)

⸻

9.3 Principles
	•	Never static
	•	Never distracting
	•	Always subtle

⸻

10. 🧩 SYSTEM ARCHITECTURE (CONCEPTUAL)

10.1 Entities
	•	Session
	•	Task
	•	Theme
	•	Day
	•	Week
	•	Memory Item

⸻

10.2 Flow

Session
 → Transcript
 → AI Extraction
     → Summary
     → Tasks
     → Themes
 → Stored in Day
 → Aggregated into Week
 → Updates Profile


⸻

11. 🧠 PRODUCT POSITIONING

Final Definition:

Eli is a system that turns raw voice input into structured self-awareness, evolving over time into a personalized cognitive model.

⸻
"""Named constants for the assessment app.

These are structural bounds (a rating has five levels, a tolerance is never
negative) rather than educational facts. Curriculum/coefficient numbers live in
``planner`` config, not here.
"""

#: LaTeX convention (chosen and documented here; see docs/assessment/A1.md).
#: Prompt and explanation text may embed math using dollar delimiters only:
#:   * inline:  ``$...$``   (rendered inline, e.g. ``$x^2$``)
#:   * display: ``$$...$$`` (rendered as a block, e.g. ``$$\\int_0^1 x\\,dx$$``)
#: The backend stores the delimiters verbatim and never parses/renders LaTeX --
#: clients are responsible for rendering (KaTeX/MathJax on web, a WebView or
#: native renderer on mobile). ``\\(...\\)`` and ``\\[...\\]`` are NOT used.
LATEX_INLINE_DELIMITER = "$...$"
LATEX_DISPLAY_DELIMITER = "$$...$$"

#: Difficulty is a 1-5 self-rating.
DIFFICULTY_MIN = 1
DIFFICULTY_MAX = 5

#: Option counts. Multiple-choice questions need at least two options; a
#: true/false question is exactly two (true, false) with exactly one correct.
MIN_MCQ_OPTIONS = 2
TRUE_FALSE_OPTIONS = 2

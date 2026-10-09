"""
ESCO taxonomy loader.

ESCO (European Skills, Competences, Qualifications and Occupations) is a
free, public EU taxonomy: https://esco.ec.europa.eu/en/use-esco/download
It ships as CSV files, including `skills_en.csv` with columns roughly:
`conceptUri, skillType, reuseLevel, preferredLabel, altLabels, ...`

This loader converts that CSV into the same internal `Skill` structure
used by `skill_matcher.py`, so production deployments can swap the small
seed YAML (`skills_taxonomy.yaml`) for the full ESCO dataset (13,000+
skills) without touching any matching logic.

O*NET (US, onetonline.org) publishes a similar free "Skills" and
"Technology Skills" dataset if a US-labor-market-specific taxonomy is
preferred - same idea, different loader would be needed for its column
schema.

Usage (once you've downloaded skills_en.csv from ESCO):
    from app.matching.taxonomy_loader import load_esco_csv
    skills = load_esco_csv("path/to/skills_en.csv")
"""

import csv
from typing import List

from app.matching.skill_matcher import Skill


def load_esco_csv(path: str, category: str = "hard") -> List[Skill]:
    """
    Parses an ESCO skills_en.csv export into a list of Skill objects.
    `altLabels` in ESCO exports are newline-separated within the cell.
    """
    skills: List[Skill] = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            preferred = row.get("preferredLabel", "").strip()
            if not preferred:
                continue
            alt_labels_raw = row.get("altLabels", "") or ""
            synonyms = [s.strip() for s in alt_labels_raw.split("\n") if s.strip()]
            skills.append(
                Skill(canonical=preferred, category=category, synonyms=synonyms)
            )
    return skills

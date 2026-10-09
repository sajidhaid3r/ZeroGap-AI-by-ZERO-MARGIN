"""
Canonical resume schema.

Field naming is loosely aligned with HR-XML / HR Open Standards resume
conventions where practical, so structured output stays interoperable
with real ATS/HRIS systems rather than being a bespoke, closed format.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    confidence: float = Field(0.0, description="0-1 extraction confidence score")


class ExperienceEntry(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date_raw: Optional[str] = None
    end_date_raw: Optional[str] = None
    is_current: bool = False
    bullets: List[str] = []
    source_lines: List[str] = Field(
        default_factory=list, description="Raw lines this entry was built from, for auditability"
    )


class EducationEntry(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_date_raw: Optional[str] = None
    gpa: Optional[str] = None


class Section(BaseModel):
    canonical_name: str
    raw_heading_text: str
    lines: List[str]
    matched_via: str = Field(
        description="'dictionary' | 'llm_fallback' | 'positional_heuristic' - "
        "tracks how this section was identified, for parser confidence auditing"
    )


class ParsedResume(BaseModel):
    contact: ContactInfo = ContactInfo()
    summary: Optional[str] = None
    experience: List[ExperienceEntry] = []
    education: List[EducationEntry] = []
    skills: List[str] = []
    certifications: List[str] = []
    projects: List[str] = []
    languages: List[str] = []
    raw_sections: List[Section] = []

    # Parser-level metadata, surfaced to the user rather than hidden
    parse_warnings: List[str] = []
    schema_version: str = "1.0.0"
    section_dictionary_version: str = "1.0.0"

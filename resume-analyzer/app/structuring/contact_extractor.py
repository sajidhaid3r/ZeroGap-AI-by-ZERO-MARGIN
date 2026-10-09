"""
Contact info extraction. Deliberately rule-based (regex), not LLM-based -
this is exactly the class of check that should be deterministic and
100% explainable (see architecture doc: "separate deterministic checks
from LLM-judgment checks").
"""

import re
from typing import List, Optional

from app.structuring.schema import ContactInfo

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# Loosely matches common phone formats: +1 555-123-4567, (555) 123 4567, etc.
PHONE_RE = re.compile(
    r"(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}"
)

LINKEDIN_RE = re.compile(r"(https?://)?(www\.)?linkedin\.com/in/[A-Za-z0-9\-_/]+", re.IGNORECASE)
WEBSITE_RE = re.compile(r"(https?://)?(www\.)?[A-Za-z0-9\-]+\.(com|dev|io|me|net|org)(/[A-Za-z0-9\-_/]*)?", re.IGNORECASE)

# Common free-email providers - flagged separately since "professional
# email address" is an explicit ATS-essentials check in the checklist.
FREE_EMAIL_DOMAINS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"}

UNPROFESSIONAL_LOCAL_PART_RE = re.compile(r"\d{3,}|xoxo|sexy|420|69|cool|swag", re.IGNORECASE)


def extract_email(text: str) -> Optional[str]:
    match = EMAIL_RE.search(text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    match = PHONE_RE.search(text)
    if not match:
        return None
    candidate = match.group(0)
    digits = re.sub(r"\D", "", candidate)
    if len(digits) < 7:  # too short to be a real phone number
        return None
    return candidate.strip()


def extract_linkedin(text: str) -> Optional[str]:
    match = LINKEDIN_RE.search(text)
    return match.group(0) if match else None


def is_unprofessional_email(email: str) -> bool:
    if "@" not in email:
        return False
    local_part = email.split("@")[0]
    return bool(UNPROFESSIONAL_LOCAL_PART_RE.search(local_part))


def extract_contact_info(lines: List[str]) -> ContactInfo:
    """
    Scans the top block of lines (where contact info conventionally lives)
    plus falls back to scanning all lines if nothing found up top.
    """
    contact = ContactInfo()
    fields_found = 0
    TOTAL_FIELDS = 4  # name, email, phone, linkedin - used for confidence

    search_pool = lines[:10] if len(lines) > 10 else lines

    for line in search_pool:
        if not contact.email:
            email = extract_email(line)
            if email:
                contact.email = email
                fields_found += 1
        if not contact.phone:
            phone = extract_phone(line)
            if phone:
                contact.phone = phone
                fields_found += 1
        if not contact.linkedin_url:
            linkedin = extract_linkedin(line)
            if linkedin:
                contact.linkedin_url = linkedin
                fields_found += 1

    # Name heuristic: first non-empty, header-shaped line that isn't
    # itself an email/phone/URL is very likely the candidate's name.
    for line in search_pool:
        stripped = line.strip()
        if not stripped:
            continue
        if EMAIL_RE.search(stripped) or LINKEDIN_RE.search(stripped):
            continue
        words = stripped.split()
        if 1 <= len(words) <= 4 and not any(ch.isdigit() for ch in stripped):
            contact.full_name = stripped
            fields_found += 1
            break

    contact.confidence = round(fields_found / TOTAL_FIELDS, 2)
    return contact

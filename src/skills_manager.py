import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional

class AgentSkill:
    """Represents an agent skill adhering to the Agent Skill Open Standard."""
    def __init__(self, name: str, description: str, version: str, content: str, path: Path, metadata: Dict[str, Any] = None):
        self.name = name
        self.description = description
        self.version = version
        self.content = content
        self.path = path
        self.metadata = metadata or {}

    def is_compliant(self) -> bool:
        """Verify compliance with the Agent Skill Open Standard."""
        return bool(self.name and self.description and self.version and self.metadata.get("standard") == "Agent Skill Open Standard")

    def __repr__(self) -> str:
        return f"<AgentSkill name={self.name!r} version={self.version!r} compliant={self.is_compliant()}>"


class SkillsManager:
    """Manages discovery, validation, and loading of Agent Skills."""

    def __init__(self, skills_dir: Optional[str] = None):
        if skills_dir:
            self.skills_dir = Path(skills_dir)
        else:
            self.skills_dir = Path(__file__).resolve().parent.parent / "skills"

    def list_skills(self) -> List[AgentSkill]:
        """Discover and load all skills from the skills directory."""
        skills = []
        if not self.skills_dir.exists():
            return skills

        for item in self.skills_dir.iterdir():
            if item.is_dir():
                skill_file = item / "SKILL.md"
                if skill_file.exists():
                    skill = self.load_skill(skill_file)
                    if skill:
                        skills.append(skill)
        return skills

    def get_skill(self, name: str) -> Optional[AgentSkill]:
        """Retrieve a specific skill by name."""
        for skill in self.list_skills():
            if skill.name == name:
                return skill
        return None

    def load_skill(self, file_path: Path) -> Optional[AgentSkill]:
        """Parse a SKILL.md file with YAML frontmatter."""
        try:
            text = file_path.read_text(encoding="utf-8")
            pattern = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)
            match = pattern.match(text)
            if not match:
                return None

            frontmatter_raw, body = match.groups()
            frontmatter = self._parse_yaml(frontmatter_raw)

            return AgentSkill(
                name=frontmatter.get("name", file_path.parent.name),
                description=frontmatter.get("description", ""),
                version=frontmatter.get("version", "1.0.0"),
                content=body.strip(),
                path=file_path,
                metadata=frontmatter.get("metadata", {})
            )
        except Exception as e:
            print(f"[SkillsManager] Error loading {file_path}: {e}")
            return None

    def _parse_yaml(self, text: str) -> Dict[str, Any]:
        """Minimal robust YAML parser for frontmatter metadata."""
        data: Dict[str, Any] = {}
        current_dict = data
        current_key = None

        for line in text.splitlines():
            line_stripped = line.strip()
            if not line_stripped or line_stripped.startswith("#"):
                continue

            if ":" in line_stripped:
                parts = line_stripped.split(":", 1)
                k = parts[0].strip()
                v = parts[1].strip()

                if v:
                    # Remove quotes
                    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                        v = v[1:-1]
                    current_dict[k] = v
                else:
                    data[k] = {}
                    current_dict = data[k]
                    current_key = k
            elif line_stripped.startswith("- ") and current_key:
                val = line_stripped[2:].strip()
                if not isinstance(current_dict, list):
                    current_dict = []
                    data[current_key] = current_dict
                current_dict.append(val)
        return data

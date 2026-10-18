from typing import Dict, Any, Optional
from .skills_manager import SkillsManager, AgentSkill
from .harness import ModelHarness

class FluxxionAgent:
    """Agent orchestrator integrating Agent Skills and Open-Weight Model Harness."""

    def __init__(self, harness: Optional[ModelHarness] = None, skills_manager: Optional[SkillsManager] = None):
        self.harness = harness or ModelHarness()
        self.skills_manager = skills_manager or SkillsManager()

    def execute_skill(self, skill_name: str, user_input: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute an Agent Skill conforming to the Agent Skill Open Standard."""
        skill = self.skills_manager.get_skill(skill_name)
        if not skill:
            raise ValueError(f"Skill '{skill_name}' not found in skills directory.")

        if not skill.is_compliant():
            print(f"[Warning] Skill '{skill_name}' does not strictly match Agent Skill Open Standard.")

        system_prompt = f"Skill: {skill.name}\nDescription: {skill.description}\n\nInstructions:\n{skill.content}"

        prompt = f"User Input:\n{user_input}\n"
        if parameters:
            prompt += f"\nParameters: {parameters}\n"

        result = self.harness.generate(prompt=prompt, system_prompt=system_prompt)

        return {
            "skill": skill.name,
            "skill_version": skill.version,
            "skill_compliant": skill.is_compliant(),
            "output": result["text"],
            "model": result["model"],
            "mode": result["mode"],
            "latency_seconds": result["latency_seconds"]
        }

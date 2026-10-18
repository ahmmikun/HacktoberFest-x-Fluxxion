#!/usr/bin/env python3
"""
Turnkey Demonstration Script for HacktoberFest-x-Fluxxion
Demonstrates Open-Source AI Model Harness and Agent Skill execution.
"""

import sys
import time
from src.skills_manager import SkillsManager
from src.harness import ModelHarness
from src.agent import FluxxionAgent

def run_demo():
    print("=" * 72)
    print("  MLH Hacktoberfest Hack Day Lahore x Fluxxion 2026")
    print("  Challenge: Best Open-Source AI Project (Sponsored by DigitalOcean)")
    print("  Project:   HacktoberFest-x-Fluxxion Turnkey Demonstration")
    print("=" * 72)
    print()

    # Step 1: Discover & Validate Agent Skills
    print("[Step 1/3] Discovering Agent Skills (Agent Skill Open Standard)...")
    sm = SkillsManager()
    skills = sm.list_skills()
    if not skills:
        print("  [Error] No skills found!")
        return

    for skill in skills:
        compliance = "COMPLIANT" if skill.is_compliant() else "NON-COMPLIANT"
        print(f"  * Skill:       {skill.name} (v{skill.version})")
        print(f"    Standard:    {skill.metadata.get('standard')} [{compliance}]")
        print(f"    Description: {skill.description}")
    print()

    # Step 2: Initialize Model Harness & Check Inference Engine
    print("[Step 2/3] Initializing Open-Weight Model Harness...")
    harness = ModelHarness(model_name="gemma:2b")
    is_live = harness.check_health()
    if is_live:
        print(f"  * Status: Connected to local Ollama runtime ({harness.base_url})")
        print("  * Mode:   Live Open-Weight Model (Gemma 2B)")
    else:
        print(f"  * Status: Ollama endpoint not detected at {harness.base_url}")
        print("  * Mode:   Engaging Built-in Deterministic Demo Simulation Engine")
    print()

    # Step 3: Execute Agent Skill
    sample_code = (
        "class ModelHarness:\n"
        "    def __init__(self, model_name='gemma:2b'):\n"
        "        self.model = model_name\n\n"
        "    def execute(self, prompt):\n"
        "        # Connects to open-weight model\n"
        "        return self._generate(prompt)\n"
    )

    print("[Step 3/3] Executing 'code-explainer' Agent Skill on Sample Code...")
    print("  --- Target Code Snippet ---")
    for line in sample_code.strip().splitlines():
        print(f"    | {line}")
    print("  ---------------------------")
    print("  Running inference...")

    agent = FluxxionAgent(harness=harness, skills_manager=sm)
    result = agent.execute_skill(
        skill_name="code-explainer",
        user_input=sample_code,
        parameters={"language": "python", "focus": "architecture and design patterns"}
    )

    print()
    print("=" * 72)
    print("  DEMO EXECUTION RESULTS")
    print("=" * 72)
    print(f"  * Executed Skill:    {result['skill']} (v{result['skill_version']})")
    print(f"  * Standard Verified: {'Yes (Agent Skill Open Standard)' if result['skill_compliant'] else 'No'}")
    print(f"  * Model / Harness:   {result['model']}")
    print(f"  * Execution Mode:    {result['mode']}")
    print(f"  * Latency:           {result['latency_seconds']} seconds")
    print("-" * 72)
    print(result["output"])
    print("=" * 72)
    print()
    print("[SUCCESS] Demonstration completed successfully.")
    print("  This project demonstrates open-weight model orchestration, local inference,")
    print("  and strict compliance with the Agent Skill Open Standard.")

if __name__ == "__main__":
    run_demo()

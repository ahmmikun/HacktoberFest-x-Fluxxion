#!/usr/bin/env python3
"""
HacktoberFest-x-Fluxxion: Main CLI Interface
Official Open-Source AI Project Submission for MLH Hack Day Lahore x Fluxxion 2026.
"""

import sys
import argparse
from src.skills_manager import SkillsManager
from src.harness import ModelHarness
from src.agent import FluxxionAgent

def print_banner():
    banner = (
        "  ___ _              _               _   ___\n"
        " | __| |_  ___ _____(_)___ _ _      /_\\ |_ _|\n"
        " | _|| | || \\ \\ / _ \\ / _ \\ ' \\    / _ \\ | | \n"
        " |_| |_|\\_,_/\\_\\___/_\\___/_||_|  /_/ \\_\\___|\n"
        "  Open-Source AI Agent Harness & Skills Engine"
    )
    print(banner)

def main():
    parser = argparse.ArgumentParser(description="HacktoberFest-x-Fluxxion AI Agent Engine")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # Command: demo
    subparsers.add_parser("demo", help="Run automated turnkey demonstration")

    # Command: skills
    subparsers.add_parser("skills", help="List discovered Agent Skills and check compliance")

    # Command: run
    run_parser = subparsers.add_parser("run", help="Execute an Agent Skill on custom input")
    run_parser.add_argument("--skill", default="code-explainer", help="Name of skill to run")
    run_parser.add_argument("--input", required=True, help="Input prompt or code snippet")
    run_parser.add_argument("--model", default="gemma:2b", help="Target open-weight model")

    # Command: health
    subparsers.add_parser("health", help="Check local Ollama / open-weight inference health")

    args = parser.parse_args()

    if not args.command or args.command == "demo":
        from demo import run_demo
        run_demo()
        return

    print_banner()

    if args.command == "skills":
        sm = SkillsManager()
        skills = sm.list_skills()
        print(f"\nDiscovered {len(skills)} Agent Skill(s):")
        print("-" * 65)
        for s in skills:
            status = "[COMPLIANT]" if s.is_compliant() else "[NON-COMPLIANT]"
            print(f"* Name:        {s.name} (v{s.version})")
            print(f"  Description: {s.description}")
            print(f"  Standard:    {s.metadata.get('standard', 'Unknown')} {status}")
            print(f"  File Path:   {s.path}\n")

    elif args.command == "health":
        harness = ModelHarness()
        print(f"Checking inference endpoint: {harness.base_url}")
        healthy = harness.check_health()
        if healthy:
            print("[ONLINE] Local open-weight inference engine (Ollama) is available.")
        else:
            print("[OFFLINE] Local inference engine not detected. System will use deterministic offline demo engine.")

    elif args.command == "run":
        agent = FluxxionAgent(harness=ModelHarness(model_name=args.model))
        print(f"Executing skill '{args.skill}' with model '{args.model}'...")
        res = agent.execute_skill(args.skill, args.input)
        print("\n" + "=" * 60)
        print(f"Skill: {res['skill']} | Mode: {res['mode']} | Latency: {res['latency_seconds']}s")
        print("=" * 60)
        print(res["output"])
        print("=" * 60)

if __name__ == "__main__":
    main()

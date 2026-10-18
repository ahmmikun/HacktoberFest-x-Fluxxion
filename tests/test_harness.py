import unittest
from pathlib import Path
from src.skills_manager import SkillsManager, AgentSkill
from src.harness import ModelHarness
from src.agent import FluxxionAgent

class TestSkillsManager(unittest.TestCase):
    def setUp(self):
        self.sm = SkillsManager()

    def test_skills_discovery(self):
        skills = self.sm.list_skills()
        self.assertGreaterEqual(len(skills), 1)

    def test_code_explainer_compliance(self):
        skill = self.sm.get_skill("code-explainer")
        self.assertIsNotNone(skill)
        self.assertEqual(skill.name, "code-explainer")
        self.assertEqual(skill.version, "1.0.0")
        self.assertTrue(skill.is_compliant())
        self.assertEqual(skill.metadata.get("standard"), "Agent Skill Open Standard")

class TestModelHarness(unittest.TestCase):
    def setUp(self):
        self.harness = ModelHarness(offline_fallback=True)

    def test_offline_generation(self):
        res = self.harness.generate("Analyze def hello(): return 'world'")
        self.assertIn("text", res)
        self.assertIn("model", res)
        self.assertIn("latency_seconds", res)
        self.assertEqual(res["mode"], "offline_demo")

class TestFluxxionAgent(unittest.TestCase):
    def setUp(self):
        self.agent = FluxxionAgent()

    def test_execute_skill(self):
        res = self.agent.execute_skill(
            skill_name="code-explainer",
            user_input="def calculate_total(items): return sum(items)"
        )
        self.assertEqual(res["skill"], "code-explainer")
        self.assertTrue(res["skill_compliant"])
        self.assertIn("output", res)
        self.assertGreater(len(res["output"]), 20)

if __name__ == "__main__":
    unittest.main()

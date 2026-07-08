import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.orchestrator import compute_weighted_score


def test_empty_set_scores_full():
    assert compute_weighted_score([]) == 100.0


def test_all_compliant_scores_full():
    assert compute_weighted_score([("critical", "compliant"), ("low", "compliant")]) == 100.0


def test_all_non_compliant_scores_zero():
    assert compute_weighted_score([("critical", "non_compliant"), ("high", "non_compliant")]) == 0.0


def test_partial_counts_half():
    assert compute_weighted_score([("medium", "partial")]) == 50.0


def test_severity_is_weighted():
    # One critical (weight 4) non_compliant + one low (weight 1) compliant.
    # weighted = 4*0.0 + 1*1.0 = 1.0 ; total_weight = 5 -> 20%
    assert compute_weighted_score([("critical", "non_compliant"), ("low", "compliant")]) == 20.0
    # Flip severities: low non_compliant + critical compliant -> 4/5 = 80%
    assert compute_weighted_score([("low", "non_compliant"), ("critical", "compliant")]) == 80.0


def test_unknown_severity_defaults_to_medium_weight():
    # Unknown severity -> weight 2, non_compliant -> 0 ; plus a low compliant (weight 1)
    # total_weight = 3, weighted = 1.0 -> 33.33%
    assert round(compute_weighted_score([("bogus", "non_compliant"), ("low", "compliant")]), 2) == 33.33

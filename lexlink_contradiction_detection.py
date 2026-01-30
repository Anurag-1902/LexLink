# =========================================================
# LexLink AI Module: Contradiction Detection using NLI
# =========================================================

from transformers import pipeline


# ---------------------------------------------------------
# Load NLI Model
# ---------------------------------------------------------
def load_nli_model():
    """
    Loads a pretrained transformer model for contradiction detection.
    """
    nli_pipeline = pipeline(
        "text-classification",
        model="roberta-large-mnli"
    )
    return nli_pipeline


# ---------------------------------------------------------
# Detect Relationship Between Two Cases
# ---------------------------------------------------------
def detect_contradiction(nli_model, case_text_1, case_text_2):
    """
    Determines whether two legal cases are consistent, contradictory, or neutral.

    Returns:
        label, confidence score
    """
    result = nli_model({
        "text": case_text_1,
        "text_pair": case_text_2
    })[0]

    label = result["label"]
    score = round(result["score"], 3)

    return label, score


# ---------------------------------------------------------
# Example Usage
# ---------------------------------------------------------
def main():
    nli_model = load_nli_model()

    case_a = "The court held that termination without notice violates employment law."
    case_b = "The court ruled that termination without notice is legally permissible."

    label, score = detect_contradiction(nli_model, case_a, case_b)

    print("Relationship:", label)
    print("Confidence:", score)


# ---------------------------------------------------------
# Run Program
# ---------------------------------------------------------
if __name__ == "__main__":
    main()

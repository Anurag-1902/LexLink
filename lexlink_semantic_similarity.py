# =========================================================
# LexLink AI Module: Semantic Similarity using Sentence-BERT
# =========================================================

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


# ---------------------------------------------------------
# Load Pretrained AI Model
# ---------------------------------------------------------
def load_model():
    """
    Loads a lightweight transformer-based sentence embedding model.
    """
    model = SentenceTransformer("all-MiniLM-L6-v2")
    return model


# ---------------------------------------------------------
# Encode Legal Case Texts
# ---------------------------------------------------------
def encode_cases(model, case_texts):
    """
    Converts legal case text into dense semantic embeddings.

    Args:
        model: SentenceTransformer model
        case_texts: List of strings (legal cases)

    Returns:
        NumPy array of embeddings
    """
    embeddings = model.encode(
        case_texts,
        convert_to_tensor=False,
        show_progress_bar=True
    )
    return np.array(embeddings)


# ---------------------------------------------------------
# Compute Semantic Similarity
# ---------------------------------------------------------
def compute_similarity(embeddings):
    """
    Computes cosine similarity between all case embeddings.

    Args:
        embeddings: NumPy array of embeddings

    Returns:
        Similarity matrix
    """
    similarity_matrix = cosine_similarity(embeddings)
    return similarity_matrix


# ---------------------------------------------------------
# Find Similar Case Pairs
# ---------------------------------------------------------
def find_similar_cases(similarity_matrix, threshold=0.75):
    """
    Identifies semantically similar case pairs.

    Args:
        similarity_matrix: Cosine similarity matrix
        threshold: Similarity threshold

    Returns:
        List of (case_i, case_j, similarity_score)
    """
    similar_pairs = []
    n = similarity_matrix.shape[0]

    for i in range(n):
        for j in range(i + 1, n):
            score = similarity_matrix[i][j]
            if score >= threshold:
                similar_pairs.append((i, j, round(score, 3)))

    return similar_pairs


# ---------------------------------------------------------
# Example Dataset (Synthetic Legal Cases)
# ---------------------------------------------------------
def load_sample_cases():
    """
    Returns sample synthetic legal case texts.
    """
    cases = [
        "The employee was terminated without notice, violating the terms of the employment contract.",
        "The worker was dismissed abruptly, breaching the employment agreement.",
        "The court held that termination without notice constitutes wrongful dismissal.",
        "The accused was found guilty of criminal negligence causing bodily harm.",
        "The defendant was convicted for negligence leading to physical injury."
    ]
    return cases


# ---------------------------------------------------------
# Main Execution Pipeline
# ---------------------------------------------------------
def main():
    print("Loading AI model...")
    model = load_model()

    print("Loading legal cases...")
    case_texts = load_sample_cases()

    print("Encoding cases using Sentence-BERT...")
    embeddings = encode_cases(model, case_texts)

    print("Computing semantic similarity...")
    similarity_matrix = compute_similarity(embeddings)

    print("\nFinding semantically similar cases:\n")
    similar_cases = find_similar_cases(similarity_matrix, threshold=0.75)

    for i, j, score in similar_cases:
        print(f"CASE_{i} <--> CASE_{j} | Similarity Score = {score}")

    print("\nSemantic similarity analysis complete.")


# ---------------------------------------------------------
# Run Program
# ---------------------------------------------------------
if __name__ == "__main__":
    main()

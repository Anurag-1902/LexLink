from lexlink_neo4j_connector import Neo4jHandler

# ---------------------------------------------------------
# Neo4j Credentials
# ---------------------------------------------------------
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"   # change this


# ---------------------------------------------------------
# Sample Data
# ---------------------------------------------------------
cases = [
    ("CASE_0", "Employee terminated without notice violating contract", "Employment Law"),
    ("CASE_1", "Worker dismissed abruptly breaching employment agreement", "Employment Law"),
    ("CASE_2", "Court ruled termination without notice is lawful", "Employment Law")
]

similar_pairs = [
    ("CASE_0", "CASE_1", 0.87)
]

contradictions = [
    ("CASE_0", "CASE_2", "CONTRADICTION", 0.91)
]


# ---------------------------------------------------------
# Insert into Neo4j
# ---------------------------------------------------------
def main():
    graph = Neo4jHandler(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

    # Create case nodes
    for cid, text, domain in cases:
        graph.create_case_node(cid, text, domain)

    # Add similarity edges
    for c1, c2, score in similar_pairs:
        graph.create_similarity_edge(c1, c2, score)

    # Add contradiction edges
    for c1, c2, label, conf in contradictions:
        graph.create_relationship(c1, c2, label, conf)

    graph.close()
    print("Neo4j graph updated successfully!")


if __name__ == "__main__":
    main()

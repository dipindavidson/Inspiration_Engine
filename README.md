# Inspiration Engine

A highly available, decoupled microservices application deployed on AWS EKS (Elastic Kubernetes Service). The project features an isolated frontend and backend layer, communicating via internal Kubernetes networking, with robust error propagation for downstream LLM rate limits.

<p align="center">
  <video src="https://github.com/user-attachments/assets/7d16a60c-9afd-4385-bb0c-6ffc817af72f" width="100%" controls autoplay muted loop>
    Your browser does not support the video tag.
  </video>
</p>

## Architecture & Design Decisions

- **Decoupled Topology:** The `frontend` and `backend` are structured as entirely distinct containerized services to allow independent scaling, localized deployment cycles, and clean boundary separation.
- **Immutable Image Tagging:** Avoids the operational risks of the `:latest` image tag. Production deployment manifests are explicitly locked to immutable semantic versions (`v2`) pushed to AWS ECR.
- **Resilient Error Propagation:** The backend implements structural parsing to intercept downstream Gemini API `503` (High Demand) status codes and gracefully propagates the native error payload down to the frontend UI instead of failing silently with a generic `500`.

## Repository Structure

```text
C:\Inspiration_Engine\
├── backend/          # Node.js engine integrating Gemini SDK & Dockerfile
├── frontend/         # Static client application & optimization Dockerfile
└── k8s/eks           # Target EKS infrastructure deployment & service manifests

